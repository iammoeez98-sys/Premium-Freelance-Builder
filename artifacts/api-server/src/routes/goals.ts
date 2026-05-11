import { Router } from "express";
import { db } from "@workspace/db";
import { goalsTable } from "@workspace/db";
import { CreateGoalBody, UpdateGoalBody, UpdateGoalParams, DeleteGoalParams } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

function serializeGoal(g: typeof goalsTable.$inferSelect) {
  return {
    ...g,
    createdAt: g.createdAt.toISOString(),
  };
}

router.get("/goals", async (req, res) => {
  try {
    const goals = await db.select().from(goalsTable).orderBy(goalsTable.createdAt);
    res.json(goals.map(serializeGoal));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/goals", async (req, res) => {
  const parsed = CreateGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [goal] = await db.insert(goalsTable).values(parsed.data).returning();
    res.status(201).json(serializeGoal(goal));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/goals/:id", async (req, res) => {
  const params = UpdateGoalParams.safeParse({ id: Number(req.params.id) });
  const parsed = UpdateGoalBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const [goal] = await db.update(goalsTable).set(parsed.data).where(eq(goalsTable.id, params.data.id)).returning();
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.json(serializeGoal(goal));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/goals/:id", async (req, res) => {
  const params = DeleteGoalParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(goalsTable).where(eq(goalsTable.id, params.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
