import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import Overview from "./dashboard/Overview";
import Clients from "./dashboard/Clients";
import Invoices from "./dashboard/Invoices";
import RecurringInvoices from "./dashboard/RecurringInvoices";
import Settings from "./dashboard/Settings";
import Analytics from "./dashboard/Analytics";
import CustomBranding from "./dashboard/CustomBranding";
import FileUpload from "./dashboard/FileUpload";
import { HealthScore } from "@/components/ui/health-score";
import { calculateHealthScore } from "@/lib/health-score";

const updateSeo = (title: string, description: string) => {
  document.title = title;
  const ensure = (sel: string, create: () => HTMLElement) => {
    let el = document.head.querySelector(sel) as HTMLElement | null;
    if (!el) { el = create(); document.head.appendChild(el); }
    return el;
  };
  (ensure('meta[name="description"]', () => { const m = document.createElement('meta'); m.setAttribute('name','description'); return m; }) as HTMLMetaElement)
    .setAttribute('content', description);
  (ensure('link[rel="canonical"]', () => { const l = document.createElement('link'); l.setAttribute('rel','canonical'); return l; }) as HTMLLinkElement)
    .setAttribute('href', window.location.href);
};

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'overview';

  const sb = supabase as any;

  // User profile
  const userProfile = useQuery({
    queryKey: ["user-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Overall health score
  const healthScore = useQuery({
    queryKey: ["health-score", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: invoices, error } = await sb
        .from("invoices")
        .select("total, status, due_date")
        .eq("user_id", user!.id);

      if (error) throw error;

      const now = new Date();
      let overdueCount = 0;
      let totalInvoiced = 0;
      let totalPaid = 0;

      invoices?.forEach(invoice => {
        totalInvoiced += invoice.total;
        if (invoice.status === "paid") {
          totalPaid += invoice.total;
        } else if (invoice.status === "overdue") {
          overdueCount++;
        } else if (invoice.status === "sent" && invoice.due_date && new Date(invoice.due_date) < now) {
          overdueCount++;
        }
      });

      return calculateHealthScore(overdueCount, totalInvoiced, totalPaid);
    },
  });

  useEffect(() => {
    updateSeo(
      "Dashboard | HonestInvoice",
      "HonestInvoice dashboard: manage clients, invoices, and subscriptions."
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-4 border-b border-primary/20 flex items-center justify-between bg-gradient-to-r from-background to-primary/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">HI</span>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-primary">
                {userProfile.isLoading ? "Dashboard" : `Good ${new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, ${userProfile.data?.full_name || user?.email?.split('@')[0] || 'User'}.`}
              </h1>
              {healthScore.data && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">Cash Flow Health:</span>
                  <HealthScore score={healthScore.data.score} size="sm" showLabel />
                </div>
              )}
            </div>
          </div>
          <SubscriptionStatus />
        </div>
        <div>
          <Button variant="secondary" onClick={signOut}>Sign out</Button>
        </div>
      </header>

      <main>
        <Tabs defaultValue={defaultTab} className="container mx-auto px-4 py-8">
          <TabsList className="mb-8 flex flex-wrap gap-1 w-full max-w-6xl mx-auto h-auto p-1">
            <TabsTrigger value="overview" className="text-xs px-3 py-2 flex-shrink-0">Overview</TabsTrigger>
            <TabsTrigger value="clients" className="text-xs px-3 py-2 flex-shrink-0">Clients</TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs px-3 py-2 flex-shrink-0">Invoices</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs px-3 py-2 flex-shrink-0">Analytics</TabsTrigger>
            <TabsTrigger value="branding" className="text-xs px-3 py-2 flex-shrink-0">Branding</TabsTrigger>
            <TabsTrigger value="recurring" className="text-xs px-3 py-2 flex-shrink-0">Recurring</TabsTrigger>
            <TabsTrigger value="upload" className="text-xs px-3 py-2 flex-shrink-0">Upload</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs px-3 py-2 flex-shrink-0">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Overview />
          </TabsContent>
          <TabsContent value="clients">
            <Clients />
          </TabsContent>
          <TabsContent value="invoices">
            <Invoices />
          </TabsContent>
          <TabsContent value="analytics">
            <Analytics />
          </TabsContent>
          <TabsContent value="branding">
            <CustomBranding />
          </TabsContent>
          <TabsContent value="recurring">
            <RecurringInvoices />
          </TabsContent>
          <TabsContent value="upload">
            <FileUpload />
          </TabsContent>
          <TabsContent value="settings">
            <Settings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
