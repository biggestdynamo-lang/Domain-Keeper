import { Router } from "express";
import { db, projectsTable, deploymentsTable, logEntriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { DetectFrameworkBody, ImportFromGithubBody } from "@workspace/api-zod";

const router = Router();

// True when running inside a serverless function (Netlify, AWS Lambda, etc.)
// In serverless mode, we can't fire-and-forget because the process is frozen
// after the response is sent, so the simulation must finish before we respond.
const IS_SERVERLESS = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

const FRAMEWORK_PATTERNS: Array<{
  key: string;
  depMatch: RegExp;
  framework: string;
  language: string;
  packageManager: string;
  buildCommand: string;
  outputDir: string;
  files: string[];
}> = [
  { key: "next", depMatch: /\bnext\b/, framework: "Next.js", language: "TypeScript", packageManager: "npm", buildCommand: "npm run build", outputDir: ".next", files: ["next.config.js", "next.config.ts"] },
  { key: "nuxt", depMatch: /\bnuxt\b/, framework: "Nuxt", language: "TypeScript", packageManager: "npm", buildCommand: "nuxt build", outputDir: ".nuxt", files: ["nuxt.config.js", "nuxt.config.ts"] },
  { key: "astro", depMatch: /\bastro\b/, framework: "Astro", language: "TypeScript", packageManager: "npm", buildCommand: "astro build", outputDir: "dist", files: ["astro.config.mjs", "astro.config.ts"] },
  { key: "svelte", depMatch: /\b@sveltejs\/kit\b/, framework: "SvelteKit", language: "TypeScript", packageManager: "npm", buildCommand: "vite build", outputDir: "build", files: ["svelte.config.js"] },
  { key: "angular", depMatch: /\b@angular\/core\b/, framework: "Angular", language: "TypeScript", packageManager: "npm", buildCommand: "ng build", outputDir: "dist", files: ["angular.json"] },
  { key: "vue", depMatch: /\bvue\b/, framework: "Vue", language: "TypeScript", packageManager: "npm", buildCommand: "vite build", outputDir: "dist", files: ["vue.config.js"] },
  { key: "vite", depMatch: /\bvite\b/, framework: "React (Vite)", language: "TypeScript", packageManager: "npm", buildCommand: "vite build", outputDir: "dist", files: ["vite.config.js", "vite.config.ts"] },
  { key: "react", depMatch: /\breact\b/, framework: "Create React App", language: "JavaScript", packageManager: "npm", buildCommand: "npm run build", outputDir: "build", files: ["react-scripts"] },
  { key: "express", depMatch: /\bexpress\b/, framework: "Express", language: "JavaScript", packageManager: "npm", buildCommand: "npm start", outputDir: ".", files: ["express"] },
  { key: "fastapi", depMatch: /fastapi/, framework: "FastAPI", language: "Python", packageManager: "pip", buildCommand: "uvicorn main:app", outputDir: ".", files: ["requirements.txt", "main.py"] },
  { key: "flask", depMatch: /flask/, framework: "Flask", language: "Python", packageManager: "pip", buildCommand: "flask run", outputDir: ".", files: ["requirements.txt", "app.py"] },
];

const DEFAULT_FRAMEWORK = {
  framework: "React (Vite)",
  language: "TypeScript",
  packageManager: "npm",
  buildCommand: "vite build",
  outputDir: "dist",
  detectedFiles: ["package.json"],
};

function parseGithubUrl(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(repoUrl.trim());
    const parts = url.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
  } catch {}
  return null;
}

async function fetchPackageJson(owner: string, repo: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
      { headers: { Accept: "application/vnd.github.v3.raw", "User-Agent": "freeable-domains/1.0" } }
    );
    if (!res.ok) return null;
    return await res.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function detectFramework(repoUrl: string) {
  const parsed = parseGithubUrl(repoUrl);
  if (parsed) {
    const pkg = await fetchPackageJson(parsed.owner, parsed.repo);
    if (pkg) {
      const allDeps = Object.keys({
        ...((pkg.dependencies as Record<string, string>) ?? {}),
        ...((pkg.devDependencies as Record<string, string>) ?? {}),
        ...((pkg.peerDependencies as Record<string, string>) ?? {}),
      }).join(" ");

      for (const p of FRAMEWORK_PATTERNS) {
        if (p.depMatch.test(allDeps)) {
          return { framework: p.framework, language: p.language, packageManager: p.packageManager, buildCommand: p.buildCommand, outputDir: p.outputDir, detectedFiles: p.files };
        }
      }
    }
  }

  return DEFAULT_FRAMEWORK;
}

// Detect framework
router.post("/github/detect", async (req, res) => {
  const { repoUrl } = DetectFrameworkBody.parse(req.body);
  const detected = await detectFramework(repoUrl);
  res.json({ repoUrl, ...detected });
});

// Import from GitHub
router.post("/github/import", async (req, res) => {
  const body = ImportFromGithubBody.parse(req.body);
  const detected = await detectFramework(body.repoUrl);

  const namePart = body.name ?? body.repoUrl.split("/").pop()?.replace(/\.git$/, "") ?? "imported-project";

  const [project] = await db.insert(projectsTable).values({
    name: namePart,
    repoUrl: body.repoUrl,
    branch: body.branch ?? "main",
    framework: detected.framework,
    packageManager: detected.packageManager,
    buildCommand: detected.buildCommand,
    outputDir: detected.outputDir,
    status: "building",
    sessionId: body.sessionId ?? null,
  }).returning();

  const [deployment] = await db.insert(deploymentsTable).values({
    projectId: project.id,
    branch: project.branch,
    commitSha: Math.random().toString(36).slice(2, 9),
    commitMessage: "Initial import from GitHub",
    triggeredBy: "api",
    isProduction: true,
    status: "queued",
  }).returning();

  // In serverless, await the simulation before responding so it completes
  if (IS_SERVERLESS) {
    await simulateBuild(deployment.id, project.id);
  } else {
    simulateBuild(deployment.id, project.id);
  }

  res.status(201).json({
    project,
    deployment: { ...deployment, projectName: project.name },
    detectedFramework: detected.framework,
  });
});

async function simulateBuild(deploymentId: number, projectId: number) {
  const stages: Array<{ stage: "clone" | "install" | "build" | "deploy" | "verify"; msgs: string[]; status: string }> = [
    { stage: "clone", msgs: ["Cloning repository...", "Repository cloned successfully"], status: "cloning" },
    { stage: "install", msgs: ["Installing dependencies...", "Packages installed"], status: "installing" },
    { stage: "build", msgs: ["Running build command...", "Build successful"], status: "building" },
    { stage: "deploy", msgs: ["Uploading artifacts...", "Configuring edge network..."], status: "deploying" },
    { stage: "verify", msgs: ["Health check passed", "Deployment verified"], status: "ready" },
  ];

  for (const s of stages) {
    if (!IS_SERVERLESS) await sleep(600 + Math.random() * 800);
    await db.update(deploymentsTable).set({ status: s.status }).where(eq(deploymentsTable.id, deploymentId));
    for (const msg of s.msgs) {
      await db.insert(logEntriesTable).values({ deploymentId, level: "info", stage: s.stage, message: msg });
    }
  }

  const url = `https://deployment-${deploymentId}.freeable.live`;
  await db.update(deploymentsTable).set({
    status: "ready",
    url,
    buildDurationSeconds: 15 + Math.random() * 30,
    completedAt: new Date(),
  }).where(eq(deploymentsTable.id, deploymentId));

  await db.update(projectsTable).set({ status: "active", deploymentUrl: url }).where(eq(projectsTable.id, projectId));
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export default router;
