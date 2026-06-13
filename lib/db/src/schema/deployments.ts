import { pgTable, text, serial, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deploymentsTable = pgTable("deployments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  status: text("status").notNull().default("queued"),
  url: text("url"),
  commitSha: text("commit_sha"),
  commitMessage: text("commit_message"),
  branch: text("branch").notNull().default("main"),
  buildDurationSeconds: real("build_duration_seconds"),
  triggeredBy: text("triggered_by").notNull().default("manual"),
  isProduction: boolean("is_production").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertDeploymentSchema = createInsertSchema(deploymentsTable).omit({ id: true, createdAt: true });
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deploymentsTable.$inferSelect;
