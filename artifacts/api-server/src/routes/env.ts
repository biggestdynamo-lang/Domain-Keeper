import { Router } from "express";
import { db, envVarsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logActivity } from "../lib/activity";
import {
  ListEnvVarsParams,
  CreateEnvVarParams,
  CreateEnvVarBody,
  UpdateEnvVarParams,
  UpdateEnvVarBody,
  DeleteEnvVarParams,
} from "@workspace/api-zod";

const router = Router();

// List env vars for project
router.get("/projects/:id/env", async (req, res) => {
  const { id } = ListEnvVarsParams.parse({ id: Number(req.params.id) });
  const vars = await db.select().from(envVarsTable).where(eq(envVarsTable.projectId, id));
  // Mask encrypted values
  const masked = vars.map(v => ({
    ...v,
    value: v.encrypted ? "••••••••••••" : v.value,
  }));
  res.json(masked);
});

// Create env var
router.post("/projects/:id/env", async (req, res) => {
  const { id } = CreateEnvVarParams.parse({ id: Number(req.params.id) });
  const body = CreateEnvVarBody.parse(req.body);
  const [envVar] = await db.insert(envVarsTable).values({
    projectId: id,
    key: body.key,
    value: body.value,
    encrypted: body.encrypted ?? false,
    scope: (body.scope as "build" | "runtime" | "all") ?? "all",
  }).returning();

  logActivity({
    projectId: id,
    type: "env_var_added",
    title: `Env var added: ${envVar.key}`,
    detail: `Scope: ${envVar.scope}${envVar.encrypted ? " · encrypted" : ""}`,
    metadata: { envVarId: envVar.id, key: envVar.key, scope: envVar.scope, encrypted: envVar.encrypted },
  });

  res.status(201).json({
    ...envVar,
    value: envVar.encrypted ? "••••••••••••" : envVar.value,
  });
});

// Update env var
router.put("/env/:id", async (req, res) => {
  const { id } = UpdateEnvVarParams.parse({ id: Number(req.params.id) });
  const body = UpdateEnvVarBody.parse(req.body);
  const [envVar] = await db.update(envVarsTable).set(body).where(eq(envVarsTable.id, id)).returning();
  if (!envVar) { res.status(404).json({ error: "Env var not found" }); return; }
  res.json({
    ...envVar,
    value: envVar.encrypted ? "••••••••••••" : envVar.value,
  });
});

// Delete env var
router.delete("/env/:id", async (req, res) => {
  const { id } = DeleteEnvVarParams.parse({ id: Number(req.params.id) });
  const [envVar] = await db.select().from(envVarsTable).where(eq(envVarsTable.id, id));
  await db.delete(envVarsTable).where(eq(envVarsTable.id, id));
  if (envVar) {
    logActivity({
      projectId: envVar.projectId,
      type: "env_var_deleted",
      title: `Env var removed: ${envVar.key}`,
      metadata: { envVarId: id, key: envVar.key },
    });
  }
  res.status(204).send();
});

export default router;
