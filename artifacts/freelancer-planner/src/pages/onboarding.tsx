import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetProfileQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, ArrowRight, CheckCircle2, User, Briefcase, DollarSign, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const professions = [
  "UI/UX Designer", "Web Developer", "Video Editor", "Social Media Manager",
  "Copywriter", "Photographer", "Graphic Designer", "Motion Designer",
  "Content Creator", "Brand Strategist", "Other"
];

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SGD", "INR"];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const steps = [
  { title: "Who are you?", subtitle: "Let's personalize your workspace", icon: User },
  { title: "Your craft", subtitle: "Tell us about your freelance work", icon: Briefcase },
  { title: "Your goals", subtitle: "Set your income targets", icon: DollarSign },
  { title: "Your schedule", subtitle: "How do you structure your week?", icon: Clock },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createProfile = useCreateProfile();

  const [form, setForm] = useState({
    name: "",
    profession: "",
    niche: "",
    monthlyGoal: "",
    weeklyHours: "40",
    currency: "USD",
    workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  });

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const toggleDay = (day: string) => {
    set("workDays", form.workDays.includes(day)
      ? form.workDays.filter(d => d !== day)
      : [...form.workDays, day]);
  };

  const canAdvance = () => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return form.profession && form.niche.trim().length > 0;
    if (step === 2) return Number(form.monthlyGoal) > 0;
    if (step === 3) return form.workDays.length > 0 && Number(form.weeklyHours) > 0;
    return true;
  };

  const handleSubmit = async () => {
    await createProfile.mutateAsync({
      data: {
        name: form.name,
        profession: form.profession,
        niche: form.niche,
        monthlyGoal: Number(form.monthlyGoal),
        weeklyHours: Number(form.weeklyHours),
        currency: form.currency,
        workDays: form.workDays,
        weekStartDay: "Monday",
        darkMode: false,
      }
    });
    queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
    localStorage.setItem("freelanceos_session", "true");
    setLocation("/");
  };

  const slideVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">FreelanceOS</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Set up your workspace</h1>
          <p className="text-muted-foreground mt-2">Takes about 60 seconds. Your professional command center awaits.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                i < step ? "bg-primary text-primary-foreground" :
                i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                "bg-muted text-muted-foreground"
              )}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn("w-8 h-0.5 transition-all duration-300", i < step ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">{steps[step].title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{steps[step].subtitle}</p>
              </div>

              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Your full name</Label>
                    <Input
                      id="name"
                      data-testid="input-name"
                      placeholder="e.g. Alex Morgan"
                      value={form.name}
                      onChange={e => set("name", e.target.value)}
                      className="mt-1.5"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label>Your profession</Label>
                    <Select value={form.profession} onValueChange={v => set("profession", v)}>
                      <SelectTrigger data-testid="select-profession" className="mt-1.5">
                        <SelectValue placeholder="Select your profession" />
                      </SelectTrigger>
                      <SelectContent>
                        {professions.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="niche">Your main niche or specialty</Label>
                    <Input
                      id="niche"
                      data-testid="input-niche"
                      placeholder="e.g. SaaS product design, e-commerce websites"
                      value={form.niche}
                      onChange={e => set("niche", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label>Currency</Label>
                    <Select value={form.currency} onValueChange={v => set("currency", v)}>
                      <SelectTrigger data-testid="select-currency" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="monthly-goal">Monthly income goal</Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                        {form.currency}
                      </span>
                      <Input
                        id="monthly-goal"
                        data-testid="input-monthly-goal"
                        type="number"
                        placeholder="4000"
                        value={form.monthlyGoal}
                        onChange={e => set("monthlyGoal", e.target.value)}
                        className="pl-14"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">This is your target, not a limit. Start ambitious.</p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <Label>Weekly working hours</Label>
                    <Input
                      data-testid="input-weekly-hours"
                      type="number"
                      placeholder="40"
                      value={form.weeklyHours}
                      onChange={e => set("weeklyHours", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Preferred work days</Label>
                    <div className="flex gap-2 flex-wrap">
                      {days.map(day => (
                        <button
                          key={day}
                          data-testid={`day-${day.toLowerCase()}`}
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
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
                Back
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance()}
                className="flex-1"
                data-testid="button-next"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canAdvance() || createProfile.isPending}
                className="flex-1"
                data-testid="button-finish"
              >
                {createProfile.isPending ? "Setting up..." : "Launch my workspace"}
                {!createProfile.isPending && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Everything is stored locally in your database. Private by design.
        </p>
      </div>
    </div>
  );
}
