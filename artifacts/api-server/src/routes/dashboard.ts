import { Router } from "express";
import { db } from "@workspace/db";
import { incomeTable, incomeGoalsTable, expensesTable, tasksTable, clientsTable, profileTable } from "@workspace/db";
import { eq, and, like, gte, lte } from "drizzle-orm";

const router = Router();

function getWeekRange(weeksAgo = 0) {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff - weeksAgo * 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

router.get("/dashboard/summary", async (req, res) => {
  try {
    const [profile] = await db.select().from(profileTable).limit(1);
    const currency = profile?.currency ?? "USD";
    const monthlyGoal = profile ? Number(profile.monthlyGoal) : 0;

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const { start: weekStart, end: weekEnd } = getWeekRange();

    // All income
    const allIncome = await db.select().from(incomeTable);
    const monthlyPaidIncome = allIncome.filter(i => i.date.startsWith(currentMonth) && i.paymentStatus === "paid");
    const weeklyPaidIncome = allIncome.filter(i => {
      const d = new Date(i.date);
      return d >= weekStart && d <= weekEnd && i.paymentStatus === "paid";
    });
    const pendingIncome = allIncome.filter(i => i.paymentStatus === "pending" || i.paymentStatus === "overdue");

    const monthlyRevenue = monthlyPaidIncome.reduce((s, i) => s + Number(i.amount), 0);
    const weeklyRevenue = weeklyPaidIncome.reduce((s, i) => s + Number(i.amount), 0);
    const pendingInvoices = pendingIncome.reduce((s, i) => s + Number(i.amount), 0);

    // Expenses
    const allExpenses = await db.select().from(expensesTable);
    const monthlyExpenses = allExpenses.filter(e => e.date.startsWith(currentMonth));
    const totalExpensesThisMonth = monthlyExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const netProfitThisMonth = monthlyRevenue - totalExpensesThisMonth;

    // Clients
    const allClients = await db.select().from(clientsTable);
    const activeClients = allClients.filter(c => c.status === "active").length;

    // Tasks this week
    const allTasks = await db.select().from(tasksTable);
    const weekStartStr = toDateStr(weekStart);
    const weekEndStr = toDateStr(weekEnd);
    const weekTasks = allTasks.filter(t => t.scheduledDate >= weekStartStr && t.scheduledDate <= weekEndStr);
    const totalTasksThisWeek = weekTasks.length;
    const completedTasksThisWeek = weekTasks.filter(t => t.status === "completed").length;

    // Hours worked this week
    const hoursWorkedThisWeek = weekTasks
      .filter(t => t.actualHours)
      .reduce((s, t) => s + Number(t.actualHours), 0);

    // Productivity score (0-100)
    const completionRate = totalTasksThisWeek > 0 ? (completedTasksThisWeek / totalTasksThisWeek) * 100 : 0;
    const goalRate = monthlyGoal > 0 ? Math.min((monthlyRevenue / monthlyGoal) * 100, 100) : 0;
    const productivityScore = Math.round((completionRate * 0.6) + (goalRate * 0.4));

    const monthlyGoalProgress = monthlyGoal > 0 ? Math.min(Math.round((monthlyRevenue / monthlyGoal) * 100), 100) : 0;

    res.json({
      weeklyRevenue,
      monthlyGoalProgress,
      monthlyGoalTarget: monthlyGoal,
      monthlyGoalCurrent: monthlyRevenue,
      pendingInvoices,
      activeClients,
      hoursWorkedThisWeek,
      productivityScore,
      totalTasksThisWeek,
      completedTasksThisWeek,
      netProfitThisMonth,
      totalExpensesThisMonth,
      currency,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/weekly-revenue", async (req, res) => {
  try {
    const allIncome = await db.select().from(incomeTable);

    const points = [];
    for (let i = 7; i >= 0; i--) {
      const { start, end } = getWeekRange(i);
      const weekIncome = allIncome.filter(inc => {
        const d = new Date(inc.date);
        return d >= start && d <= end && inc.paymentStatus === "paid";
      });
      const revenue = weekIncome.reduce((s, inc) => s + Number(inc.amount), 0);
      const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      points.push({ week: label, revenue });
    }
    res.json(points);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/client-distribution", async (req, res) => {
  try {
    const allIncome = await db.select().from(incomeTable);
    const allClients = await db.select().from(clientsTable);

    const clientMap = new Map<number, string>(allClients.map(c => [c.id, c.name]));
    const revenueByClient = new Map<string, number>();

    for (const i of allIncome) {
      if (i.paymentStatus !== "paid") continue;
      const name = i.clientId ? (clientMap.get(i.clientId) ?? "Unknown") : "Direct";
      revenueByClient.set(name, (revenueByClient.get(name) ?? 0) + Number(i.amount));
    }

    const total = Array.from(revenueByClient.values()).reduce((s, v) => s + v, 0);
    const points = Array.from(revenueByClient.entries())
      .map(([clientName, revenue]) => ({
        clientName,
        revenue,
        percentage: total > 0 ? Math.round((revenue / total) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json(points);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/insights", async (req, res) => {
  try {
    const [profile] = await db.select().from(profileTable).limit(1);
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);

    const allIncome = await db.select().from(incomeTable);
    const allClients = await db.select().from(clientsTable);
    const allTasks = await db.select().from(tasksTable);
    const { start: weekStart, end: weekEnd } = getWeekRange();
    const weekStartStr = toDateStr(weekStart);
    const weekEndStr = toDateStr(weekEnd);

    const insights: { id: string; type: string; message: string; severity: string }[] = [];

    // Monthly goal progress
    const monthlyGoal = profile ? Number(profile.monthlyGoal) : 0;
    const monthlyRevenue = allIncome
      .filter(i => i.date.startsWith(currentMonth) && i.paymentStatus === "paid")
      .reduce((s, i) => s + Number(i.amount), 0);

    if (monthlyGoal > 0) {
      const pct = (monthlyRevenue / monthlyGoal) * 100;
      if (pct < 50) {
        const remaining = monthlyGoal - monthlyRevenue;
        insights.push({
          id: "income-low",
          type: "income",
          message: `You are ${Math.round(100 - pct)}% behind your monthly target. You need $${remaining.toFixed(0)} more to hit your goal this month.`,
          severity: "warning",
        });
      } else if (pct > 100) {
        insights.push({
          id: "income-over",
          type: "income",
          message: `You've exceeded your monthly target by ${Math.round(pct - 100)}%! Consider raising your monthly goal.`,
          severity: "info",
        });
      }
    }

    // Client dependency
    const revenueByClient = new Map<number, number>();
    for (const i of allIncome) {
      if (i.paymentStatus !== "paid" || !i.clientId) continue;
      revenueByClient.set(i.clientId, (revenueByClient.get(i.clientId) ?? 0) + Number(i.amount));
    }
    const totalRevenue = Array.from(revenueByClient.values()).reduce((s, v) => s + v, 0);
    if (totalRevenue > 0) {
      for (const [clientId, rev] of revenueByClient.entries()) {
        const pct = (rev / totalRevenue) * 100;
        if (pct > 60) {
          const client = allClients.find(c => c.id === clientId);
          insights.push({
            id: `client-dep-${clientId}`,
            type: "client",
            message: `${Math.round(pct)}% of your income comes from ${client?.name ?? "one client"}. Diversification is recommended to reduce risk.`,
            severity: "warning",
          });
        }
      }
    }

    // Pending invoices
    const pendingTotal = allIncome
      .filter(i => i.paymentStatus === "pending" || i.paymentStatus === "overdue")
      .reduce((s, i) => s + Number(i.amount), 0);
    const overdueCount = allIncome.filter(i => i.paymentStatus === "overdue").length;
    if (overdueCount > 0) {
      insights.push({
        id: "overdue-invoices",
        type: "income",
        message: `You have ${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""}. Follow up to collect $${pendingTotal.toFixed(0)} in outstanding payments.`,
        severity: "critical",
      });
    }

    // Workload this week
    const weekTasks = allTasks.filter(t => t.scheduledDate >= weekStartStr && t.scheduledDate <= weekEndStr);
    const tasksByDay = new Map<string, number>();
    for (const t of weekTasks) {
      if (t.estimatedHours) {
        tasksByDay.set(t.scheduledDate, (tasksByDay.get(t.scheduledDate) ?? 0) + Number(t.estimatedHours));
      }
    }
    for (const [date, hours] of tasksByDay.entries()) {
      if (hours > 8) {
        const dayName = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
        insights.push({
          id: `overload-${date}`,
          type: "workload",
          message: `Your ${dayName} workload exceeds healthy limits (${hours}h scheduled). Consider moving some tasks to another day.`,
          severity: "warning",
        });
        break; // Only report the worst day
      }
    }

    // Revision detection
    const revisionTasks = weekTasks.filter(t => t.status === "revision");
    if (revisionTasks.length >= 2) {
      insights.push({
        id: "revisions-high",
        type: "productivity",
        message: `You have ${revisionTasks.length} tasks in revision this week. Consider improving client approval workflow to reduce revision cycles.`,
        severity: "info",
      });
    }

    // Ghost clients
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ghosted = allClients.filter(c => {
      if (!c.lastContactDate) return false;
      return c.status === "active" && new Date(c.lastContactDate) < thirtyDaysAgo;
    });
    if (ghosted.length > 0) {
      insights.push({
        id: "follow-up",
        type: "client",
        message: `You haven't followed up with ${ghosted[0].name}${ghosted.length > 1 ? ` and ${ghosted.length - 1} other client${ghosted.length - 1 > 1 ? "s" : ""}` : ""} in over 30 days.`,
        severity: "info",
      });
    }

    // If no insights, add a positive one
    if (insights.length === 0) {
      insights.push({
        id: "all-good",
        type: "productivity",
        message: "Everything looks great! Your workload is balanced and you're on track with your goals.",
        severity: "info",
      });
    }

    res.json(insights);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/task-completion", async (req, res) => {
  try {
    const allTasks = await db.select().from(tasksTable);
    const points = [];

    for (let i = 7; i >= 0; i--) {
      const { start, end } = getWeekRange(i);
      const startStr = toDateStr(start);
      const endStr = toDateStr(end);
      const weekTasks = allTasks.filter(t => t.scheduledDate >= startStr && t.scheduledDate <= endStr);
      const total = weekTasks.length;
      const completed = weekTasks.filter(t => t.status === "completed").length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      points.push({ week: label, completed, total, rate });
    }

    res.json(points);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
