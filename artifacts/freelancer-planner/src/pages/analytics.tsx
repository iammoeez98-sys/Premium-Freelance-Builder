import { motion } from "framer-motion";
import { useGetDashboardSummary, useGetWeeklyRevenue, useGetClientDistribution, useGetTaskCompletion, useListIncome, useListExpenses } from "@workspace/api-client-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, Clock, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["hsl(260,85%,65%)", "hsl(140,70%,45%)", "hsl(35,90%,60%)", "hsl(200,90%,60%)", "hsl(320,80%,60%)"];

export default function Analytics() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: weeklyRev } = useGetWeeklyRevenue();
  const { data: clientDist } = useGetClientDistribution();
  const { data: taskCompletion } = useGetTaskCompletion();
  const { data: income } = useListIncome();
  const { data: expenses } = useListExpenses();

  const csym = (c: string) => c === "EUR" ? "€" : c === "GBP" ? "£" : "$";
  const curr = summary?.currency ?? "USD";

  // Calculate profit by month
  const incomeByMonth: Record<string, number> = {};
  const expensesByMonth: Record<string, number> = {};
  (income ?? []).forEach(i => {
    const m = i.date.slice(0, 7);
    incomeByMonth[m] = (incomeByMonth[m] ?? 0) + i.amount;
  });
  (expenses ?? []).forEach(e => {
    const m = e.date.slice(0, 7);
    expensesByMonth[m] = (expensesByMonth[m] ?? 0) + e.amount;
  });

  const allMonths = Array.from(new Set([...Object.keys(incomeByMonth), ...Object.keys(expensesByMonth)])).sort();
  const profitData = allMonths.slice(-6).map(m => ({
    month: m.slice(5),
    income: Math.round(incomeByMonth[m] ?? 0),
    expenses: Math.round(expensesByMonth[m] ?? 0),
    profit: Math.round((incomeByMonth[m] ?? 0) - (expensesByMonth[m] ?? 0)),
  }));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Deep insights into your freelance business</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `${csym(curr)}${(summary?.weeklyRevenue ?? 0 * 8).toLocaleString()}`, icon: DollarSign, color: "bg-primary/10 text-primary", change: "+12%" },
          { label: "Active Clients", value: String(summary?.activeClients ?? 0), icon: Users, color: "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400", change: "+2 this month" },
          { label: "Productivity Score", value: String(summary?.productivityScore ?? 0), icon: BarChart3, color: "bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400", change: `${summary?.completedTasksThisWeek ?? 0} tasks done` },
          { label: "Hours Logged", value: `${(summary?.hoursWorkedThisWeek ?? 0).toFixed(1)}h`, icon: Clock, color: "bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400", change: "this week" },
        ].map(({ label, value, icon: Icon, color, change }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            {isLoading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-bold text-foreground">{value}</p>}
            <p className="text-xs text-muted-foreground mt-1">{change}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue trend */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Revenue Trend</h3>
        <p className="text-xs text-muted-foreground mb-5">Weekly revenue over the past 8 weeks</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={weeklyRev ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(260,85%,65%)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(260,85%,65%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${csym(curr)}${v}`} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} formatter={(v: number) => [`${csym(curr)}${v.toLocaleString()}`, "Revenue"]} />
            <Area type="monotone" dataKey="revenue" stroke="hsl(260,85%,65%)" strokeWidth={2.5} fill="url(#revGrad2)" dot={false} activeDot={{ r: 4, fill: "hsl(260,85%,65%)" }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Income vs Expenses + Client Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Income vs Expenses</h3>
          <p className="text-xs text-muted-foreground mb-5">Monthly comparison (last 6 months)</p>
          {profitData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={profitData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${csym(curr)}${v}`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} formatter={(v: number, name: string) => [`${csym(curr)}${v.toLocaleString()}`, name]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" fill="hsl(260,85%,65%)" radius={[3, 3, 0, 0]} maxBarSize={20} name="Income" />
                <Bar dataKey="expenses" fill="hsl(0,84%,65%)" radius={[3, 3, 0, 0]} maxBarSize={20} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Revenue by Client</h3>
          <p className="text-xs text-muted-foreground mb-5">Share of total revenue</p>
          {(clientDist && clientDist.length > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={clientDist} cx="50%" cy="50%" outerRadius={70} dataKey="revenue" paddingAngle={2} label={({ name, percentage }) => `${percentage}%`} labelLine={false}>
                    {clientDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} formatter={(v: number) => [`${csym(curr)}${v.toLocaleString()}`, "Revenue"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {clientDist.map((c, i) => (
                  <div key={c.clientName} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-foreground font-medium">{c.clientName}</span>
                    </div>
                    <span className="text-muted-foreground">{csym(curr)}{c.revenue.toLocaleString()} · {c.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No income data yet</div>
          )}
        </motion.div>
      </div>

      {/* Task completion trend */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Task Completion Rate</h3>
        <p className="text-xs text-muted-foreground mb-5">Weekly productivity trend</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={taskCompletion ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} formatter={(v: number) => [`${v}%`, "Completion rate"]} />
            <Line type="monotone" dataKey="rate" stroke="hsl(140,70%,45%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(140,70%,45%)", strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
