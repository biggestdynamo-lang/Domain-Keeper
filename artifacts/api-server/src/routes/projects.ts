import { Router } from "express";
import { db, projectsTable, deploymentsTable, domainsTable, envVarsTable, logEntriesTable } from "@workspace/db";
import { eq, desc, count, and } from "drizzle-orm";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
  GetProjectSummaryParams,
} from "@workspace/api-zod";

const router = Router();

// List all projects
router.get("/projects", async (req, res) => {
  const projects = await db.select().from(projectsTable).orderBy(desc(projectsTable.createdAt));
  res.json(projects);
});

// Create project
router.post("/projects", async (req, res) => {
  const body = CreateProjectBody.parse(req.body);
  const [project] = await db.insert(projectsTable).values(body).returning();
  res.status(201).json(project);
});

// Get single project
router.get("/projects/:id", async (req, res) => {
  const { id } = GetProjectParams.parse({ id: Number(req.params.id) });
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(project);
});

// Update project
router.patch("/projects/:id", async (req, res) => {
  const { id } = UpdateProjectParams.parse({ id: Number(req.params.id) });
  const body = UpdateProjectBody.parse(req.body);
  const [project] = await db.update(projectsTable).set(body).where(eq(projectsTable.id, id)).returning();
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(project);
});

// Delete project
router.delete("/projects/:id", async (req, res) => {
  const { id } = DeleteProjectParams.parse({ id: Number(req.params.id) });
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.status(204).send();
});

// Get project summary
router.get("/projects/:id/summary", async (req, res) => {
  const { id } = GetProjectSummaryParams.parse({ id: Number(req.params.id) });

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const deployments = await db.select().from(deploymentsTable).where(eq(deploymentsTable.projectId, id)).orderBy(desc(deploymentsTable.createdAt));
  const latestDeployment = deployments[0] ?? null;

  const successfulDeployments = deployments.filter(d => d.status === "ready").length;
  const failedDeployments = deployments.filter(d => d.status === "failed").length;

  const completedWithDuration = deployments.filter(d => d.buildDurationSeconds != null);
  const avgBuildTimeSeconds = completedWithDuration.length > 0
    ? completedWithDuration.reduce((sum, d) => sum + (d.buildDurationSeconds ?? 0), 0) / completedWithDuration.length
    : 0;

  const [domainCount] = await db.select({ count: count() }).from(domainsTable).where(eq(domainsTable.projectId, id));
  const [envVarCount] = await db.select({ count: count() }).from(envVarsTable).where(eq(envVarsTable.projectId, id));

  res.json({
    project,
    latestDeployment,
    deploymentCount: deployments.length,
    successfulDeployments,
    failedDeployments,
    avgBuildTimeSeconds,
    domainCount: Number(domainCount?.count ?? 0),
    envVarCount: Number(envVarCount?.count ?? 0),
    requestsToday: Math.floor(Math.random() * 5000) + 100,
    bandwidthTodayGb: parseFloat((Math.random() * 2).toFixed(3)),
  });
});

export default router;
