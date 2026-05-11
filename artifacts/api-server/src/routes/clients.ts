import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable } from "@workspace/db";
import { CreateClientBody, UpdateClientBody, GetClientParams, UpdateClientParams, DeleteClientParams } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

function serializeClient(c: typeof clientsTable.$inferSelect) {
  return {
    ...c,
    rate: Number(c.rate),
    totalEarned: Number(c.totalEarned),
    outstandingAmount: Number(c.outstandingAmount),
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/clients", async (req, res) => {
  try {
    const clients = await db.select().from(clientsTable).orderBy(clientsTable.createdAt);
    res.json(clients.map(serializeClient));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/clients", async (req, res) => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const d = parsed.data;
    const [client] = await db.insert(clientsTable).values({
      name: d.name,
      company: d.company,
      email: d.email,
      country: d.country,
      projectType: d.projectType,
      rate: String(d.rate ?? 0),
      currency: d.currency,
      paymentStatus: d.paymentStatus,
      status: d.status,
      lastContactDate: d.lastContactDate,
      notes: d.notes,
    }).returning();
    res.status(201).json(serializeClient(client));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/clients/:id", async (req, res) => {
  const params = GetClientParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json(serializeClient(client));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/clients/:id", async (req, res) => {
  const params = UpdateClientParams.safeParse({ id: Number(req.params.id) });
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const d = parsed.data;
    const updateData: Record<string, unknown> = { ...d };
    if (d.rate !== undefined) updateData.rate = String(d.rate);
    const [client] = await db
      .update(clientsTable)
      .set(updateData as Parameters<typeof db.update<typeof clientsTable>>[0] extends { set: (v: infer V) => unknown } ? V : Record<string, unknown>)
      .where(eq(clientsTable.id, params.data.id))
      .returning();
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json(serializeClient(client));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/clients/:id", async (req, res) => {
  const params = DeleteClientParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(clientsTable).where(eq(clientsTable.id, params.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
