import { useState } from "react";
import { motion } from "framer-motion";
import {
  useListIncome, useCreateIncome, useUpdateIncome, useDeleteIncome,
  useListIncomeGoals, useCreateIncomeGoal, useUpdateIncomeGoal, useDeleteIncomeGoal,
  useListClients, getListIncomeQueryKey, getListIncomeGoalsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, TrendingUp, DollarSign, Target, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];
const paymentStatuses = ["paid", "pending", "overdue"] as const;
const periodOptions = ["weekly", "monthly", "quarterly"] as const;

const paymentStatusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  overdue: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

const csym = (c: string) => c === "EUR" ? "€" : c === "GBP" ? "£" : "$";

export default function Income() {
  const [incomeModal, setIncomeModal] = useState(false);
  const [goalModal, setGoalModal] = useState(false);
  const [editIncomeId, setEditIncomeId] = useState<number | null>(null);
  const [editGoalId, setEditGoalId] = useState<number | null>(null);
  const [monthFilter, setMonthFilter] = useState("");

  const [incomeForm, setIncomeForm] = useState({ amount: "", currency: "USD", date: "", description: "", clientId: "", invoiceNumber: "", paymentStatus: "paid" });
  const [goalForm, setGoalForm] = useState({ period: "monthly", targetAmount: "", currency: "USD", periodLabel: "" });

  const qc = useQueryClient();
  const { data: income, isLoading } = useListIncome(monthFilter ? { month: monthFilter } : undefined);
  const { data: goals, isLoading: goalsLoading } = useListIncomeGoals();
  const { data: clients } = useListClients();

  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();
  const deleteIncome = useDeleteIncome();
  const createGoal = useCreateIncomeGoal();
  const updateGoal = useUpdateIncomeGoal();
  const deleteGoal = useDeleteIncomeGoal();

  const invalidateIncome = () => qc.invalidateQueries({ queryKey: getListIncomeQueryKey(monthFilter ? { month: monthFilter } : undefined) });
  const invalidateGoals = () => qc.invalidateQueries({ queryKey: getListIncomeGoalsQueryKey() });

  const openCreateIncome = () => {
    setEditIncomeId(null);
    setIncomeForm({ amount: "", currency: "USD", date: new Date().toISOString().split("T")[0], description: "", clientId: "", invoiceNumber: "", paymentStatus: "paid" });
    setIncomeModal(true);
  };
  const openEditIncome = (i: NonNullable<typeof income>[0]) => {
    setEditIncomeId(i.id);
    setIncomeForm({ amount: String(i.amount), currency: i.currency, date: i.date, description: i.description, clientId: String(i.clientId ?? ""), invoiceNumber: i.invoiceNumber ?? "", paymentStatus: i.paymentStatus ?? "paid" });
    setIncomeModal(true);
  };

  const openCreateGoal = () => { setEditGoalId(null); setGoalForm({ period: "monthly", targetAmount: "", currency: "USD", periodLabel: "" }); setGoalModal(true); };
  const openEditGoal = (g: NonNullable<typeof goals>[0]) => {
    setEditGoalId(g.id);
    setGoalForm({ period: g.period, targetAmount: String(g.targetAmount), currency: g.currency, periodLabel: g.periodLabel ?? "" });
    setGoalModal(true);
  };

  const handleIncomeSubmit = async () => {
    const payload = { amount: Number(incomeForm.amount), currency: incomeForm.currency, date: incomeForm.date, description: incomeForm.description, clientId: incomeForm.clientId ? Number(incomeForm.clientId) : undefined, invoiceNumber: incomeForm.invoiceNumber || undefined, paymentStatus: incomeForm.paymentStatus };
    if (editIncomeId) await updateIncome.mutateAsync({ id: editIncomeId, data: payload });
    else await createIncome.mutateAsync({ data: payload });
    invalidateIncome();
    setIncomeModal(false);
  };

  const handleGoalSubmit = async () => {
    const payload = { period: goalForm.period, targetAmount: Number(goalForm.targetAmount), currency: goalForm.currency, periodLabel: goalForm.periodLabel || undefined };
    if (editGoalId) await updateGoal.mutateAsync({ id: editGoalId, data: payload });
    else await createGoal.mutateAsync({ data: payload });
    invalidateGoals();
    setGoalModal(false);
  };

  const totalPaid = (income ?? []).filter(i => i.paymentStatus === "paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = (income ?? []).filter(i => i.paymentStatus === "pending").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = (income ?? []).filter(i => i.paymentStatus === "overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Income & Goals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track revenue and hit your financial targets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCreateGoal} className="gap-2 text-sm">
            <Target className="w-4 h-4" /> Set Goal
          </Button>
          <Button onClick={openCreateIncome} className="gap-2" data-testid="button-add-income">
            <Plus className="w-4 h-4" /> Add Income
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Paid</p>
          <p className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-600">${totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Overdue</p>
          <p className="text-2xl font-bold text-red-600">${totalOverdue.toLocaleString()}</p>
        </div>
      </div>

      {/* Goals */}
      {(goals && goals.length > 0) && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Income Goals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {goals.map(goal => {
              const currentAmount = goal.currentAmount ?? 0;
              const pct = goal.targetAmount > 0 ? Math.min(Math.round((currentAmount / goal.targetAmount) * 100), 100) : 0;
              return (
                <motion.div key={goal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl p-5 group relative">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground capitalize">{goal.period} Goal</p>
                      {goal.periodLabel && <p className="text-xs text-muted-foreground">{goal.periodLabel}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditGoal(goal)}><Edit2 className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => { await deleteGoal.mutateAsync({ id: goal.id }); invalidateGoals(); }} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-end justify-between mb-1.5">
                      <p className="text-xl font-bold text-foreground">{csym(goal.currency)}{currentAmount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">of {csym(goal.currency)}{goal.targetAmount.toLocaleString()}</p>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                  <p className="text-xs font-medium" style={{ color: pct >= 100 ? "hsl(140,70%,45%)" : pct >= 50 ? "hsl(35,90%,50%)" : "hsl(0,84%,60%)" }}>
                    {pct}% complete
                    {pct < 100 && ` · ${csym(goal.currency)}${(goal.targetAmount - currentAmount).toLocaleString()} to go`}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Income list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Income Entries</h2>
          <Input
            type="month"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="w-40 text-xs"
          />
        </div>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : (income ?? []).length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No income recorded yet</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {(income ?? []).map((i, idx) => (
              <motion.div
                key={i.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn("flex items-center gap-4 px-5 py-3.5 group hover:bg-muted/30 transition-colors", idx > 0 && "border-t border-border")}
                data-testid={`row-income-${i.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{i.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.date} {i.clientName && `· ${i.clientName}`} {i.invoiceNumber && `· ${i.invoiceNumber}`}
                  </p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", paymentStatusColors[i.paymentStatus ?? ""] || "bg-zinc-100 text-zinc-600")}>
                  {i.paymentStatus}
                </span>
                <p className="text-sm font-bold text-foreground w-24 text-right">{csym(i.currency)}{i.amount.toLocaleString()}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditIncome(i)}><Edit2 className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => { await deleteIncome.mutateAsync({ id: i.id }); invalidateIncome(); }} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Income Modal */}
      <Dialog open={incomeModal} onOpenChange={setIncomeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editIncomeId ? "Edit Income" : "Add Income"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Description *</Label>
              <Input value={incomeForm.description} onChange={e => setIncomeForm(f => ({ ...f, description: e.target.value }))} className="mt-1.5" placeholder="Project payment, invoice description..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount *</Label>
                <Input type="number" value={incomeForm.amount} onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} className="mt-1.5" placeholder="1000" />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={incomeForm.currency} onValueChange={v => setIncomeForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={incomeForm.date} onChange={e => setIncomeForm(f => ({ ...f, date: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={incomeForm.paymentStatus} onValueChange={v => setIncomeForm(f => ({ ...f, paymentStatus: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Client</Label>
                <Select value={incomeForm.clientId || "none"} onValueChange={v => setIncomeForm(f => ({ ...f, clientId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="No client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {(clients ?? []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Invoice #</Label>
                <Input value={incomeForm.invoiceNumber} onChange={e => setIncomeForm(f => ({ ...f, invoiceNumber: e.target.value }))} className="mt-1.5" placeholder="INV-001" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIncomeModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleIncomeSubmit} disabled={!incomeForm.description || !incomeForm.amount || !incomeForm.date} className="flex-1">
                {editIncomeId ? "Save" : "Add income"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goal Modal */}
      <Dialog open={goalModal} onOpenChange={setGoalModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editGoalId ? "Edit Goal" : "Set Income Goal"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Period</Label>
              <Select value={goalForm.period} onValueChange={v => setGoalForm(f => ({ ...f, period: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{periodOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Target amount *</Label>
                <Input type="number" value={goalForm.targetAmount} onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))} className="mt-1.5" placeholder="4000" />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={goalForm.currency} onValueChange={v => setGoalForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input value={goalForm.periodLabel} onChange={e => setGoalForm(f => ({ ...f, periodLabel: e.target.value }))} className="mt-1.5" placeholder="e.g. May 2026" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setGoalModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleGoalSubmit} disabled={!goalForm.targetAmount} className="flex-1">
                {editGoalId ? "Save" : "Set goal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
