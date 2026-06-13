import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const metricsTable = pgTable("metrics", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  requestCount: integer("request_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMetricsSchema = createInsertSchema(metricsTable).omit({ id: true });
export type InsertMetrics = z.infer<typeof insertMetricsSchema>;
export type Metrics = typeof metricsTable.$inferSelect;
