import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  country: text("country"),
  projectType: text("project_type"),
  rate: numeric("rate", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  status: text("status").notNull().default("active"),
  lastContactDate: text("last_contact_date"),
  notes: text("notes"),
  totalEarned: numeric("total_earned", { precision: 12, scale: 2 }).notNull().default("0"),
  outstandingAmount: numeric("outstanding_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  projectsCompleted: integer("projects_completed").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
