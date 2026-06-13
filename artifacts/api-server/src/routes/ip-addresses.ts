import { Router } from "express";
import { db, ipAddressesTable, domainsTable, dnsRecordsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const REGIONS = ["us-east-1", "us-west-2", "eu-west-1", "ap-northeast-1", "ap-southeast-1"];

function randomRegion() {
  return REGIONS[Math.floor(Math.random() * REGIONS.length)];
}

// List all IPs with domain info
router.get("/ip-addresses", async (_req, res) => {
  const ips = await db.select({
    id: ipAddressesTable.id,
    address: ipAddressesTable.address,
    label: ipAddressesTable.label,
    region: ipAddressesTable.region,
    type: ipAddressesTable.type,
    status: ipAddressesTable.status,
    domainId: ipAddressesTable.domainId,
    assignedAt: ipAddressesTable.assignedAt,
    createdAt: ipAddressesTable.createdAt,
    domainName: domainsTable.fullDomain,
  })
    .from(ipAddressesTable)
    .leftJoin(domainsTable, eq(ipAddressesTable.domainId, domainsTable.id))
    .orderBy(ipAddressesTable.id);
  res.json(ips);
});

// Add IP to pool
router.post("/ip-addresses", async (req, res) => {
  const { address, label, region, type } = req.body as {
    address: string;
    label?: string;
    region?: string;
    type?: string;
  };

  if (!address || typeof address !== "string") {
    res.status(400).json({ error: "address is required" });
    return;
  }

  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(address)) {
    res.status(400).json({ error: "Invalid IP address format" });
    return;
  }

  const existing = await db.select().from(ipAddressesTable).where(eq(ipAddressesTable.address, address));
  if (existing.length > 0) {
    res.status(409).json({ error: "IP address already exists in pool" });
    return;
  }

  const [ip] = await db.insert(ipAddressesTable).values({
    address,
    label: label ?? null,
    region: region ?? randomRegion(),
    type: type ?? "shared",
    status: "available",
    domainId: null,
    assignedAt: null,
  }).returning();

  res.status(201).json(ip);
});

// Assign IP to domain
router.post("/ip-addresses/:id/assign", async (req, res) => {
  const id = Number(req.params.id);
  const { domainId } = req.body as { domainId: number };

  if (!domainId || isNaN(Number(domainId))) {
    res.status(400).json({ error: "domainId is required" });
    return;
  }

  const [ip] = await db.select().from(ipAddressesTable).where(eq(ipAddressesTable.id, id));
  if (!ip) { res.status(404).json({ error: "IP address not found" }); return; }
  if (ip.status === "assigned") { res.status(409).json({ error: "IP is already assigned" }); return; }

  const [domain] = await db.select().from(domainsTable).where(eq(domainsTable.id, Number(domainId)));
  if (!domain) { res.status(404).json({ error: "Domain not found" }); return; }

  // Update the domain's A record to point to this IP
  const existingA = await db.select().from(dnsRecordsTable).where(
    and(eq(dnsRecordsTable.domainId, domain.id), eq(dnsRecordsTable.type, "A"), eq(dnsRecordsTable.name, "@"))
  );

  if (existingA.length > 0) {
    await db.update(dnsRecordsTable)
      .set({ value: ip.address })
      .where(eq(dnsRecordsTable.id, existingA[0].id));
  } else {
    await db.insert(dnsRecordsTable).values({
      domainId: domain.id,
      type: "A",
      name: "@",
      value: ip.address,
      ttl: 3600,
    });
  }

  const [updated] = await db.update(ipAddressesTable)
    .set({ status: "assigned", domainId: domain.id, assignedAt: new Date() })
    .where(eq(ipAddressesTable.id, id))
    .returning();

  res.json({ ...updated, domainName: domain.fullDomain });
});

// Release IP from domain
router.post("/ip-addresses/:id/release", async (req, res) => {
  const id = Number(req.params.id);

  const [ip] = await db.select().from(ipAddressesTable).where(eq(ipAddressesTable.id, id));
  if (!ip) { res.status(404).json({ error: "IP address not found" }); return; }

  const [updated] = await db.update(ipAddressesTable)
    .set({ status: "available", domainId: null, assignedAt: null })
    .where(eq(ipAddressesTable.id, id))
    .returning();

  res.json({ ...updated, domainName: null });
});

// Delete IP from pool
router.delete("/ip-addresses/:id", async (req, res) => {
  const id = Number(req.params.id);

  const [ip] = await db.select().from(ipAddressesTable).where(eq(ipAddressesTable.id, id));
  if (!ip) { res.status(404).json({ error: "IP address not found" }); return; }
  if (ip.status === "assigned") { res.status(409).json({ error: "Cannot delete an assigned IP. Release it first." }); return; }

  await db.delete(ipAddressesTable).where(eq(ipAddressesTable.id, id));
  res.status(204).send();
});

export default router;
