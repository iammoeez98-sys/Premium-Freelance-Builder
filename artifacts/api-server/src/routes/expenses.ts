import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable } from "@workspace/db";
import {
  CreateExpenseBody, UpdateExpenseBody, UpdateExpenseParams, DeleteExpenseParams,
  ListExpensesQueryParams,
} from "@workspace/api-zod";
import { eq, and, like, SQL } from "drizzle-orm";

const router = Router();

function serializeExpense(e: typeof expensesTable.$inferSelect) {
  return {
    ...e,
    amount: Number(e.amount),
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/expenses", async (req, res) => {
  const params = ListExpensesQueryParams.safeParse(req.query);
  try {
    const filters: SQL[] = [];
    if (params.success && params.data.month) {
      filters.push(like(expensesTable.date, `${params.data.month}%`));
    }
    const expenses = await db.select().from(expensesTable)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(expensesTable.date);
    res.json(expenses.map(serializeExpense));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/expenses", async (req, res) => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const d = parsed.data;
    const [expense] = await db.insert(expensesTable).values({
      amount: String(d.amount),
      currency: d.currency,
      date: d.date,
      description: d.description,
      category: d.category,
      recurring: d.recurring,
    }).returning();
    res.status(201).json(serializeExpense(expense));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/expenses/:id", async (req, res) => {
  const params = UpdateExpenseParams.safeParse({ id: Number(req.params.id) });
  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const d = parsed.data;
    const updateData: Record<string, unknown> = { ...d };
    if (d.amount !== undefined) updateData.amount = String(d.amount);
    const [expense] = await db.update(expensesTable)
      .set(updateData as Parameters<typeof db.update<typeof expensesTable>>[0] extends { set: (v: infer V) => unknown } ? V : Record<string, unknown>)
      .where(eq(expensesTable.id, params.data.id)).returning();
    if (!expense) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }
    res.json(serializeExpense(expense));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/expenses/:id", async (req, res) => {
  const params = DeleteExpenseParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(expensesTable).where(eq(expensesTable.id, params.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
