import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetProfileQueryKey } from "@workspace/api-client-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { User, DollarSign, Clock, Moon, Sun, Monitor, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const professions = ["UI/UX Designer", "Web Developer", "Video Editor", "Social Media Manager", "Copywriter", "Photographer", "Graphic Designer", "Motion Designer", "Content Creator", "Brand Strategist", "Other"];
const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SGD", "INR"];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Settings() {
  const { data: profile, isLoading } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: "", profession: "", niche: "", monthlyGoal: "", weeklyHours: "", currency: "USD",
    workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"], weekStartDay: "Monday", darkMode: false,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name,
        profession: profile.profession,
        niche: profile.niche ?? "",
        monthlyGoal: String(profile.monthlyGoal),
        weeklyHours: String(profile.weeklyHours),
        currency: profile.currency,
        workDays: profile.workDays as string[],
        weekStartDay: profile.weekStartDay ?? "Monday",
        darkMode: profile.darkMode ?? false,
      });
    }
  }, [profile]);

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      workDays: f.workDays.includes(day) ? f.workDays.filter(d => d !== day) : [...f.workDays, day],
    }));
  };

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      data: {
        name: form.name,
        profession: form.profession,
        niche: form.niche || undefined,
        monthlyGoal: Number(form.monthlyGoal),
        weeklyHours: Number(form.weeklyHours),
        currency: form.currency,
        workDays: form.workDays,
        weekStartDay: form.weekStartDay,
        darkMode: form.darkMode,
      }
    });
    qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace preferences</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className={cn("gap-2 transition-all", saved && "bg-green-600 hover:bg-green-700")}
          data-testid="button-save-settings"
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save changes</>}
        </Button>
      </div>

      {/* Profile */}
      <Section title="Profile" icon={User}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1.5" data-testid="input-settings-name" />
            </div>
            <div>
              <Label>Profession</Label>
              <Select value={form.profession} onValueChange={v => setForm(f => ({ ...f, profession: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{professions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Niche / specialty</Label>
            <Input value={form.niche} onChange={e => setForm(f => ({ ...f, niche: e.target.value }))} className="mt-1.5" placeholder="e.g. SaaS product design" />
          </div>
        </div>
      </Section>

      {/* Financial */}
      <Section title="Financial Goals" icon={DollarSign}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Monthly income goal</Label>
              <Input type="number" value={form.monthlyGoal} onChange={e => setForm(f => ({ ...f, monthlyGoal: e.target.value }))} className="mt-1.5" placeholder="4000" />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Section>

      {/* Schedule */}
      <Section title="Work Schedule" icon={Clock}>
        <div className="space-y-4">
          <div>
            <Label>Weekly working hours</Label>
            <Input type="number" value={form.weeklyHours} onChange={e => setForm(f => ({ ...f, weeklyHours: e.target.value }))} className="mt-1.5 w-32" placeholder="40" />
          </div>
          <div>
            <Label className="mb-2 block">Work days</Label>
            <div className="flex gap-2 flex-wrap">
              {days.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    form.workDays.includes(day)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/50"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Week starts on</Label>
            <Select value={form.weekStartDay} onValueChange={v => setForm(f => ({ ...f, weekStartDay: v }))}>
              <SelectTrigger className="mt-1.5 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Monday">Monday</SelectItem>
                <SelectItem value="Sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" icon={Moon}>
        <div className="space-y-4">
          <Label>Theme</Label>
          <div className="grid grid-cols-3 gap-3 mt-1.5">
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value as "light" | "dark" | "system")}
                className={cn(
                  "flex flex-col items-center gap-2 py-4 rounded-xl border text-sm font-medium transition-all",
                  theme === value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/40"
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
