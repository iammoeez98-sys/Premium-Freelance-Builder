import { pgTable, serial, text, numeric, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profileTable = pgTable("profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  profession: text("profession").notNull(),
  monthlyGoal: numeric("monthly_goal", { precision: 12, scale: 2 }).notNull().default("0"),
  weeklyHours: numeric("weekly_hours", { precision: 6, scale: 2 }).notNull().default("40"),
  currency: text("currency").notNull().default("USD"),
  niche: text("niche").notNull().default(""),
  workDays: jsonb("work_days").$type<string[]>().notNull().default(["Mon", "Tue", "Wed", "Thu", "Fri"]),
  timezone: text("timezone").default("UTC"),
  weekStartDay: text("week_start_day").notNull().default("Monday"),
  darkMode: boolean("dark_mode").notNull().default(false),
});

export const insertProfileSchema = createInsertSchema(profileTable).omit({ id: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profileTable.$inferSelect;
