import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const webhookEventsTable = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  ref: text("ref").notNull().default("refs/heads/main"),
  commitSha: text("commit_sha"),
  commitMessage: text("commit_message"),
  pusher: text("pusher"),
  deploymentId: integer("deployment_id"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWebhookEventSchema = createInsertSchema(webhookEventsTable).omit({ id: true, receivedAt: true });
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEventsTable.$inferSelect;
