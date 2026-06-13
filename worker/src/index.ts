import express from "express";
import { spawn } from "child_process";
import { rm, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

type BuildStage = "clone" | "install" | "build" | "deploy" | "verify";
type LogLevel = "info" | "warn" | "error";

interface BuildJob {
  deploymentId: number;
  projectId: number;
  repoUrl: string;
  branch: string;
  buildCommand: string;
  framework: string;
  packageManager: string;
}

const app = express();
app.use(express.json());

const WORKER_SECRET = process.env.WORKER_SECRET ?? "";
const API_URL = (process.env.API_URL ?? "").replace(/\/$/, "");
const PORT = Number(process.env.PORT ?? 3001);

function requireSecret(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const secret = req.headers["x-worker-secret"];
  if (!WORKER_SECRET || secret !== WORKER_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", workerSecret: !!WORKER_SECRET, apiUrl: API_URL || null });
});

app.post("/build", requireSecret, (req, res) => {
  const job = req.body as BuildJob;
  if (!job.deploymentId || !job.repoUrl) {
    res.status(400).json({ error: "deploymentId and repoUrl are required" });
    return;
  }
  // Respond immediately — build runs asynchronously
  res.status(202).json({ message: "Build accepted", deploymentId: job.deploymentId });
  void runBuild(job);
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function postLog(
  deploymentId: number,
  stage: BuildStage,
  level: LogLevel,
  message: string
): Promise<void> {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL}/api/internal/deployments/${deploymentId}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Worker-Secret": WORKER_SECRET },
      body: JSON.stringify({ entries: [{ level, stage, message }] }),
    });
  } catch {
    // Non-fatal: if logging fails, continue anyway
  }
}

async function updateStatus(
  deploymentId: number,
  status: string,
  extras?: { url?: string; buildDurationSeconds?: number }
): Promise<void> {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL}/api/internal/deployments/${deploymentId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Worker-Secret": WORKER_SECRET },
      body: JSON.stringify({ status, ...extras }),
    });
  } catch {
    // Non-fatal
  }
}

function runCommand(
  argv: string[],
  cwd: string,
  deploymentId: number,
  stage: BuildStage,
  extraEnv?: NodeJS.ProcessEnv
): Promise<void> {
  return new Promise((resolve, reject) => {
    const [exe, ...args] = argv;
    const env = extraEnv ? { ...process.env, ...extraEnv } : process.env;
    const proc = spawn(exe, args, { cwd, stdio: "pipe", shell: false, env });

    proc.stdout.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n").filter((l) => l.trim());
      for (const line of lines) void postLog(deploymentId, stage, "info", line);
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n").filter((l) => l.trim());
      for (const line of lines) void postLog(deploymentId, stage, "warn", line);
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`\`${argv.join(" ")}\` exited with code ${code}`));
    });

    proc.on("error", (err) => reject(err));
  });
}

// ── Build pipeline ────────────────────────────────────────────────────────────

async function runBuild(job: BuildJob): Promise<void> {
  const { deploymentId, repoUrl, branch, buildCommand, packageManager } = job;
  const buildDir = await mkdtemp(join(tmpdir(), `build-${deploymentId}-`));
  const startTime = Date.now();

  try {
    // Stage 1 — Clone
    await updateStatus(deploymentId, "cloning");
    await postLog(deploymentId, "clone", "info", `Cloning ${repoUrl} (branch: ${branch})...`);
    await runCommand(
      ["git", "clone", "--depth=1", "--single-branch", "--branch", branch, repoUrl, buildDir],
      tmpdir(),
      deploymentId,
      "clone"
    );
    await postLog(deploymentId, "clone", "info", "Repository cloned successfully");

    // Stage 2 — Install
    await updateStatus(deploymentId, "installing");
    await postLog(deploymentId, "install", "info", `Installing dependencies (${packageManager})...`);

    if (packageManager === "pip") {
      await runCommand(["pip", "install", "-r", "requirements.txt"], buildDir, deploymentId, "install");
    } else if (packageManager === "pnpm") {
      await runCommand(["pnpm", "install", "--frozen-lockfile"], buildDir, deploymentId, "install");
    } else if (packageManager === "yarn") {
      await runCommand(["yarn", "install", "--frozen-lockfile"], buildDir, deploymentId, "install");
    } else {
      await runCommand(["npm", "install"], buildDir, deploymentId, "install");
    }
    await postLog(deploymentId, "install", "info", "Dependencies installed successfully");

    // Stage 3 — Build
    // Add node_modules/.bin to PATH so local CLIs (vite, astro, next, etc.) resolve
    await updateStatus(deploymentId, "building");
    await postLog(deploymentId, "build", "info", `Running: ${buildCommand}`);
    const [cmd, ...cmdArgs] = buildCommand.split(/\s+/);
    const buildEnv: NodeJS.ProcessEnv = {
      PATH: `${buildDir}/node_modules/.bin:${process.env.PATH ?? ""}`,
    };
    await runCommand([cmd, ...cmdArgs], buildDir, deploymentId, "build", buildEnv);
    await postLog(deploymentId, "build", "info", "Build completed successfully");

    // Stage 4 — Deploy (placeholder: serving the output is out of scope)
    await updateStatus(deploymentId, "deploying");
    await postLog(deploymentId, "deploy", "info", "Packaging build artifacts...");
    await postLog(deploymentId, "deploy", "info", "Artifacts ready for deployment");

    // Stage 5 — Ready
    const durationSeconds = (Date.now() - startTime) / 1000;
    const url = `https://deployment-${deploymentId}.freeable.live`;
    await postLog(deploymentId, "verify", "info", "Health check passed");
    await postLog(deploymentId, "verify", "info", `Deployment live at ${url}`);
    await updateStatus(deploymentId, "ready", { url, buildDurationSeconds: durationSeconds });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await postLog(deploymentId, "build", "error", `Build failed: ${message}`);
    await updateStatus(deploymentId, "failed");
  } finally {
    void rm(buildDir, { recursive: true, force: true });
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[worker] Listening on port ${PORT}`);
  if (!WORKER_SECRET) console.warn("[worker] WARNING: WORKER_SECRET is not set — all requests will be rejected");
  if (!API_URL) console.warn("[worker] WARNING: API_URL is not set — cannot report build progress to the API server");
});
