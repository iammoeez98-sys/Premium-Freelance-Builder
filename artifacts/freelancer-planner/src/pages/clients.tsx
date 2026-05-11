import { useState } from "react";
import { motion } from "framer-motion";
import { useListClients, useCreateClient, useUpdateClient, useDeleteClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Trash2, Edit2, Mail, Globe, DollarSign, Briefcase, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["lead", "active", "waiting", "completed", "ghosted"] as const;

const statusStyles: Record<string, string> = {
  lead: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  active: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  waiting: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  completed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  ghosted: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];
const projectTypes = ["UI/UX Design", "Web Development", "Video Editing", "Copywriting", "Brand Identity", "Social Media", "Motion Design", "Consulting", "Other"];

interface ClientForm {
  name: string; company: string; email: string; country: string;
  projectType: string; rate: string; currency: string;
  paymentStatus: string; status: string; lastContactDate: string; notes: string;
}

const emptyForm: ClientForm = {
  name: "", company: "", email: "", country: "", projectType: "",
  rate: "", currency: "USD", paymentStatus: "pending", status: "active",
  lastContactDate: "", notes: "",
};

export default function Clients() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);

  const qc = useQueryClient();
  const { data: clients, isLoading } = useListClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListClientsQueryKey() });

  const filtered = (clients ?? []).filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.company?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c: NonNullable<typeof clients>[0]) => {
    setEditId(c.id);
    setForm({
      name: c.name, company: c.company ?? "", email: c.email ?? "",
      country: c.country ?? "", projectType: c.projectType ?? "",
      rate: String(c.rate ?? 0), currency: c.currency ?? "USD",
      paymentStatus: c.paymentStatus ?? "pending", status: c.status ?? "active",
      lastContactDate: c.lastContactDate ?? "", notes: c.notes ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const payload = { ...form, rate: Number(form.rate) || 0 };
    if (editId) {
      await updateClient.mutateAsync({ id: editId, data: payload });
    } else {
      await createClient.mutateAsync({ data: payload });
    }
    invalidate();
    setModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    await deleteClient.mutateAsync({ id });
    invalidate();
  };

  const currencySymbol = (c: string) => c === "EUR" ? "€" : c === "GBP" ? "£" : "$";

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your client relationships</p>
        </div>
        <Button onClick={openCreate} className="gap-2" data-testid="button-add-client">
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-clients"
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...STATUS_OPTIONS].map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="capitalize text-xs"
              data-testid={`filter-${s}`}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {["active", "lead", "waiting", "ghosted"].map(s => {
          const count = (clients ?? []).filter(c => c.status === s).length;
          return (
            <div key={s} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-medium text-muted-foreground capitalize">{s}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Client cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No clients found. Add your first client.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => (
            <motion.div
              key={client.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="group bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
              data-testid={`card-client-${client.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {client.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{client.name}</p>
                    {client.company && <p className="text-xs text-muted-foreground">{client.company}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", statusStyles[client.status] || "bg-zinc-100 text-zinc-600")}>
                    {client.status}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(client)}><Edit2 className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Earned</p>
                  <p className="text-sm font-semibold text-foreground">{currencySymbol(client.currency)}{(client.totalEarned ?? 0).toLocaleString()}</p>
                </div>
                <div className="text-center border-x border-border">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-sm font-semibold text-amber-600">{currencySymbol(client.currency)}{(client.outstandingAmount ?? 0).toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Projects</p>
                  <p className="text-sm font-semibold text-foreground">{client.projectsCompleted}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                {client.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /><span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.projectType && (
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3" /><span>{client.projectType}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3 h-3" />
                  <span>{currencySymbol(client.currency)}{client.rate}/hr</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Client" : "New Client"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input data-testid="input-client-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1.5" placeholder="Client name" />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="mt-1.5" placeholder="Company name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="mt-1.5" placeholder="USA" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Project type</Label>
                <Select value={form.projectType || "none"} onValueChange={v => setForm(f => ({ ...f, projectType: v === "none" ? "" : v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projectTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hourly rate</Label>
                <Input type="number" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} className="mt-1.5" placeholder="100" />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Last contact date</Label>
              <Input type="date" value={form.lastContactDate} onChange={e => setForm(f => ({ ...f, lastContactDate: e.target.value }))} className="mt-1.5" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1.5 resize-none" rows={3} placeholder="Internal notes..." />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || createClient.isPending || updateClient.isPending} className="flex-1" data-testid="button-save-client">
              {editId ? "Save changes" : "Add client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
