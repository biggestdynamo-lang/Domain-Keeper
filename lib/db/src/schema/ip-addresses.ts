import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ipAddressesTable = pgTable("ip_addresses", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  label: text("label"),
  region: text("region").notNull().default("us-east-1"),
  type: text("type").notNull().default("shared"),
  status: text("status").notNull().default("available"),
  domainId: integer("domain_id"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIpAddressSchema = createInsertSchema(ipAddressesTable).omit({ id: true, createdAt: true });
export type InsertIpAddress = z.infer<typeof insertIpAddressSchema>;
export type IpAddress = typeof ipAddressesTable.$inferSelect;
