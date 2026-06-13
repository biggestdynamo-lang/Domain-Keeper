import { Router } from "express";
import { db, dnsRecordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListDnsRecordsParams,
  CreateDnsRecordParams,
  CreateDnsRecordBody,
  UpdateDnsRecordParams,
  UpdateDnsRecordBody,
  DeleteDnsRecordParams,
} from "@workspace/api-zod";
import { cfCreateRecord, cfUpdateRecord, cfDeleteRecord } from "../lib/cloudflare";

const router = Router();

// List DNS records for domain
router.get("/domains/:id/dns", async (req, res) => {
  const { id } = ListDnsRecordsParams.parse({ id: Number(req.params.id) });
  const records = await db.select().from(dnsRecordsTable).where(eq(dnsRecordsTable.domainId, id));
  res.json(records);
});

// Create DNS record
router.post("/domains/:id/dns", async (req, res) => {
  const { id } = CreateDnsRecordParams.parse({ id: Number(req.params.id) });
  const body = CreateDnsRecordBody.parse(req.body);
  const [record] = await db.insert(dnsRecordsTable).values({
    domainId: id,
    type: body.type,
    name: body.name,
    value: body.value,
    ttl: body.ttl ?? 3600,
    priority: body.priority ?? null,
  }).returning();

  const cfId = await cfCreateRecord({
    type: record.type,
    name: record.name,
    value: record.value,
    ttl: record.ttl,
    priority: record.priority,
  });
  if (cfId) {
    await db.update(dnsRecordsTable)
      .set({ cloudflareRecordId: cfId })
      .where(eq(dnsRecordsTable.id, record.id));
    record.cloudflareRecordId = cfId;
  }

  res.status(201).json(record);
});

// Update DNS record
router.put("/dns/:id", async (req, res) => {
  const { id } = UpdateDnsRecordParams.parse({ id: Number(req.params.id) });
  const body = UpdateDnsRecordBody.parse(req.body);
  const [record] = await db.update(dnsRecordsTable).set(body).where(eq(dnsRecordsTable.id, id)).returning();
  if (!record) { res.status(404).json({ error: "DNS record not found" }); return; }

  if (record.cloudflareRecordId) {
    await cfUpdateRecord(record.cloudflareRecordId, {
      type: body.type,
      name: body.name,
      value: body.value,
      ttl: body.ttl,
      priority: body.priority,
    });
  }

  res.json(record);
});

// Delete DNS record
router.delete("/dns/:id", async (req, res) => {
  const { id } = DeleteDnsRecordParams.parse({ id: Number(req.params.id) });
  const [record] = await db.select().from(dnsRecordsTable).where(eq(dnsRecordsTable.id, id));
  if (record?.cloudflareRecordId) {
    await cfDeleteRecord(record.cloudflareRecordId);
  }
  await db.delete(dnsRecordsTable).where(eq(dnsRecordsTable.id, id));
  res.status(204).send();
});

export default router;
