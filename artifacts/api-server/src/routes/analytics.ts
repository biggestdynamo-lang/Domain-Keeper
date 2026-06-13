import { Router } from "express";
import { db, projectsTable, deploymentsTable, domainsTable, metricsTable } from "@workspace/db";
import { eq, desc, count, gte, and, sql } from "drizzle-orm";
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

  const [totalMetrics] = await db
    .select({ total: sql<number>`COALESCE(SUM(request_count), 0)` })
    .from(metricsTable);

  const totalRequests = Number(totalMetrics?.total ?? 0);
  const bandwidthGb = parseFloat((totalRequests * 0.0003).toFixed(2));

  const recentProjects = await db.select().from(projectsTable).orderBy(desc(projectsTable.createdAt)).limit(5);

  res.json({
    totalProjects: Number(projectCount?.count ?? 0),
    activeDeployments,
    registeredDomains: Number(domainCount?.count ?? 0),
    totalBandwidthGb: bandwidthGb,
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

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const sinceDate = since.toISOString().split("T")[0];

  const deploymentRows = await db
    .select({
      date: sql<string>`TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
      deployments: count(),
    })
    .from(deploymentsTable)
    .where(gte(deploymentsTable.createdAt, since))
    .groupBy(sql`TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')`)
    .orderBy(sql`TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')`);

  const metricsRows = await db
    .select({ date: metricsTable.date, requestCount: metricsTable.requestCount })
    .from(metricsTable)
    .where(gte(metricsTable.date, sinceDate))
    .orderBy(metricsTable.date);

  const deploymentsByDate = new Map(deploymentRows.map(r => [r.date, Number(r.deployments)]));
  const requestsByDate = new Map(metricsRows.map(r => [r.date, r.requestCount]));

  const timeSeries = Array.from({ length: days }, (_, i) => {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const requests = requestsByDate.get(dateStr) ?? 0;
    return {
      date: dateStr,
      requests,
      bandwidthGb: parseFloat((requests * 0.0003).toFixed(3)),
      deployments: deploymentsByDate.get(dateStr) ?? 0,
    };
  });

  // Compute avg build time from actual timestamp deltas (completedAt - createdAt)
  // Only include rows where completed_at > created_at (guards against malformed seed data)
  const [buildStats] = await db
    .select({
      avgBuildTime: sql<number | null>`
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)))
      `,
    })
    .from(deploymentsTable)
    .where(
      and(
        eq(deploymentsTable.status, "ready"),
        gte(deploymentsTable.createdAt, since),
        sql`completed_at IS NOT NULL`,
        sql`completed_at > created_at`,
      )
    );

  const completedInPeriod = await db
    .select({ status: deploymentsTable.status })
    .from(deploymentsTable)
    .where(
      and(
        gte(deploymentsTable.createdAt, since),
        sql`status IN ('ready', 'failed')`
      )
    );

  const successCount = completedInPeriod.filter(d => d.status === "ready").length;
  const errorRate = completedInPeriod.length > 0
    ? parseFloat(((completedInPeriod.length - successCount) / completedInPeriod.length).toFixed(4))
    : 0;

  const topProjectsRaw = await db
    .select({
      projectId: deploymentsTable.projectId,
      projectName: projectsTable.name,
      deploymentCount: count(),
    })
    .from(deploymentsTable)
    .leftJoin(projectsTable, eq(deploymentsTable.projectId, projectsTable.id))
    .where(gte(deploymentsTable.createdAt, since))
    .groupBy(deploymentsTable.projectId, projectsTable.name)
    .orderBy(desc(count()))
    .limit(5);

  const totalRequests = timeSeries.reduce((s, p) => s + p.requests, 0);
  const totalDeploymentsInPeriod = topProjectsRaw.reduce((s, p) => s + Number(p.deploymentCount), 0);
  const topProjects = topProjectsRaw.map(p => {
    const share = totalDeploymentsInPeriod > 0
      ? Number(p.deploymentCount) / totalDeploymentsInPeriod
      : 1 / (topProjectsRaw.length || 1);
    const projectRequests = Math.round(totalRequests * share);
    return {
      projectId: p.projectId,
      projectName: p.projectName ?? "Unknown",
      requests: projectRequests,
      bandwidthGb: parseFloat((projectRequests * 0.0003).toFixed(2)),
    };
  });

  const rawAvg = buildStats?.avgBuildTime != null ? Number(buildStats.avgBuildTime) : null;

  res.json({
    period: period ?? "30d",
    totalRequests,
    totalBandwidthGb: parseFloat(timeSeries.reduce((s, p) => s + p.bandwidthGb, 0).toFixed(2)),
    uniqueVisitors: Math.round(totalRequests * 0.4),
    avgBuildTimeSeconds: rawAvg != null ? parseFloat(rawAvg.toFixed(1)) : null,
    errorRate,
    timeSeries,
    topProjects,
  });
});

// Infrastructure status
router.get("/infrastructure/status", async (req, res) => {
  const [projectCount] = await db.select({ count: count() }).from(projectsTable);
  const [domainCount] = await db.select({ count: count() }).from(domainsTable);
  const [deploymentCount] = await db.select({ count: count() }).from(deploymentsTable);

  // Independent counts — no subtraction that can go negative
  const [runningRow] = await db
    .select({ count: count() })
    .from(deploymentsTable)
    .where(sql`status IN ('queued', 'cloning', 'installing', 'building', 'deploying')`);

  const [readyRow] = await db
    .select({ count: count() })
    .from(deploymentsTable)
    .where(eq(deploymentsTable.status, "ready"));

  const [totalMetrics] = await db
    .select({ total: sql<number>`COALESCE(SUM(request_count), 0)` })
    .from(metricsTable);

  const totalProjects = Number(projectCount?.count ?? 0);
  const totalDomains = Number(domainCount?.count ?? 0);
  const totalDeployments = Number(deploymentCount?.count ?? 0);
  const runningContainers = Number(runningRow?.count ?? 0);
  const readyContainers = Number(readyRow?.count ?? 0);
  const totalContainers = readyContainers + runningContainers;
  const totalRequests = Number(totalMetrics?.total ?? 0);

  const regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-northeast-1", "ap-southeast-1"];
  const servers = regions.map((region, i) => ({
    id: `srv-${(i + 1).toString().padStart(3, "0")}`,
    region,
    status: "healthy" as const,
    cpuPercent: null,
    memoryPercent: null,
    containers: Math.floor(readyContainers / regions.length) + (i < readyContainers % regions.length ? 1 : 0),
    uptime: null,
  }));

  res.json({
    servers,
    totalContainers,
    runningContainers,
    totalDomains,
    totalDeployments,
    totalProjects,
    totalRequests,
    storageUsedGb: null,
    storageTotalGb: null,
    bandwidthUsedGb: parseFloat((totalRequests * 0.0003).toFixed(2)),
    cpuUsagePercent: null,
    memoryUsagePercent: null,
  });
});

export default router;
