import { Router } from "express";
import { db, projectsTable, deploymentsTable, domainsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { GetAnalyticsSummaryQueryParams } from "@workspace/api-zod";

const router = Router();

// Dashboard summary
router.get("/dashboard/summary", async (req, res) => {
  const [projectCount] = await db.select({ count: count() }).from(projectsTable);
  const [domainCount] = await db.select({ count: count() }).from(domainsTable);

  const allDeployments = await db
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
    .orderBy(desc(deploymentsTable.createdAt));

  const activeDeployments = allDeployments.filter(d =>
    ["queued", "cloning", "installing", "building", "deploying"].includes(d.status)
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deploymentsToday = allDeployments.filter(d => new Date(d.createdAt) >= today).length;

  const completed = allDeployments.filter(d => ["ready", "failed"].includes(d.status));
  const successRate = completed.length > 0
    ? completed.filter(d => d.status === "ready").length / completed.length
    : 1;

  const recentProjects = await db.select().from(projectsTable).orderBy(desc(projectsTable.createdAt)).limit(5);

  res.json({
    totalProjects: Number(projectCount?.count ?? 0),
    activeDeployments,
    registeredDomains: Number(domainCount?.count ?? 0),
    totalBandwidthGb: parseFloat((Math.random() * 50 + 10).toFixed(2)),
    deploymentsToday,
    successRate: parseFloat(successRate.toFixed(3)),
    recentProjects,
    recentDeployments: allDeployments.slice(0, 8),
  });
});

// Analytics summary
router.get("/analytics/summary", async (req, res) => {
  const { period } = GetAnalyticsSummaryQueryParams.parse(req.query);

  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

  const timeSeries = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return {
      date: date.toISOString().split("T")[0],
      requests: Math.floor(Math.random() * 10000 + 500),
      bandwidthGb: parseFloat((Math.random() * 3 + 0.1).toFixed(3)),
      deployments: Math.floor(Math.random() * 5),
    };
  });

  const projects = await db.select().from(projectsTable).limit(5);
  const topProjects = projects.map(p => ({
    projectId: p.id,
    projectName: p.name,
    requests: Math.floor(Math.random() * 50000 + 1000),
    bandwidthGb: parseFloat((Math.random() * 10 + 0.5).toFixed(2)),
  }));

  res.json({
    period: period ?? "30d",
    totalRequests: timeSeries.reduce((s, p) => s + p.requests, 0),
    totalBandwidthGb: parseFloat(timeSeries.reduce((s, p) => s + p.bandwidthGb, 0).toFixed(2)),
    uniqueVisitors: Math.floor(Math.random() * 15000 + 2000),
    avgBuildTimeSeconds: parseFloat((Math.random() * 20 + 8).toFixed(1)),
    errorRate: parseFloat((Math.random() * 0.05).toFixed(4)),
    timeSeries,
    topProjects,
  });
});

// Infrastructure status
router.get("/infrastructure/status", async (req, res) => {
  const [projectCount] = await db.select({ count: count() }).from(projectsTable);
  const [domainCount] = await db.select({ count: count() }).from(domainsTable);
  const [deploymentCount] = await db.select({ count: count() }).from(deploymentsTable);

  const regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-northeast-1", "ap-southeast-1"];
  const servers = regions.map((region, i) => ({
    id: `srv-${(i + 1).toString().padStart(3, "0")}`,
    region,
    status: Math.random() > 0.1 ? "healthy" : "degraded",
    cpuPercent: parseFloat((Math.random() * 60 + 10).toFixed(1)),
    memoryPercent: parseFloat((Math.random() * 50 + 20).toFixed(1)),
    containers: Math.floor(Math.random() * 50 + 5),
    uptime: `${Math.floor(Math.random() * 30 + 1)}d ${Math.floor(Math.random() * 24)}h`,
  }));

  const totalContainers = servers.reduce((s, srv) => s + srv.containers, 0);

  res.json({
    servers,
    totalContainers,
    runningContainers: Math.floor(totalContainers * 0.9),
    totalDomains: Number(domainCount?.count ?? 0),
    totalDeployments: Number(deploymentCount?.count ?? 0),
    storageUsedGb: parseFloat((Math.random() * 200 + 50).toFixed(1)),
    storageTotalGb: 500,
    bandwidthUsedGb: parseFloat((Math.random() * 100 + 20).toFixed(1)),
    cpuUsagePercent: parseFloat((Math.random() * 40 + 15).toFixed(1)),
    memoryUsagePercent: parseFloat((Math.random() * 40 + 30).toFixed(1)),
  });
});

export default router;
