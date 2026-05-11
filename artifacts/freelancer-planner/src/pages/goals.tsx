import { useState } from "react";
import { motion } from "framer-motion";
import { useListGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, getListGoalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Target, MoreHorizontal, Trash2, Edit2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const categories = ["financial", "client", "skill", "productivity", "personal", "other"];
const statusOptions = ["not_started", "in_progress", "completed", "paused"];

const categoryColors: Record<string, string> = {
  financial: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  client: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  skill: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  productivity: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  personal: "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300",
  other: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const statusColors: Record<string, string> = {
  not_started: "text-muted-foreground",
  in_progress: "text-primary",
  completed: "text-green-600 dark:text-green-400",
  paused: "text-amber-600 dark:text-amber-400",
};

interface GoalForm {
  title: string; description: string; category: string; status: string; progress: string; deadline: string;
}
const emptyForm: GoalForm = { title: "", description: "", category: "skill", status: "not_started", progress: "0", deadline: "" };

export default function Goals() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm);
  const [catFilter, setCatFilter] = useState("all");

  const qc = useQueryClient();
  const { data: goals, isLoading } = useListGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListGoalsQueryKey() });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (g: NonNullable<typeof goals>[0]) => {
    setEditId(g.id);
    setForm({ title: g.title, description: g.description ?? "", category: g.category, status: g.status, progress: String(g.progress ?? 0), deadline: g.deadline ?? "" });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const payload = { title: form.title, description: form.description || undefined, category: form.category, status: form.status, progress: Number(form.progress), deadline: form.deadline || undefined };
    if (editId) await updateGoal.mutateAsync({ id: editId, data: payload });
    else await createGoal.mutateAsync({ data: payload });
    invalidate();
    setModalOpen(false);
  };

  const handleQuickComplete = async (g: NonNullable<typeof goals>[0]) => {
    const newStatus = g.status === "completed" ? "in_progress" : "completed";
    const newProgress = newStatus === "completed" ? 100 : (g.progress ?? 0);
    await updateGoal.mutateAsync({ id: g.id, data: { status: newStatus, progress: newProgress } });
    invalidate();
  };

  const filtered = (goals ?? []).filter(g => catFilter === "all" || g.category === catFilter);
  const completed = (goals ?? []).filter(g => g.status === "completed").length;
  const inProgress = (goals ?? []).filter(g => g.status === "in_progress").length;
  const avgProgress = goals && goals.length > 0 ? Math.round(goals.reduce((s, g) => s + (g.progress ?? 0), 0) / goals.length) : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Goals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your professional and personal growth</p>
        </div>
        <Button onClick={openCreate} className="gap-2" data-testid="button-add-goal">
          <Plus className="w-4 h-4" /> Add Goal
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">{completed}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">In Progress</p>
          <p className="text-2xl font-bold text-primary">{inProgress}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Avg Progress</p>
          <p className="text-2xl font-bold text-foreground">{avgProgress}%</p>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 flex-wrap">
        {["all", ...categories].map(c => (
          <Button key={c} variant={catFilter === c ? "default" : "outline"} size="sm" onClick={() => setCatFilter(c)} className="capitalize text-xs">
            {c}
          </Button>
        ))}
      </div>

      {/* Goals grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No goals yet. Set your first goal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(goal => (
            <motion.div
              key={goal.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "group bg-card border rounded-xl p-5 transition-colors",
                goal.status === "completed" ? "border-green-200 dark:border-green-900/40" : "border-border hover:border-primary/30"
              )}
              data-testid={`card-goal-${goal.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button onClick={() => handleQuickComplete(goal)} className="flex-shrink-0">
                    {goal.status === "completed"
                      ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                      : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                    }
                  </button>
                  <h3 className={cn("text-sm font-semibold text-foreground leading-tight", goal.status === "completed" && "line-through text-muted-foreground")}>
                    {goal.title}
                  </h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100 flex-shrink-0">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(goal)}><Edit2 className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => { await deleteGoal.mutateAsync({ id: goal.id }); invalidate(); }} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {goal.description && <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">{goal.description}</p>}

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className={cn("font-medium", statusColors[goal.status] || "text-foreground")}>{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} className="h-1.5" />
              </div>

              <div className="flex items-center justify-between">
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", categoryColors[goal.category] || categoryColors.other)}>
                  {goal.category}
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium capitalize", statusColors[goal.status] || "text-muted-foreground")}>
                    {goal.status.replace("_", " ")}
                  </span>
                  {goal.deadline && <span className="text-xs text-muted-foreground">· {goal.deadline}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Edit Goal" : "New Goal"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Goal title *</Label>
              <Input data-testid="input-goal-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1.5" placeholder="What do you want to achieve?" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1.5 resize-none" rows={2} placeholder="Why does this matter?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Progress ({form.progress}%)</Label>
                <input type="range" min="0" max="100" value={form.progress} onChange={e => setForm(f => ({ ...f, progress: e.target.value }))} className="w-full mt-2 accent-primary" />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="mt-1.5" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSubmit} disabled={!form.title} className="flex-1" data-testid="button-save-goal">
                {editId ? "Save" : "Create goal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
