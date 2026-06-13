import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { randomBytes } from "crypto";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  repoUrl: text("repo_url"),
  branch: text("branch").notNull().default("main"),
  framework: text("framework"),
  packageManager: text("package_manager"),
  buildCommand: text("build_command"),
  outputDir: text("output_dir"),
  status: text("status").notNull().default("idle"),
  deploymentUrl: text("deployment_url"),
  webhookToken: text("webhook_token").$defaultFn(() => randomBytes(16).toString("hex")),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
