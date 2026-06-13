import { db } from "@workspace/db";
import {
  projectsTable, deploymentsTable, domainsTable,
  dnsRecordsTable, envVarsTable, logEntriesTable
} from "@workspace/db";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Check if already seeded
  const existing = await db.select().from(projectsTable).limit(1);
  if (existing.length > 0) {
    console.log("Database already has data — skipping seed.");
    return;
  }

  // Projects
  const [p1] = await db.insert(projectsTable).values({
    name: "portfolio-site",
    description: "Personal portfolio built with Next.js",
    repoUrl: "https://github.com/user/portfolio-site",
    branch: "main",
    framework: "Next.js",
    packageManager: "npm",
    buildCommand: "npm run build",
    outputDir: ".next",
    status: "active",
    deploymentUrl: "https://portfolio-site.live",
  }).returning();

  const [p2] = await db.insert(projectsTable).values({
    name: "api-service",
    description: "REST API for mobile app",
    repoUrl: "https://github.com/user/api-service",
    branch: "main",
    framework: "Express",
    packageManager: "npm",
    buildCommand: "npm start",
    outputDir: ".",
    status: "active",
    deploymentUrl: "https://api-service.bot.net",
  }).returning();

  const [p3] = await db.insert(projectsTable).values({
    name: "docs-site",
    description: "Documentation site with Astro",
    repoUrl: "https://github.com/user/docs",
    branch: "main",
    framework: "Astro",
    packageManager: "npm",
    buildCommand: "astro build",
    outputDir: "dist",
    status: "failed",
  }).returning();

  console.log("Projects seeded:", p1.id, p2.id, p3.id);

  // Deployments
  const dep1CreatedAt = new Date(Date.now() - 25 * 1000);
  const [dep1] = await db.insert(deploymentsTable).values({
    projectId: p1.id,
    status: "ready",
    url: "https://deploy-1.freeable.live",
    commitSha: "a1b2c3d",
    commitMessage: "feat: add dark mode",
    branch: "main",
    buildDurationSeconds: 24.5,
    triggeredBy: "git push",
    isProduction: true,
    createdAt: dep1CreatedAt,
    completedAt: new Date(dep1CreatedAt.getTime() + 24500),
  }).returning();

  const dep2CreatedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 19000);
  await db.insert(deploymentsTable).values({
    projectId: p1.id,
    status: "ready",
    url: "https://deploy-2.freeable.live",
    commitSha: "e5f6g7h",
    commitMessage: "fix: mobile nav layout",
    branch: "main",
    buildDurationSeconds: 18.2,
    triggeredBy: "manual",
    isProduction: true,
    createdAt: dep2CreatedAt,
    completedAt: new Date(dep2CreatedAt.getTime() + 18200),
  });

  const dep3CreatedAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 32000);
  await db.insert(deploymentsTable).values({
    projectId: p2.id,
    status: "ready",
    url: "https://deploy-3.freeable.live",
    commitSha: "i9j0k1l",
    commitMessage: "chore: update dependencies",
    branch: "main",
    buildDurationSeconds: 31.0,
    triggeredBy: "api",
    isProduction: true,
    createdAt: dep3CreatedAt,
    completedAt: new Date(dep3CreatedAt.getTime() + 31000),
  });

  const dep4CreatedAt = new Date(Date.now() - 3 * 60 * 60 * 1000 - 9000);
  const [dep3] = await db.insert(deploymentsTable).values({
    projectId: p3.id,
    status: "failed",
    commitSha: "m2n3o4p",
    commitMessage: "feat: add blog section",
    branch: "main",
    triggeredBy: "git push",
    isProduction: true,
    createdAt: dep4CreatedAt,
    completedAt: new Date(dep4CreatedAt.getTime() + 9000),
  }).returning();

  // Domains
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const [d1] = await db.insert(domainsTable).values({
    name: "portfolio",
    tld: ".live",
    fullDomain: "portfolio.live",
    status: "active",
    projectId: p1.id,
    expiresAt,
    autoRenew: true,
    sslEnabled: true,
  }).returning();

  const [d2] = await db.insert(domainsTable).values({
    name: "apiservice",
    tld: ".bot.net",
    fullDomain: "apiservice.bot.net",
    status: "active",
    projectId: p2.id,
    expiresAt,
    autoRenew: true,
    sslEnabled: true,
  }).returning();

  const [d3] = await db.insert(domainsTable).values({
    name: "coolproject",
    tld: ".freeable",
    fullDomain: "coolproject.freeable",
    status: "active",
    expiresAt,
    autoRenew: true,
    sslEnabled: true,
  }).returning();

  // DNS records
  for (const [did, fullDomain] of [[d1.id, "portfolio.live"], [d2.id, "apiservice.bot.net"], [d3.id, "coolproject.freeable"]] as const) {
    await db.insert(dnsRecordsTable).values([
      { domainId: did, type: "A", name: "@", value: "76.76.21.21", ttl: 3600 },
      { domainId: did, type: "CNAME", name: "www", value: fullDomain, ttl: 3600 },
      { domainId: did, type: "NS", name: "@", value: "ns1.freeable.local", ttl: 86400 },
      { domainId: did, type: "NS", name: "@", value: "ns2.freeable.local", ttl: 86400 },
    ]);
  }

  // Env vars
  await db.insert(envVarsTable).values([
    { projectId: p1.id, key: "NODE_ENV", value: "production", encrypted: false, scope: "all" },
    { projectId: p1.id, key: "DATABASE_URL", value: "postgres://host:5432/mydb", encrypted: true, scope: "runtime" },
    { projectId: p1.id, key: "NEXT_PUBLIC_API_URL", value: "https://api.portfolio.live", encrypted: false, scope: "build" },
  ]);
  await db.insert(envVarsTable).values([
    { projectId: p2.id, key: "PORT", value: "3000", encrypted: false, scope: "runtime" },
    { projectId: p2.id, key: "JWT_SECRET", value: "supersecretjwtkey", encrypted: true, scope: "runtime" },
  ]);

  // Build logs
  const successLogs: Array<{ stage: "clone" | "install" | "build" | "deploy" | "verify"; level: string; message: string }> = [
    { stage: "clone", level: "info", message: "Cloning repository..." },
    { stage: "clone", level: "info", message: "Repository cloned successfully" },
    { stage: "install", level: "info", message: "Installing dependencies..." },
    { stage: "install", level: "info", message: "npm install completed (1.2s)" },
    { stage: "build", level: "info", message: "Running build command: npm run build" },
    { stage: "build", level: "info", message: "Build completed in 12.4s" },
    { stage: "deploy", level: "info", message: "Uploading artifacts..." },
    { stage: "deploy", level: "info", message: "Configuring edge network..." },
    { stage: "verify", level: "info", message: "Health check passed" },
    { stage: "verify", level: "info", message: "Deployment verified — live at https://deploy-1.freeable.live" },
  ];
  for (const log of successLogs) {
    await db.insert(logEntriesTable).values({ deploymentId: dep1.id, ...log });
  }

  const failedLogs: Array<{ stage: "clone" | "install" | "build" | "deploy" | "verify"; level: string; message: string }> = [
    { stage: "clone", level: "info", message: "Cloning repository..." },
    { stage: "clone", level: "info", message: "Repository cloned" },
    { stage: "install", level: "info", message: "Installing dependencies..." },
    { stage: "install", level: "warn", message: "3 deprecated packages found" },
    { stage: "build", level: "info", message: "Running astro build..." },
    { stage: "build", level: "error", message: "TypeError: Cannot read property 'slug' of undefined" },
    { stage: "build", level: "error", message: "Build failed after 8.3s" },
  ];
  for (const log of failedLogs) {
    await db.insert(logEntriesTable).values({ deploymentId: dep3.id, ...log });
  }

  console.log("Seed complete!");
}

seed().catch(err => { console.error(err); process.exit(1); });
