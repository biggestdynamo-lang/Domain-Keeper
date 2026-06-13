import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const logEntriesTable = pgTable("log_entries", {
  id: serial("id").primaryKey(),
  deploymentId: integer("deployment_id").notNull(),
  level: text("level").notNull().default("info"),
  stage: text("stage").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLogEntrySchema = createInsertSchema(logEntriesTable).omit({ id: true, timestamp: true });
export type InsertLogEntry = z.infer<typeof insertLogEntrySchema>;
export type LogEntry = typeof logEntriesTable.$inferSelect;
