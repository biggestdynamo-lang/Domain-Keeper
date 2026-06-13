import { Router } from "express";
import { db, domainsTable, projectsTable, dnsRecordsTable } from "@workspace/db";
import { eq, desc, ilike } from "drizzle-orm";
import { logActivity } from "../lib/activity";
import {
  RegisterDomainBody,
  GetDomainParams,
  DeleteDomainParams,
  AttachDomainToProjectParams,
  AttachDomainToProjectBody,
  SearchDomainsQueryParams,
} from "@workspace/api-zod";

const router = Router();

const FREE_TLDS = [".live", ".qwerty", ".0.com", ".zapto.org", ".freeable", ".ai.net", ".bot.net", ".love", ".free.net"];

// Search domain availability
router.get("/domains/search", async (req, res) => {
  const { q } = SearchDomainsQueryParams.parse(req.query);

  // Strip TLD from query if present
  const namePart = q.split(".")[0].toLowerCase().replace(/[^a-z0-9-]/g, "");

  const registered = await db.select({ fullDomain: domainsTable.fullDomain }).from(domainsTable);
  const registeredSet = new Set(registered.map(r => r.fullDomain));

  const results = FREE_TLDS.map(tld => {
    const full = `${namePart}${tld}`;
    return {
      name: namePart,
      tld,
      fullDomain: full,
      available: !registeredSet.has(full),
      premium: false,
    };
  });

  res.json(results);
});

// List all domains
router.get("/domains", async (req, res) => {
  const domains = await db
    .select({
      id: domainsTable.id,
      name: domainsTable.name,
      tld: domainsTable.tld,
      fullDomain: domainsTable.fullDomain,
      status: domainsTable.status,
      projectId: domainsTable.projectId,
      projectName: projectsTable.name,
      registeredAt: domainsTable.registeredAt,
      expiresAt: domainsTable.expiresAt,
      autoRenew: domainsTable.autoRenew,
      sslEnabled: domainsTable.sslEnabled,
      sessionId: domainsTable.sessionId,
    })
    .from(domainsTable)
    .leftJoin(projectsTable, eq(domainsTable.projectId, projectsTable.id))
    .orderBy(desc(domainsTable.registeredAt));
  res.json(domains);
});

// Register domain
router.post("/domains", async (req, res) => {
  const body = RegisterDomainBody.parse(req.body);

  const fullDomain = `${body.name.toLowerCase()}${body.tld}`;
  const [existing] = await db.select().from(domainsTable).where(eq(domainsTable.fullDomain, fullDomain));
  if (existing) { res.status(409).json({ error: "Domain already registered" }); return; }

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const [domain] = await db.insert(domainsTable).values({
    name: body.name.toLowerCase(),
    tld: body.tld,
    fullDomain,
    expiresAt,
    projectId: body.projectId ?? null,
    autoRenew: body.autoRenew ?? true,
    sslEnabled: true,
    sessionId: body.sessionId ?? null,
    status: "active",
  }).returning();

  // Create default DNS records
  await db.insert(dnsRecordsTable).values([
    { domainId: domain.id, type: "A", name: "@", value: "76.76.21.21", ttl: 3600 },
    { domainId: domain.id, type: "CNAME", name: "www", value: fullDomain, ttl: 3600 },
    { domainId: domain.id, type: "NS", name: "@", value: "ns1.freeable.local", ttl: 86400 },
    { domainId: domain.id, type: "NS", name: "@", value: "ns2.freeable.local", ttl: 86400 },
  ]);

  res.status(201).json({ ...domain, projectName: null });
});

// Get single domain
router.get("/domains/:id", async (req, res) => {
  const { id } = GetDomainParams.parse({ id: Number(req.params.id) });
  const [domain] = await db
    .select({
      id: domainsTable.id,
      name: domainsTable.name,
      tld: domainsTable.tld,
      fullDomain: domainsTable.fullDomain,
      status: domainsTable.status,
      projectId: domainsTable.projectId,
      projectName: projectsTable.name,
      registeredAt: domainsTable.registeredAt,
      expiresAt: domainsTable.expiresAt,
      autoRenew: domainsTable.autoRenew,
      sslEnabled: domainsTable.sslEnabled,
      sessionId: domainsTable.sessionId,
    })
    .from(domainsTable)
    .leftJoin(projectsTable, eq(domainsTable.projectId, projectsTable.id))
    .where(eq(domainsTable.id, id));

  if (!domain) { res.status(404).json({ error: "Domain not found" }); return; }
  res.json(domain);
});

// Delete domain
router.delete("/domains/:id", async (req, res) => {
  const { id } = DeleteDomainParams.parse({ id: Number(req.params.id) });
  await db.delete(dnsRecordsTable).where(eq(dnsRecordsTable.domainId, id));
  await db.delete(domainsTable).where(eq(domainsTable.id, id));
  res.status(204).send();
});

// Attach domain to project
router.post("/domains/:id/attach", async (req, res) => {
  const { id } = AttachDomainToProjectParams.parse({ id: Number(req.params.id) });
  const body = AttachDomainToProjectBody.parse(req.body);

  const [prevDomain] = await db.select().from(domainsTable).where(eq(domainsTable.id, id));

  const [domain] = await db
    .update(domainsTable)
    .set({ projectId: body.projectId })
    .where(eq(domainsTable.id, id))
    .returning();
  if (!domain) { res.status(404).json({ error: "Domain not found" }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, body.projectId));

  if (prevDomain?.projectId !== body.projectId) {
    logActivity({
      projectId: body.projectId,
      type: "domain_attached",
      title: `Domain attached: ${domain.fullDomain}`,
      detail: domain.sslEnabled ? "SSL enabled" : undefined,
      metadata: { domainId: domain.id, fullDomain: domain.fullDomain },
    });
  }

  res.json({ ...domain, projectName: project?.name ?? null });
});

// Detach domain from project
router.post("/domains/:id/detach", async (req, res) => {
  const { id } = AttachDomainToProjectParams.parse({ id: Number(req.params.id) });

  const [prevDomain] = await db.select().from(domainsTable).where(eq(domainsTable.id, id));

  const [domain] = await db
    .update(domainsTable)
    .set({ projectId: null })
    .where(eq(domainsTable.id, id))
    .returning();
  if (!domain) { res.status(404).json({ error: "Domain not found" }); return; }

  if (prevDomain?.projectId) {
    logActivity({
      projectId: prevDomain.projectId,
      type: "domain_detached",
      title: `Domain detached: ${domain.fullDomain}`,
      metadata: { domainId: domain.id, fullDomain: domain.fullDomain },
    });
  }

  res.json({ ...domain, projectName: null });
});

export default router;
