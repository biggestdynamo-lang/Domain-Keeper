import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const domainsTable = pgTable("domains", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tld: text("tld").notNull(),
  fullDomain: text("full_domain").notNull(),
  status: text("status").notNull().default("active"),
  projectId: integer("project_id"),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  autoRenew: boolean("auto_renew").notNull().default(true),
  sslEnabled: boolean("ssl_enabled").notNull().default(true),
  sessionId: text("session_id"),
});

export const insertDomainSchema = createInsertSchema(domainsTable).omit({ id: true, registeredAt: true });
export type InsertDomain = z.infer<typeof insertDomainSchema>;
export type Domain = typeof domainsTable.$inferSelect;
