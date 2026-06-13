import { Router } from "express";
import { db, deploymentsTable, projectsTable, logEntriesTable } from "@workspace/db";
import { eq, desc, gt, and } from "drizzle-orm";
import { logActivity } from "../lib/activity";
import {
  CreateDeploymentParams,
  CreateDeploymentBody,
  GetDeploymentParams,
  ListDeploymentsParams,
  RollbackDeploymentParams,
  GetDeploymentLogsParams,
} from "@workspace/api-zod";

const router = Router();

// List deployments for a project
router.get("/projects/:id/deployments", async (req, res) => {
  const { id } = ListDeploymentsParams.parse({ id: Number(req.params.id) });
  const deployments = await db
    .select({
      id: deploymentsTable.id,
      projectId: deploymentsTable.projectId,
      projectName: projectsTable.name,
      status: deploymentsTable.status,
      url: deploymentsTable.url,
      commitSha: deploymentsTable.commitSha,
      commitMessage: deploymentsTable.commitMessage,
      branch: deploymentsTable.branch,
      buildDurationSeconds: deploymentsTable.buildDurationSeconds,
      triggeredBy: deploymentsTable.triggeredBy,
      isProduction: deploymentsTable.isProduction,
      createdAt: deploymentsTable.createdAt,
      completedAt: deploymentsTable.completedAt,
    })
    .from(deploymentsTable)
    .leftJoin(projectsTable, eq(deploymentsTable.projectId, projectsTable.id))
    .where(eq(deploymentsTable.projectId, id))
    .orderBy(desc(deploymentsTable.createdAt));
  res.json(deployments);
});

// Trigger new deployment
router.post("/projects/:id/deployments", async (req, res) => {
  const { id } = CreateDeploymentParams.parse({ id: Number(req.params.id) });
  const body = CreateDeploymentBody.parse(req.body);

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [deployment] = await db.insert(deploymentsTable).values({
    projectId: id,
    branch: body.branch ?? project.branch ?? "main",
    isProduction: body.isProduction ?? true,
    triggeredBy: "manual",
    status: "queued",
  }).returning();

  logActivity({
    projectId: id,
    type: "deployment_triggered",
    title: "Deployment triggered manually",
    detail: `Branch: ${deployment.branch}`,
    metadata: { deploymentId: deployment.id, triggeredBy: "manual" },
  });

  // Simulate async build pipeline
  simulateBuild(deployment.id, id);

  res.status(201).json({ ...deployment, projectName: project.name });
});

// Get single deployment
router.get("/deployments/:id", async (req, res) => {
  const { id } = GetDeploymentParams.parse({ id: Number(req.params.id) });
  const [deployment] = await db
    .select({
      id: deploymentsTable.id,
      projectId: deploymentsTable.projectId,
      projectName: projectsTable.name,
      status: deploymentsTable.status,
      url: deploymentsTable.url,
      commitSha: deploymentsTable.commitSha,
      commitMessage: deploymentsTable.commitMessage,
      branch: deploymentsTable.branch,
      buildDurationSeconds: deploymentsTable.buildDurationSeconds,
      triggeredBy: deploymentsTable.triggeredBy,
      isProduction: deploymentsTable.isProduction,
      createdAt: deploymentsTable.createdAt,
      completedAt: deploymentsTable.completedAt,
    })
    .from(deploymentsTable)
    .leftJoin(projectsTable, eq(deploymentsTable.projectId, projectsTable.id))
    .where(eq(deploymentsTable.id, id));

  if (!deployment) { res.status(404).json({ error: "Deployment not found" }); return; }
  res.json(deployment);
});

// Rollback to deployment
router.post("/deployments/:id/rollback", async (req, res) => {
  const { id } = RollbackDeploymentParams.parse({ id: Number(req.params.id) });
  const [orig] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, id));
  if (!orig) { res.status(404).json({ error: "Deployment not found" }); return; }

  const [newDep] = await db.insert(deploymentsTable).values({
    projectId: orig.projectId,
    branch: orig.branch,
    commitSha: orig.commitSha,
    commitMessage: `Rollback to ${orig.commitSha?.slice(0, 7) ?? "previous"}`,
    triggeredBy: "rollback",
    isProduction: true,
    status: "queued",
  }).returning();

  logActivity({
    projectId: orig.projectId,
    type: "deployment_triggered",
    title: `Rollback to deployment #${id}`,
    detail: orig.commitSha ? `Commit: ${orig.commitSha.slice(0, 7)}` : undefined,
    metadata: { deploymentId: newDep.id, rolledBackFrom: id, triggeredBy: "rollback" },
  });

  simulateBuild(newDep.id, orig.projectId);

  res.json({ ...newDep, projectName: null });
});

