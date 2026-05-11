import { Router } from "express";
import { db } from "@workspace/db";
import { incomeTable, incomeGoalsTable, clientsTable } from "@workspace/db";
import {
  CreateIncomeBody, UpdateIncomeBody, UpdateIncomeParams, DeleteIncomeParams,
  CreateIncomeGoalBody, UpdateIncomeGoalBody, UpdateIncomeGoalParams, DeleteIncomeGoalParams,
  ListIncomeQueryParams,
} from "@workspace/api-zod";
import { eq, and, like, SQL } from "drizzle-orm";

const router = Router();

function serializeIncome(i: typeof incomeTable.$inferSelect, clientName?: string | null) {
  return {
    ...i,
    amount: Number(i.amount),
    clientName: clientName ?? null,
    createdAt: i.createdAt.toISOString(),
  };
}

function serializeGoal(g: typeof incomeGoalsTable.$inferSelect, currentAmount = 0) {
  return {
    ...g,
    targetAmount: Number(g.targetAmount),
    currentAmount,
    createdAt: g.createdAt.toISOString(),
  };
}

// Income entries
router.get("/income", async (req, res) => {
  const params = ListIncomeQueryParams.safeParse(req.query);
  try {
    const filters: SQL[] = [];
    if (params.success && params.data.month) {
      filters.push(like(incomeTable.date, `${params.data.month}%`));
    }
    const entries = await db.select().from(incomeTable)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(incomeTable.date);

    const allClients = await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable);
    const clientMap = new Map<number, string>(allClients.map(c => [c.id, c.name]));

    res.json(entries.map(i => serializeIncome(i, i.clientId ? clientMap.get(i.clientId) : null)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/income", async (req, res) => {
  const parsed = CreateIncomeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const d = parsed.data;
    const [entry] = await db.insert(incomeTable).values({
      amount: String(d.amount),
      currency: d.currency,
      date: d.date,
      description: d.description,
      clientId: d.clientId,
      invoiceNumber: d.invoiceNumber,
      paymentStatus: d.paymentStatus,
    }).returning();
    let clientName: string | null = null;
    if (entry.clientId) {
      const [c] = await db.select().from(clientsTable).where(eq(clientsTable.id, entry.clientId));
      clientName = c?.name ?? null;
    }
    res.status(201).json(serializeIncome(entry, clientName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/income/:id", async (req, res) => {
  const params = UpdateIncomeParams.safeParse({ id: Number(req.params.id) });
  const parsed = UpdateIncomeBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const d = parsed.data;
    const updateData: Record<string, unknown> = { ...d };
    if (d.amount !== undefined) updateData.amount = String(d.amount);
    const [entry] = await db.update(incomeTable)
      .set(updateData as Parameters<typeof db.update<typeof incomeTable>>[0] extends { set: (v: infer V) => unknown } ? V : Record<string, unknown>)
      .where(eq(incomeTable.id, params.data.id)).returning();
    if (!entry) {
      res.status(404).json({ error: "Income entry not found" });
      return;
    }
    let clientName: string | null = null;
    if (entry.clientId) {
      const [c] = await db.select().from(clientsTable).where(eq(clientsTable.id, entry.clientId));
      clientName = c?.name ?? null;
    }
    res.json(serializeIncome(entry, clientName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/income/:id", async (req, res) => {
  const params = DeleteIncomeParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(incomeTable).where(eq(incomeTable.id, params.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Income Goals
router.get("/income-goals", async (req, res) => {
  try {
    const goals = await db.select().from(incomeGoalsTable).orderBy(incomeGoalsTable.createdAt);
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);

    const monthlyIncome = await db.select().from(incomeTable);
    const monthlyTotal = monthlyIncome
      .filter(i => i.date.startsWith(currentMonth) && i.paymentStatus === "paid")
      .reduce((sum, i) => sum + Number(i.amount), 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyTotal = monthlyIncome.filter(i => {
      const d = new Date(i.date);
      return d >= weekAgo && i.paymentStatus === "paid";
    }).reduce((sum, i) => sum + Number(i.amount), 0);

    const yearStr = String(now.getFullYear());
    const quarterlyTotal = monthlyIncome.filter(i => i.date.startsWith(yearStr) && i.paymentStatus === "paid")
      .reduce((sum, i) => sum + Number(i.amount), 0);

    res.json(goals.map(g => {
      let currentAmount = 0;
      if (g.period === "monthly") currentAmount = monthlyTotal;
      else if (g.period === "quarterly") currentAmount = quarterlyTotal;
      else if (g.period === "weekly") currentAmount = weeklyTotal;
      return serializeGoal(g, currentAmount);
    }));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/income-goals", async (req, res) => {
  const parsed = CreateIncomeGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const d = parsed.data;
    const [goal] = await db.insert(incomeGoalsTable).values({
      period: d.period,
      targetAmount: String(d.targetAmount),
      currency: d.currency,
      periodLabel: d.periodLabel,
    }).returning();
    res.status(201).json(serializeGoal(goal, 0));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/income-goals/:id", async (req, res) => {
  const params = UpdateIncomeGoalParams.safeParse({ id: Number(req.params.id) });
  const parsed = UpdateIncomeGoalBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const d = parsed.data;
    const updateData: Record<string, unknown> = { ...d };
    if (d.targetAmount !== undefined) updateData.targetAmount = String(d.targetAmount);
    const [goal] = await db.update(incomeGoalsTable)
      .set(updateData as Parameters<typeof db.update<typeof incomeGoalsTable>>[0] extends { set: (v: infer V) => unknown } ? V : Record<string, unknown>)
      .where(eq(incomeGoalsTable.id, params.data.id)).returning();
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.json(serializeGoal(goal, 0));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/income-goals/:id", async (req, res) => {
  const params = DeleteIncomeGoalParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(incomeGoalsTable).where(eq(incomeGoalsTable.id, params.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
