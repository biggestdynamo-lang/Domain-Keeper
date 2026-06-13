import { Router } from "express";
import { db, activityEventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/projects/:id/activity", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const events = await db
    .select()
    .from(activityEventsTable)
    .where(eq(activityEventsTable.projectId, id))
    .orderBy(desc(activityEventsTable.createdAt))
    .limit(100);
  res.json(events);
});

export default router;