// Get deployment logs
router.get("/deployments/:id/logs", async (req, res) => {
  const { id } = GetDeploymentLogsParams.parse({ id: Number(req.params.id) });
  const logs = await db
    .select()
    .from(logEntriesTable)
    .where(eq(logEntriesTable.deploymentId, id))
    .orderBy(logEntriesTable.timestamp);
  res.json(logs);
});

// Stream deployment logs via SSE
router.get("/deployments/:id/logs/stream", async (req, res) => {
  const { id } = GetDeploymentLogsParams.parse({ id: Number(req.params.id) });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const TERMINAL = ["ready", "failed", "cancelled", "rolled_back"];

  function send(event: string, data: unknown) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  // Send all existing logs immediately
  const existingLogs = await db
    .select()
    .from(logEntriesTable)
    .where(eq(logEntriesTable.deploymentId, id))
    .orderBy(logEntriesTable.timestamp);

  let lastLogId = 0;
  for (const log of existingLogs) {
    send("log", log);
    lastLogId = Math.max(lastLogId, log.id);
  }

  // If deployment already finished, send final status and close
  const [dep] = await db
    .select({ status: deploymentsTable.status, url: deploymentsTable.url })
    .from(deploymentsTable)
    .where(eq(deploymentsTable.id, id));

  if (!dep) { res.end(); return; }

  if (TERMINAL.includes(dep.status)) {
    send("status", { status: dep.status, url: dep.url });
    send("done", {});
    res.end();
    return;
  }

  let lastStatus = dep.status;

  // Poll DB for new logs and status changes
  const interval = setInterval(async () => {
    try {
      const newLogs = await db
        .select()
        .from(logEntriesTable)
        .where(and(eq(logEntriesTable.deploymentId, id), gt(logEntriesTable.id, lastLogId)))
        .orderBy(logEntriesTable.timestamp);

      for (const log of newLogs) {
        send("log", log);
        lastLogId = Math.max(lastLogId, log.id);
      }

      const [current] = await db
        .select({ status: deploymentsTable.status, url: deploymentsTable.url })
        .from(deploymentsTable)
        .where(eq(deploymentsTable.id, id));

      if (current && current.status !== lastStatus) {
        lastStatus = current.status;
        send("status", { status: current.status, url: current.url });

        if (TERMINAL.includes(current.status)) {
          send("done", {});
          clearInterval(interval);
          res.end();
        }
      }
    } catch {
      clearInterval(interval);
      res.end();
    }
  }, 300);

  req.on("close", () => clearInterval(interval));
});

// Simulate build pipeline asynchronously
async function simulateBuild(deploymentId: number, projectId: number) {
  const stages: Array<{ stage: string; messages: string[] }> = [
    { stage: "clone", messages: ["Cloning repository...", "Repository cloned successfully"] },
    { stage: "install", messages: ["Installing dependencies...", "npm install completed (1.2s)", "Dependencies installed"] },
    { stage: "build", messages: ["Running build command...", "vite build", "Compiling TypeScript...", "Build completed in 12.4s"] },
    { stage: "deploy", messages: ["Creating deployment container...", "Uploading artifacts...", "Configuring edge network..."] },
    { stage: "verify", messages: ["Running health checks...", "Health check passed", "Deployment verified"] },
  ];

  const statuses: Array<typeof deploymentsTable.$inferSelect["status"]> = [
    "cloning", "installing", "building", "deploying", "ready"
  ];

  for (let i = 0; i < stages.length; i++) {
    await sleep(500 + Math.random() * 1000);
    await db.update(deploymentsTable).set({ status: statuses[i] }).where(eq(deploymentsTable.id, deploymentId));
    for (const msg of stages[i].messages) {
      await db.insert(logEntriesTable).values({
        deploymentId,
        level: "info",
        stage: stages[i].stage as "clone" | "install" | "build" | "deploy" | "verify",
        message: msg,
      });
    }
  }

  const duration = 15 + Math.random() * 30;
  // Use the app's own real domain so deployment URLs resolve in DNS
  // (same wildcard-DNS pattern real platforms use: *.vercel.app → their load balancer)
  const appDomain = (process.env.REPLIT_DOMAINS?.split(",")[0] ?? process.env.REPLIT_DEV_DOMAIN ?? "").trim();
  const url = appDomain
    ? `https://${appDomain}/preview/deployment/${deploymentId}`
    : `/preview/deployment/${deploymentId}`;
  await db.update(deploymentsTable).set({
    status: "ready",
    url,
    buildDurationSeconds: duration,
    completedAt: new Date(),
  }).where(eq(deploymentsTable.id, deploymentId));

  await db.update(projectsTable).set({ status: "active", deploymentUrl: url }).where(eq(projectsTable.id, projectId));

  logActivity({
    projectId,
    type: "deployment_ready",
    title: "Deployment ready",
    detail: `Built in ${duration.toFixed(0)}s · ${url}`,
    metadata: { deploymentId, url, buildDurationSeconds: duration },
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default router;
