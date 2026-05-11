import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, clientsTable } from "@workspace/db";
import { CreateTaskBody, UpdateTaskBody, UpdateTaskParams, DeleteTaskParams, ListTasksQueryParams } from "@workspace/api-zod";
import { eq, and, gte, lte, SQL } from "drizzle-orm";

const router = Router();

function serializeTask(t: typeof tasksTable.$inferSelect, clientName?: string | null) {
  return {
    ...t,
    estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
    actualHours: t.actualHours ? Number(t.actualHours) : null,
    clientName: clientName ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/tasks", async (req, res) => {
  const params = ListTasksQueryParams.safeParse(req.query);
  try {
    const filters: SQL[] = [];
    if (params.success) {
      if (params.data.weekStart) {
        const weekStart = params.data.weekStart;
        const startDate = new Date(weekStart);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        filters.push(gte(tasksTable.scheduledDate, weekStart));
        filters.push(lte(tasksTable.scheduledDate, endDate.toISOString().split("T")[0]));
      }
      if (params.data.clientId) {
        filters.push(eq(tasksTable.clientId, params.data.clientId));
      }
      if (params.data.status) {
        filters.push(eq(tasksTable.status, params.data.status));
      }
    }

    const tasks = await db.select().from(tasksTable)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(tasksTable.scheduledDate);

    const allClients = await db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable);
    const clientMap = new Map<number, string>(allClients.map(c => [c.id, c.name]));

    res.json(tasks.map(t => serializeTask(t, t.clientId ? clientMap.get(t.clientId) : null)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks", async (req, res) => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const d = parsed.data;
    const [task] = await db.insert(tasksTable).values({
      title: d.title,
      clientId: d.clientId,
      deadline: d.deadline,
      scheduledDate: d.scheduledDate,
      estimatedHours: d.estimatedHours !== undefined ? String(d.estimatedHours) : null,
      actualHours: d.actualHours !== undefined ? String(d.actualHours) : null,
      priority: d.priority,
      status: d.status,
      notes: d.notes,
    }).returning();
    let clientName: string | null = null;
    if (task.clientId) {
      const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, task.clientId));
      clientName = client?.name ?? null;
    }
    res.status(201).json(serializeTask(task, clientName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/tasks/:id", async (req, res) => {
  const params = UpdateTaskParams.safeParse({ id: Number(req.params.id) });
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const d = parsed.data;
    const updateData: Record<string, unknown> = { ...d };
    if (d.estimatedHours !== undefined) updateData.estimatedHours = String(d.estimatedHours);
    if (d.actualHours !== undefined) updateData.actualHours = String(d.actualHours);
    const [task] = await db
      .update(tasksTable)
      .set(updateData as Parameters<typeof db.update<typeof tasksTable>>[0] extends { set: (v: infer V) => unknown } ? V : Record<string, unknown>)
      .where(eq(tasksTable.id, params.data.id))
      .returning();
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    let clientName: string | null = null;
    if (task.clientId) {
      const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, task.clientId));
      clientName = client?.name ?? null;
    }
    res.json(serializeTask(task, clientName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  const params = DeleteTaskParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
