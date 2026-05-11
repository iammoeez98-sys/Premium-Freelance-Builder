import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const incomeTable = pgTable("income", {
  id: serial("id").primaryKey(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  date: text("date").notNull(),
  description: text("description").notNull(),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  invoiceNumber: text("invoice_number"),
  paymentStatus: text("payment_status").notNull().default("paid"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const incomeGoalsTable = pgTable("income_goals", {
  id: serial("id").primaryKey(),
  period: text("period").notNull().default("monthly"),
  targetAmount: numeric("target_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  periodLabel: text("period_label"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIncomeSchema = createInsertSchema(incomeTable).omit({ id: true, createdAt: true });
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof incomeTable.$inferSelect;

export const insertIncomeGoalSchema = createInsertSchema(incomeGoalsTable).omit({ id: true, createdAt: true });
export type InsertIncomeGoal = z.infer<typeof insertIncomeGoalSchema>;
export type IncomeGoal = typeof incomeGoalsTable.$inferSelect;
