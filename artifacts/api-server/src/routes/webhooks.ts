import { Router } from "express";
import { db, projectsTable, webhookEventsTable, deploymentsTable, logEntriesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { GetProjectWebhookParams, TriggerGithubWebhookParams } from "@workspace/api-zod";

const router = Router();

// Get webhook info + recent events for a project (auto-generates token if missing)
router.get("/projects/:id/webhook", async (req, res) => {
  const { id } = GetProjectWebhookParams.parse({ id: Number(req.params.id) });

  let [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  if (!project.webhookToken) {
    const token = randomBytes(16).toString("hex");
    [project] = await db
      .update(projectsTable)
      .set({ webhookToken: token })
      .where(eq(projectsTable.id, id))
      .returning();
  }

  const events = await db
    .select()
    .from(webhookEventsTable)
    .where(eq(webhookEventsTable.projectId, id))
    .orderBy(desc(webhookEventsTable.receivedAt))
    .limit(10);

  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "localhost";
  const proto = req.get("x-forwarded-proto") ?? "https";
  const webhookUrl = `${proto}://${host}/api/webhooks/github/${project.webhookToken}`;

  res.json({ token: project.webhookToken, webhookUrl, events });
});

// Simulate a GitHub push webhook
router.post("/webhooks/github/:token", async (req, res) => {
  const { token } = TriggerGithubWebhookParams.parse({ token: req.params.token });

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.webhookToken, token));

  if (!project) { res.status(404).json({ error: "No project found for this webhook token" }); return; }

  const body = req.body ?? {};
  const ref: string = body.ref ?? "refs/heads/main";
  const headCommit = body.head_commit ?? {};
  const commitSha: string = headCommit.id ?? randomBytes(20).toString("hex");
  const commitMessage: string = headCommit.message ?? "Push event";
  const pusher: string = body.pusher?.name ?? "github-actions";

  const [deployment] = await db
    .insert(deploymentsTable)
    .values({
      projectId: project.id,
      branch: ref.replace("refs/heads/", ""),
      commitSha,
      commitMessage,
      triggeredBy: "webhook",
      isProduction: ref === "refs/heads/main" || ref === "refs/heads/master",
      status: "queued",
    })
    .returning();

  const [event] = await db
    .insert(webhookEventsTable)
    .values({ projectId: project.id, ref, commitSha, commitMessage, pusher, deploymentId: deployment.id })
    .returning();

  simulateBuild(deployment.id, project.id);

  res.json({ received: true, event, deploymentId: deployment.id });
});

async function simulateBuild(deploymentId: number, projectId: number) {
  const stages: Array<{ stage: string; messages: string[] }> = [
    { stage: "clone", messages: ["Cloning repository...", "Repository cloned successfully"] },
    { stage: "install", messages: ["Installing dependencies...", "npm install completed (1.2s)", "Dependencies installed"] },
    { stage: "build", messages: ["Running build command...", "vite build", "Compiling TypeScript...", "Build completed in 12.4s"] },
    { stage: "deploy", messages: ["Creating deployment container...", "Uploading artifacts...", "Configuring edge network..."] },
    { stage: "verify", messages: ["Running health checks...", "Health check passed", "Deployment verified"] },
  ];
  const statuses = ["cloning", "installing", "building", "deploying", "ready"] as const;

  for (let i = 0; i < stages.length; i++) {
    await sleep(500 + Math.random() * 800);
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

  const url = `https://deployment-${deploymentId}.freeable.live`;
  await db.update(deploymentsTable).set({
    status: "ready",
    url,
    buildDurationSeconds: 20 + Math.random() * 20,
    completedAt: new Date(),
  }).where(eq(deploymentsTable.id, deploymentId));
  await db.update(projectsTable).set({ status: "active", deploymentUrl: url }).where(eq(projectsTable.id, projectId));
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default router;
