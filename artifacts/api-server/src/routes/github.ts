import { Router } from "express";
import { db, projectsTable, deploymentsTable, logEntriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { DetectFrameworkBody, ImportFromGithubBody } from "@workspace/api-zod";

const router = Router();

const FRAMEWORK_PATTERNS: Record<string, { framework: string; language: string; packageManager: string; buildCommand: string; outputDir: string; files: string[] }> = {
  next: { framework: "Next.js", language: "TypeScript", packageManager: "npm", buildCommand: "npm run build", outputDir: ".next", files: ["next.config.js", "next.config.ts"] },
  nuxt: { framework: "Nuxt", language: "TypeScript", packageManager: "npm", buildCommand: "nuxt build", outputDir: ".nuxt", files: ["nuxt.config.js", "nuxt.config.ts"] },
  astro: { framework: "Astro", language: "TypeScript", packageManager: "npm", buildCommand: "astro build", outputDir: "dist", files: ["astro.config.mjs", "astro.config.ts"] },
  svelte: { framework: "SvelteKit", language: "TypeScript", packageManager: "npm", buildCommand: "vite build", outputDir: "build", files: ["svelte.config.js"] },
  vite: { framework: "React (Vite)", language: "TypeScript", packageManager: "npm", buildCommand: "vite build", outputDir: "dist", files: ["vite.config.js", "vite.config.ts"] },
  react: { framework: "Create React App", language: "JavaScript", packageManager: "npm", buildCommand: "npm run build", outputDir: "build", files: ["react-scripts"] },
  angular: { framework: "Angular", language: "TypeScript", packageManager: "npm", buildCommand: "ng build", outputDir: "dist", files: ["angular.json"] },
  vue: { framework: "Vue", language: "TypeScript", packageManager: "npm", buildCommand: "vite build", outputDir: "dist", files: ["vue.config.js"] },
  express: { framework: "Express", language: "JavaScript", packageManager: "npm", buildCommand: "npm start", outputDir: ".", files: ["express"] },
  fastapi: { framework: "FastAPI", language: "Python", packageManager: "pip", buildCommand: "uvicorn main:app", outputDir: ".", files: ["requirements.txt", "main.py"] },
  flask: { framework: "Flask", language: "Python", packageManager: "pip", buildCommand: "flask run", outputDir: ".", files: ["requirements.txt", "app.py"] },
};

function detectFramework(repoUrl: string) {
  const lower = repoUrl.toLowerCase();
  for (const [key, info] of Object.entries(FRAMEWORK_PATTERNS)) {
    if (lower.includes(key)) return { ...info, detectedFiles: info.files };
  }
  // Default to static/React Vite
  return {
    framework: "React (Vite)",
    language: "TypeScript",
    packageManager: "npm",
    buildCommand: "vite build",
    outputDir: "dist",
    detectedFiles: ["package.json"],
  };
}

// Detect framework
router.post("/github/detect", async (req, res) => {
  const { repoUrl } = DetectFrameworkBody.parse(req.body);
  const detected = detectFramework(repoUrl);
  res.json({ repoUrl, ...detected });
});

// Import from GitHub
router.post("/github/import", async (req, res) => {
  const body = ImportFromGithubBody.parse(req.body);
  const detected = detectFramework(body.repoUrl);

  // Extract project name from URL
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

  simulateBuild(deployment.id, project.id);

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
    await sleep(600 + Math.random() * 800);
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
