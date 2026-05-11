import { useState } from "react";
import { motion } from "framer-motion";
import { useListTasks, useCreateTask, useUpdateTask, useDeleteTask, useListClients, getListTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Clock, User, Flag, MoreHorizontal, Trash2, Edit2, X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUS_OPTIONS = ["todo", "in_progress", "waiting", "delivered", "revision", "completed"] as const;
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"] as const;

const statusColors: Record<string, string> = {
  todo: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  waiting: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  delivered: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
  revision: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
};

const priorityColors: Record<string, string> = {
  low: "text-zinc-400",
  medium: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

function getWeekStart(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

interface TaskFormData {
  title: string;
  clientId: string;
  scheduledDate: string;
  deadline: string;
  estimatedHours: string;
  actualHours: string;
  priority: string;
  status: string;
  notes: string;
}

const emptyForm: TaskFormData = {
  title: "",
  clientId: "",
  scheduledDate: "",
  deadline: "",
  estimatedHours: "",
  actualHours: "",
  priority: "medium",
  status: "todo",
  notes: "",
};

export default function Planner() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<null | { id: number }>(null);
  const [form, setForm] = useState<TaskFormData>(emptyForm);

  const weekStart = getWeekStart(weekOffset);
  const weekDays = getWeekDays(weekStart);
  const weekStartStr = formatDateStr(weekStart);

  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useListTasks({ weekStart: weekStartStr });
  const { data: clients } = useListClients();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ weekStart: weekStartStr }) });

  const openCreate = (date?: string) => {
    setEditingTask(null);
    setForm({ ...emptyForm, scheduledDate: date ?? weekStartStr });
    setModalOpen(true);
  };

  const openEdit = (task: NonNullable<typeof tasks>[0]) => {
    setEditingTask({ id: task.id });
    setForm({
      title: task.title,
      clientId: String(task.clientId ?? ""),
      scheduledDate: task.scheduledDate,
      deadline: task.deadline ?? "",
      estimatedHours: String(task.estimatedHours ?? ""),
      actualHours: String(task.actualHours ?? ""),
      priority: task.priority,
      status: task.status,
      notes: task.notes ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      title: form.title,
      clientId: form.clientId ? Number(form.clientId) : undefined,
      scheduledDate: form.scheduledDate,
      deadline: form.deadline || undefined,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      actualHours: form.actualHours ? Number(form.actualHours) : undefined,
      priority: form.priority,
      status: form.status,
      notes: form.notes || undefined,
    };
    if (editingTask) {
      await updateTask.mutateAsync({ id: editingTask.id, data: payload });
    } else {
      await createTask.mutateAsync({ data: payload });
    }
    invalidate();
    setModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    await deleteTask.mutateAsync({ id });
    invalidate();
  };

  const handleQuickStatus = async (id: number, status: string) => {
    await updateTask.mutateAsync({ id, data: { status } });
    invalidate();
  };

  const tasksByDay = (day: Date) =>
    (tasks ?? []).filter(t => t.scheduledDate === formatDateStr(day));

  const weekLabel = () => {
    if (weekOffset === 0) return "This Week";
    if (weekOffset === -1) return "Last Week";
    if (weekOffset === 1) return "Next Week";
    return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly Planner</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Plan and organize your work week</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setWeekOffset(o => o - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-2 min-w-28 text-center">{weekLabel()}</span>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setWeekOffset(o => o + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={() => openCreate()} className="gap-2" data-testid="button-add-task">
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {weekDays.map((day, idx) => {
          const isToday = formatDateStr(day) === formatDateStr(new Date());
          const dayTasks = tasksByDay(day);
          const totalHours = dayTasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
          return (
            <div key={idx} className={cn("rounded-xl border flex flex-col min-h-64 bg-card", isToday && "border-primary/50 ring-1 ring-primary/20")}>
              {/* Day header */}
              <div className={cn("px-3 py-2.5 border-b border-border flex items-center justify-between", isToday && "bg-primary/5")}>
                <div>
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", isToday ? "text-primary" : "text-muted-foreground")}>{DAYS[idx]}</p>
                  <p className={cn("text-lg font-bold", isToday ? "text-primary" : "text-foreground")}>{day.getDate()}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {totalHours > 0 && <span className="text-xs text-muted-foreground">{totalHours}h</span>}
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => openCreate(formatDateStr(day))}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Tasks */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                {isLoading ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="h-14 w-full rounded-lg" />
                  </div>
                ) : dayTasks.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-xs text-muted-foreground/50 text-center py-4">No tasks</p>
                  </div>
                ) : (
                  dayTasks.map(task => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group rounded-lg border border-border bg-background p-2.5 cursor-pointer hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start gap-1.5">
                        <button
                          onClick={() => handleQuickStatus(task.id, task.status === "completed" ? "todo" : "completed")}
                          className={cn(
                            "w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors",
                            task.status === "completed" ? "bg-green-500 border-green-500" : "border-border hover:border-primary"
                          )}
                        >
                          {task.status === "completed" && <Check className="w-2.5 h-2.5 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0" onClick={() => openEdit(task)}>
                          <p className={cn("text-xs font-medium leading-tight", task.status === "completed" && "line-through text-muted-foreground")}>
                            {task.title}
                          </p>
                          {task.clientName && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <User className="w-2.5 h-2.5" />{task.clientName}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className={cn("text-xs px-1.5 py-0.5 rounded-md font-medium", statusColors[task.status] || statusColors.todo)}>
                              {task.status.replace("_", " ")}
                            </span>
                            {task.estimatedHours && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />{task.estimatedHours}h
                              </span>
                            )}
                            <Flag className={cn("w-2.5 h-2.5", priorityColors[task.priority] || "text-muted-foreground")} />
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-5 h-5 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(task)}>
                              <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-destructive">
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task title *</Label>
              <Input
                data-testid="input-task-title"
                placeholder="What needs to be done?"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Scheduled date</Label>
                <Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Client</Label>
              <Select value={form.clientId || "none"} onValueChange={v => setForm(f => ({ ...f, clientId: v === "none" ? "" : v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="No client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {(clients ?? []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Est. hours</Label>
                <Input type="number" step="0.5" value={form.estimatedHours} onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))} className="mt-1.5" placeholder="2.5" />
              </div>
              <div>
                <Label>Actual hours</Label>
                <Input type="number" step="0.5" value={form.actualHours} onChange={e => setForm(f => ({ ...f, actualHours: e.target.value }))} className="mt-1.5" placeholder="3" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSubmit} disabled={!form.title || !form.scheduledDate || createTask.isPending || updateTask.isPending} className="flex-1" data-testid="button-save-task">
                {editingTask ? "Save changes" : "Create task"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
