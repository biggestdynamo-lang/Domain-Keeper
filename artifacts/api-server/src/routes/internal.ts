import { Router, type Request, type Response, type NextFunction } from "express";
import { db, deploymentsTable, logEntriesTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logActivity } from "../lib/activity";
import { logger } from "../lib/logger";

const router = Router();

function requireWorkerSecret(req: Request, res: Response, next: NextFunction) {
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerSecret) {
    res.status(503).json({ error: "WORKER_SECRET is not configured on this server" });
    return;
  }
  if (req.headers["x-worker-secret"] !== workerSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// POST /api/internal/deployments/:id/logs
// Body: { entries: Array<{ level?: string, stage?: string, message: string }> }
router.post("/internal/deployments/:id/logs", requireWorkerSecret, async (req, res) => {
  const id = Number(req.params.id);
  const { entries } = req.body as { entries?: unknown[] };

  if (!Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ error: "entries must be a non-empty array" });
    return;
  }

  const rows = entries.map((e: unknown) => {
    const entry = e as Record<string, unknown>;
    return {
      deploymentId: id,
      level: String(entry.level ?? "info"),
      stage: String(entry.stage ?? "build"),
      message: String(entry.message ?? ""),
    };
  });

  await db.insert(logEntriesTable).values(rows);
  res.status(204).send();
});

// POST /api/internal/deployments/:id/status
// Body: { status: string, url?: string, buildDurationSeconds?: number }
router.post("/internal/deployments/:id/status", requireWorkerSecret, async (req, res) => {
  const id = Number(req.params.id);
  const { status, url, buildDurationSeconds } = req.body as {
    status: string;
    url?: string;
    buildDurationSeconds?: number;
  };

  if (!status) {
    res.status(400).json({ error: "status is required" });
    return;
  }

  const isTerminal = ["ready", "failed", "cancelled"].includes(status);
  const updates: Record<string, unknown> = { status };
  if (url) updates.url = url;
  if (buildDurationSeconds != null) updates.buildDurationSeconds = buildDurationSeconds;
  if (isTerminal) updates.completedAt = new Date();

  const [deployment] = await db
    .update(deploymentsTable)
    .set(updates)
    .where(eq(deploymentsTable.id, id))
    .returning();

  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  if (status === "ready" && url) {
    await db
      .update(projectsTable)
      .set({ status: "active", deploymentUrl: url })
      .where(eq(projectsTable.id, deployment.projectId));

    logActivity({
      projectId: deployment.projectId,
      type: "deployment_ready",
      title: "Deployment ready",
      detail: buildDurationSeconds != null
        ? `Built in ${buildDurationSeconds.toFixed(0)}s · ${url}`
        : url,
      metadata: { deploymentId: id, url, buildDurationSeconds },
    });
  } else if (status === "failed") {
    await db
      .update(projectsTable)
      .set({ status: "error" })
      .where(eq(projectsTable.id, deployment.projectId));

    logActivity({
      projectId: deployment.projectId,
      type: "deployment_failed",
      title: "Deployment failed",
      metadata: { deploymentId: id },
    });
  }

  logger.info({ deploymentId: id, status }, "Deployment status updated by worker");
  res.status(204).send();
});

export default router;
