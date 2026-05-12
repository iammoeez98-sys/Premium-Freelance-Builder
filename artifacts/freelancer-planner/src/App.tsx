import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetProfile } from "@workspace/api-client-react";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

// Layout & Components
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/theme-provider";

// Pages
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import Planner from "@/pages/planner";
import Clients from "@/pages/clients";
import Income from "@/pages/income";
import Expenses from "@/pages/expenses";
import Goals from "@/pages/goals";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { data: profile, isLoading, error } = useGetProfile();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && error) {
      // No profile in DB → go to onboarding
      localStorage.removeItem("freelanceos_session");
      setLocation("/onboarding");
      return;
    }
    if (!isLoading && profile) {
      // Profile exists → ensure session flag is set (handles existing users)
      localStorage.setItem("freelanceos_session", "true");
    }
  }, [isLoading, error, profile, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return null;
  }

  return (
    <AppLayout>
      <Component {...rest} />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/planner">
        <ProtectedRoute component={Planner} />
      </Route>
      <Route path="/clients">
        <ProtectedRoute component={Clients} />
      </Route>
      <Route path="/income">
        <ProtectedRoute component={Income} />
      </Route>
      <Route path="/expenses">
        <ProtectedRoute component={Expenses} />
      </Route>
      <Route path="/goals">
        <ProtectedRoute component={Goals} />
      </Route>
      <Route path="/analytics">
        <ProtectedRoute component={Analytics} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="freelancer-planner-theme">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
