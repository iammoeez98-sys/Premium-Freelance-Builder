import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  useGetDashboardSummary, useGetWeeklyRevenue, useGetClientDistribution,
  useGetInsights, useGetTaskCompletion, useListTasks
} from "@workspace/api-client-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { DollarSign, TrendingUp, Users, Clock, Zap, AlertTriangle, Info, CheckCircle2, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const PIE_COLORS = ["hsl(260,85%,65%)", "hsl(140,70%,45%)", "hsl(35,90%,60%)", "hsl(200,90%,60%)", "hsl(320,80%,60%)"];

function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    const duration = 900;
    const step = (end - start) / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if ((step > 0 && start >= end) || (step < 0 && start <= end)) {
        setDisplayed(end);
        clearInterval(timer);
      } else {
        setDisplayed(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{displayed.toFixed(decimals)}{suffix}</span>;
}

function StatCard({ label, value, sub, icon: Icon, color, isLoading }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="text-2xl font-bold text-foreground">{value}</p>
      )}
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

function InsightCard({ insight }: { insight: { id: string; type: string; message: string; severity: string } }) {
  const colors = {
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300",
    warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300",
    critical: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300",
  };
  const icons = {
    info: <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />,
    critical: <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />,
  };
  const sev = insight.severity as keyof typeof colors;
  return (
    <div className={cn("flex gap-3 p-3.5 rounded-lg border text-sm", colors[sev] || colors.info)}>
      {icons[sev] || icons.info}
      <p>{insight.message}</p>
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary();
  const { data: weeklyRev } = useGetWeeklyRevenue();
  const { data: clientDist } = useGetClientDistribution();
  const { data: insights, isLoading: insLoading } = useGetInsights();
  const { data: taskCompletion } = useGetTaskCompletion();

  const currency = summary?.currency ?? "USD";
  const currencySymbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";

  // Today's tasks
  const today = new Date().toISOString().split("T")[0];
  const { data: todayTasks } = useListTasks({ weekStart: today });
  const currentTasks = (todayTasks ?? []).filter(t => t.scheduledDate === today).slice(0, 4);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/planner">
          <Button size="sm" className="gap-2" data-testid="button-add-task">
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Weekly Revenue"
          value={sumLoading ? "—" : `${currencySymbol}${(summary?.weeklyRevenue ?? 0).toLocaleString()}`}
          icon={DollarSign}
          color="bg-primary/10 text-primary"
          isLoading={false}
          data-testid="stat-weekly-revenue"
        />
        <StatCard
          label="Monthly Goal"
          value={sumLoading ? "—" : `${summary?.monthlyGoalProgress ?? 0}%`}
          sub={`${currencySymbol}${(summary?.monthlyGoalCurrent ?? 0).toLocaleString()} / ${currencySymbol}${(summary?.monthlyGoalTarget ?? 0).toLocaleString()}`}
          icon={TrendingUp}
          color="bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400"
          isLoading={false}
        />
        <StatCard
          label="Pending Invoices"
          value={sumLoading ? "—" : `${currencySymbol}${(summary?.pendingInvoices ?? 0).toLocaleString()}`}
          icon={AlertTriangle}
          color="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
          isLoading={false}
        />
        <StatCard
          label="Active Clients"
          value={sumLoading ? "—" : String(summary?.activeClients ?? 0)}
          icon={Users}
          color="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
          isLoading={false}
        />
        <StatCard
          label="Hours This Week"
          value={sumLoading ? "—" : `${(summary?.hoursWorkedThisWeek ?? 0).toFixed(1)}h`}
          icon={Clock}
          color="bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
          isLoading={false}
        />
        <StatCard
          label="Productivity"
          value={sumLoading ? "—" : `${summary?.productivityScore ?? 0}`}
          sub={`${summary?.completedTasksThisWeek ?? 0}/${summary?.totalTasksThisWeek ?? 0} tasks done`}
          icon={Zap}
          color="bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"
          isLoading={false}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3 bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Weekly Revenue</h3>
              <p className="text-xs text-muted-foreground">Last 8 weeks</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyRev ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(260,85%,65%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(260,85%,65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${currencySymbol}${v}`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                formatter={(v: number) => [`${currencySymbol}${v.toLocaleString()}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(260,85%,65%)" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: "hsl(260,85%,65%)" }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Client distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 bg-card border border-border rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-1">Revenue by Client</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribution this year</p>
          {(clientDist && clientDist.length > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={clientDist} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="revenue" paddingAngle={2}>
                    {clientDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    formatter={(v: number) => [`${currencySymbol}${v.toLocaleString()}`, "Revenue"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {clientDist.slice(0, 4).map((c, i) => (
                  <div key={c.clientName} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-foreground font-medium truncate max-w-24">{c.clientName}</span>
                    </div>
                    <span className="text-muted-foreground">{c.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No income data yet</div>
          )}
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smart Insights */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Smart Insights</h3>
              <p className="text-xs text-muted-foreground">AI-powered recommendations</p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>
          {insLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-2.5">
              {(insights ?? []).slice(0, 3).map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Task completion */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Task Completion</h3>
              <p className="text-xs text-muted-foreground">Weekly completion rate</p>
            </div>
            <Link href="/planner">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={taskCompletion ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, "Completion"]}
              />
              <Bar dataKey="rate" fill="hsl(260,85%,65%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>

          {/* Today's tasks mini list */}
          {currentTasks.length > 0 && (
            <div className="mt-4 space-y-1.5 border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Today's tasks</p>
              {currentTasks.map(task => (
                <div key={task.id} className="flex items-center gap-2.5 text-xs">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    task.status === "completed" ? "bg-green-500" :
                    task.status === "in_progress" ? "bg-primary" :
                    task.status === "revision" ? "bg-amber-500" : "bg-muted-foreground/40"
                  )} />
                  <span className={cn("flex-1 truncate", task.status === "completed" && "line-through text-muted-foreground")}>
                    {task.title}
                  </span>
                  {task.estimatedHours && <span className="text-muted-foreground">{task.estimatedHours}h</span>}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
