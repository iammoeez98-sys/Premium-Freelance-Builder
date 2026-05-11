import { Router } from "express";
import { db } from "@workspace/db";
import { profileTable } from "@workspace/db";
import { CreateProfileBody, UpdateProfileBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

function serializeProfile(p: typeof profileTable.$inferSelect) {
  return {
    ...p,
    monthlyGoal: Number(p.monthlyGoal),
    weeklyHours: Number(p.weeklyHours),
  };
}

router.get("/profile", async (req, res) => {
  try {
    const [profile] = await db.select().from(profileTable).limit(1);
    if (!profile) {
      res.status(404).json({ error: "No profile found" });
      return;
    }
    res.json(serializeProfile(profile));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/profile", async (req, res) => {
  const parsed = CreateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    await db.delete(profileTable);
    const d = parsed.data;
    const [profile] = await db
      .insert(profileTable)
      .values({
        name: d.name,
        profession: d.profession,
        monthlyGoal: String(d.monthlyGoal),
        weeklyHours: String(d.weeklyHours),
        currency: d.currency,
        niche: d.niche,
        workDays: d.workDays ?? ["Mon", "Tue", "Wed", "Thu", "Fri"],
        timezone: d.timezone,
        weekStartDay: d.weekStartDay,
        darkMode: d.darkMode,
      })
      .returning();
    res.status(201).json(serializeProfile(profile));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/profile", async (req, res) => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [existing] = await db.select().from(profileTable).limit(1);
    if (!existing) {
      res.status(404).json({ error: "No profile found" });
      return;
    }
    const d = parsed.data;
    const updateData: Record<string, unknown> = { ...d };
    if (d.monthlyGoal !== undefined) updateData.monthlyGoal = String(d.monthlyGoal);
    if (d.weeklyHours !== undefined) updateData.weeklyHours = String(d.weeklyHours);
    const [profile] = await db
      .update(profileTable)
      .set(updateData as Parameters<typeof db.update<typeof profileTable>>[0] extends { set: (v: infer V) => unknown } ? V : Record<string, unknown>)
      .where(eq(profileTable.id, existing.id))
      .returning();
    res.json(serializeProfile(profile));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
