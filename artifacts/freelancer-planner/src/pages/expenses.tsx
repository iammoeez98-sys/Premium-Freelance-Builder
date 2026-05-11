import { useState } from "react";
import { motion } from "framer-motion";
import { useListExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, getListExpensesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Receipt, MoreHorizontal, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];
const categories = ["Software", "Hardware", "Marketing", "Education", "Office", "Travel", "Health", "Subscriptions", "Freelance Help", "Taxes", "Other"];

const PIE_COLORS = ["hsl(260,85%,65%)", "hsl(140,70%,45%)", "hsl(35,90%,60%)", "hsl(200,90%,60%)", "hsl(320,80%,60%)", "hsl(0,84%,60%)", "hsl(170,70%,45%)"];

const csym = (c: string) => c === "EUR" ? "€" : c === "GBP" ? "£" : "$";

interface ExpenseForm {
  amount: string; currency: string; date: string; description: string; category: string; recurring: boolean;
}

const emptyForm: ExpenseForm = { amount: "", currency: "USD", date: new Date().toISOString().split("T")[0], description: "", category: "Software", recurring: false };

export default function Expenses() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [monthFilter, setMonthFilter] = useState("");

  const qc = useQueryClient();
  const { data: expenses, isLoading } = useListExpenses(monthFilter ? { month: monthFilter } : undefined);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListExpensesQueryKey(monthFilter ? { month: monthFilter } : undefined) });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (e: NonNullable<typeof expenses>[0]) => {
    setEditId(e.id);
    setForm({ amount: String(e.amount), currency: e.currency, date: e.date, description: e.description, category: e.category, recurring: e.recurring ?? false });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const payload = { amount: Number(form.amount), currency: form.currency, date: form.date, description: form.description, category: form.category, recurring: form.recurring };
    if (editId) await updateExpense.mutateAsync({ id: editId, data: payload });
    else await createExpense.mutateAsync({ data: payload });
    invalidate();
    setModalOpen(false);
  };

  const total = (expenses ?? []).reduce((s, e) => s + e.amount, 0);
  const recurring = (expenses ?? []).filter(e => e.recurring).reduce((s, e) => s + e.amount, 0);

  // Category breakdown for chart
  const categoryTotals = (expenses ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
  const chartData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your business costs</p>
        </div>
        <Button onClick={openCreate} className="gap-2" data-testid="button-add-expense">
          <Plus className="w-4 h-4" /> Add Expense
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-foreground">${total.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Recurring</p>
          <p className="text-2xl font-bold text-primary">${recurring.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">One-time</p>
          <p className="text-2xl font-bold text-foreground">${(total - recurring).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Expenses list */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Expense Entries</h2>
            <Input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-40 text-xs" />
          </div>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : (expenses ?? []).length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No expenses recorded</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {(expenses ?? []).map((exp, idx) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn("flex items-center gap-4 px-5 py-3.5 group hover:bg-muted/30 transition-colors", idx > 0 && "border-t border-border")}
                  data-testid={`row-expense-${exp.id}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{exp.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{exp.date}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{exp.category}</span>
                      {exp.recurring && <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">recurring</span>}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-foreground">{csym(exp.currency)}{exp.amount.toLocaleString()}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(exp)}><Edit2 className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={async () => { await deleteExpense.mutateAsync({ id: exp.id }); invalidate(); }} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Category chart */}
        {chartData.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-1">By Category</h2>
            <p className="text-xs text-muted-foreground mb-4">Expense distribution</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Amount"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {chartData.slice(0, 5).map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-foreground">{item.name}</span>
                  </div>
                  <span className="text-muted-foreground">${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? "Edit Expense" : "Add Expense"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Description *</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1.5" placeholder="What was this for?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="mt-1.5" placeholder="99" />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} className="rounded" />
              <span className="text-sm text-foreground">Recurring expense</span>
            </label>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSubmit} disabled={!form.description || !form.amount || !form.date} className="flex-1">
                {editId ? "Save" : "Add expense"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
