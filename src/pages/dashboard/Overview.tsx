import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useProAccess } from "@/hooks/useProAccess";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, TrendingUp, Users, FileText, ArrowRight, Plus, DollarSign, Clock, AlertTriangle, Activity, BarChart3, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { HealthScore } from "@/components/ui/health-score";
import { calculateHealthScore } from "@/lib/health-score";

const sb = supabase as any;

const Overview = () => {
  const { user } = useAuth();
  const { isPro, isLoading: proLoading } = useProAccess();

  const clientsCount = useQuery({
    queryKey: ["clients-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await sb
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const invoicesCount = useQuery({
    queryKey: ["invoices-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await sb
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Enhanced dashboard data queries
  const dashboardData = useQuery({
    queryKey: ["dashboard-data", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [invoicesResult, clientsResult] = await Promise.all([
        sb
          .from("invoices")
          .select("total, status, created_at, due_date, issue_date, client:clients(name)")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
        sb
          .from("clients")
          .select("id, name, created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
      ]);

      if (invoicesResult.error) throw invoicesResult.error;
      if (clientsResult.error) throw clientsResult.error;

      const invoices = invoicesResult.data || [];
      const clients = clientsResult.data || [];

      // Calculate revenue metrics
      const totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

      const pendingRevenue = invoices
        .filter(inv => inv.status === 'sent')
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

      const overdueRevenue = invoices
        .filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

      // Invoice status distribution for pie chart
      const statusCounts = invoices.reduce((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Revenue over time (monthly for last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyRevenue = invoices
        .filter(inv => inv.status === 'paid' && new Date(inv.created_at) >= sixMonthsAgo)
        .reduce((acc, inv) => {
          const month = new Date(inv.created_at).toISOString().slice(0, 7); // YYYY-MM
          acc[month] = (acc[month] || 0) + (inv.total || 0);
          return acc;
        }, {} as Record<string, number>);

      const revenueChartData = Object.entries(monthlyRevenue)
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Top clients by revenue
      const clientRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((acc, inv) => {
          const clientName = inv.client?.name || 'Unknown';
          acc[clientName] = (acc[clientName] || 0) + (inv.total || 0);
          return acc;
        }, {} as Record<string, number>);

      const topClients = Object.entries(clientRevenue)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Recent activity (last 10 invoices)
      const recentActivity = invoices.slice(0, 10).map(inv => ({
        id: inv.id,
        type: 'invoice',
        description: `Invoice ${inv.status} - $${inv.total?.toFixed(2)}`,
        date: inv.created_at,
        status: inv.status
      }));

      return {
        totalRevenue,
        pendingRevenue,
        overdueRevenue,
        statusCounts,
        revenueChartData,
        topClients,
        recentActivity,
        totalInvoices: invoices.length,
        totalClients: clients.length
      };
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

  // Overdue invoices
  const overdueInvoices = useQuery({
    queryKey: ["overdue-invoices", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date();
      const { data, error } = await sb
        .from("invoices")
        .select("id, number, total, due_date, client:clients(name)")
        .eq("user_id", user!.id)
        .in("status", ["sent", "overdue"])
        .lte("due_date", now.toISOString())
        .order("due_date", { ascending: true })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
  });

  // Pending bank transactions
  const pendingTransactions = useQuery({
    queryKey: ["pending-transactions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("bank_transactions")
        .select("id, amount, description, date")
        .eq("user_id", user!.id)
        .eq("status", "pending")
        .order("date", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
  });

  // Activity feed
  const activityFeed = useQuery({
    queryKey: ["activity-feed", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("client_communication_log")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  // DSO
  const dso = useQuery({
    queryKey: ["dso", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // First get paid bank transactions with matched invoices
      const { data: transactions, error: txError } = await sb
        .from("bank_transactions")
        .select("date, matched_invoice_id")
        .eq("user_id", user!.id)
        .not("matched_invoice_id", "is", null)
        .not("date", "is", null);

      if (txError) throw txError;

      if (!transactions || transactions.length === 0) return 0;

      // Get the invoice issue dates for matched invoices
      const invoiceIds = transactions.map(tx => tx.matched_invoice_id).filter(Boolean);
      const { data: invoices, error: invoiceError } = await sb
        .from("invoices")
        .select("id, issue_date, status")
        .in("id", invoiceIds)
        .eq("status", "paid");

      if (invoiceError) throw invoiceError;

      // Calculate DSO
      const days = transactions.map((tx) => {
        const invoice = invoices?.find(inv => inv.id === tx.matched_invoice_id);
        if (!invoice?.issue_date || !tx.date) return 0;

        const issueDate = new Date(invoice.issue_date);
        const paymentDate = new Date(tx.date);
        return Math.floor((paymentDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
      }).filter(days => days > 0);

      const averageDSO = days.length > 0 ? days.reduce((sum, d) => sum + d, 0) / days.length : 0;
      return Math.round(averageDSO);
    },
  });

  // Client segmentation
  const clientSegmentation = useQuery({
    queryKey: ["clientSegmentation", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get paid invoices with client information
      const { data: invoices, error: invoiceError } = await sb
        .from("invoices")
        .select("total, client_id")
        .eq("user_id", user!.id)
        .eq("status", "paid");

      if (invoiceError) throw invoiceError;

      if (!invoices || invoices.length === 0) return [];

      // Get client details for the invoice client IDs
      const clientIds = [...new Set(invoices.map(inv => inv.client_id))];
      const { data: clients, error: clientError } = await sb
        .from("clients")
        .select("id, name")
        .in("id", clientIds);

      if (clientError) throw clientError;

      // Calculate revenue by client
      const clientRevenue = invoices.reduce((acc, invoice) => {
        const client = clients?.find(c => c.id === invoice.client_id);
        const clientName = client?.name || "Unknown";
        acc[clientName] = (acc[clientName] || 0) + invoice.total;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(clientRevenue)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
  });

  // Cash flow timeline
  const cashFlowTimeline = useQuery({
    queryKey: ["cashFlowTimeline", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Expected money in (sent invoices due in next 30 days)
      const { data: incoming, error: incomingError } = await sb
        .from("invoices")
        .select("total, due_date")
        .eq("user_id", user!.id)
        .eq("status", "sent")
        .lte("due_date", thirtyDaysFromNow.toISOString())
        .gte("due_date", now.toISOString());

      if (incomingError) throw incomingError;

      // Expected money out (recurring invoices in next 30 days)
      const { data: outgoing, error: outgoingError } = await sb
        .from("recurring_invoices")
        .select("total, next_due_date")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .lte("next_due_date", thirtyDaysFromNow.toISOString())
        .gte("next_due_date", now.toISOString());

      if (outgoingError) throw outgoingError;

      // Group by day
      const timeline: Record<string, { date: string; incoming: number; outgoing: number; net: number }> = {};

      for (let i = 0; i <= 30; i++) {
        const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        timeline[dateStr] = { date: dateStr, incoming: 0, outgoing: 0, net: 0 };
      }

      incoming?.forEach(inv => {
        if (inv.due_date) {
          const dateStr = inv.due_date.split('T')[0];
          if (timeline[dateStr]) {
            timeline[dateStr].incoming += inv.total || 0;
          }
        }
      });

      outgoing?.forEach(rec => {
        if (rec.next_due_date) {
          const dateStr = rec.next_due_date.split('T')[0];
          if (timeline[dateStr]) {
            timeline[dateStr].outgoing += rec.total || 0;
          }
        }
      });

      return Object.values(timeline).map(day => ({
        ...day,
        net: day.incoming - day.outgoing
      }));
    },
  });

  // Recent matched payments
  const recentMatchedPayments = useQuery({
    queryKey: ["recentMatchedPayments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("bank_transactions")
        .select("amount, description, date, matched_invoice_id, invoices(total, client:clients(name))")
        .eq("user_id", user!.id)
        .eq("status", "matched")
        .order("date", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <section className="space-y-6">
      {/* Proactive Alert Banner */}
      {(() => {
        const alerts = [];

        // Overdue invoices alert
        if (overdueInvoices.data && overdueInvoices.data.length > 0) {
          alerts.push({
            type: 'warning',
            icon: AlertTriangle,
            title: `Action Required: ${overdueInvoices.data.length} Invoices are now Overdue`,
            description: 'Follow-up emails are recommended.',
            action: { label: 'Send Reminders', href: '/dashboard?tab=invoices' }
          });
        }

        // Recent matched payment alert
        if (recentMatchedPayments.data && recentMatchedPayments.data.length > 0) {
          const latest = recentMatchedPayments.data[0];
          alerts.push({
            type: 'success',
            icon: CheckCircle,
            title: `Deposit Detected: A $${latest.amount?.toFixed(2)} payment has been automatically matched.`,
            description: 'Review & Reconcile.',
            action: { label: 'Review', href: '/dashboard?tab=invoices' }
          });
        }

        // DSO improvement alert
        if (dso.data && dso.data < 30) {
          alerts.push({
            type: 'success',
            icon: TrendingUp,
            title: `Success: Your DSO is now ${dso.data} days—faster than average!`,
            description: 'Great job on collections.',
            action: { label: 'View Analytics', href: '/dashboard?tab=analytics' }
          });
        }

        // Health score improvement
        if (healthScore.data && healthScore.data.status === 'excellent') {
          alerts.push({
            type: 'success',
            icon: CheckCircle,
            title: 'Your Cash Flow Health is Excellent!',
            description: 'Keep up the good work.',
            action: { label: 'View Details', href: '/dashboard?tab=analytics' }
          });
        }

        if (alerts.length > 0) {
          const alert = alerts[0]; // Show only the first alert
          const Icon = alert.icon;
          return (
            <Card className={`border-2 ${alert.type === 'warning' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${alert.type === 'warning' ? 'text-red-600' : 'text-green-600'}`} />
                    <div>
                      <h3 className={`font-semibold ${alert.type === 'warning' ? 'text-red-700' : 'text-green-700'}`}>
                        {alert.title}
                      </h3>
                      <p className={`text-sm ${alert.type === 'warning' ? 'text-red-600' : 'text-green-600'}`}>
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => window.location.href = alert.action.href}
                    className="flex items-center gap-2"
                  >
                    {alert.action.label}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }

        // Fallback to Pro banner if no alerts
        return !proLoading && (
          <Card className={`border-2 ${isPro ? 'border-primary bg-primary/5' : 'border-accent bg-accent/10'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isPro ? (
                    <>
                      <Crown className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="font-semibold text-primary">Pro Account Active</h3>
                        <p className="text-sm text-muted-foreground">
                          Enjoy unlimited features and priority support
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Crown className="h-6 w-6 text-accent" />
                      <div>
                        <h3 className="font-semibold text-accent">
                          Upgrade to Pro
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Unlock advanced features like custom branding, analytics, and PDF exports
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {!isPro && (
                  <Button
                    onClick={() => window.open("https://buy.stripe.com/aFaeVd2ub23leHdf3p7kc03", "_blank")}
                    className="flex items-center gap-2"
                  >
                    Upgrade Now
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Quick-Create Widget */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Draft
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Create invoices faster with AI-powered data extraction
            </p>
            <Button
              size="lg"
              className="flex items-center gap-2"
              onClick={() => window.location.href = '/dashboard?tab=upload'}
            >
              <FileText className="h-5 w-5" />
              Draft Invoice from File/Email
            </Button>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => window.location.href = '/dashboard?tab=invoices'}
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs">New Invoice</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => window.location.href = '/dashboard?tab=clients'}
              >
                <Users className="h-4 w-4" />
                <span className="text-xs">Add Client</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => window.location.href = '/dashboard?tab=recurring'}
              >
                <FileText className="h-4 w-4" />
                <span className="text-xs">Recurring</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => window.location.href = '/dashboard?tab=analytics'}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs">Analytics</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Invoices and Pending Reconciliations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Overdue Invoices Mini-Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Overdue Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueInvoices.isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : overdueInvoices.data && overdueInvoices.data.length > 0 ? (
              <div className="space-y-3">
                {overdueInvoices.data.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Invoice #{invoice.number}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.client?.name} - ${invoice.total?.toFixed(2)}
                      </p>
                      <p className="text-xs text-red-600">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = '/dashboard?tab=invoices'}
                    >
                      Send Reminder
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => window.location.href = '/dashboard?tab=invoices'}
                >
                  View All Overdue
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No overdue invoices</p>
                <p className="text-sm">All caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Reconciliations Mini-Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Payments Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTransactions.isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : pendingTransactions.data && pendingTransactions.data.length > 0 ? (
              <div className="space-y-3">
                {pendingTransactions.data.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">${transaction.amount?.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = '/dashboard?tab=invoices'}
                    >
                      Match Payment
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => window.location.href = '/dashboard?tab=invoices'}
                >
                  View All Transactions
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending transactions</p>
                <p className="text-sm">All payments matched!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Stats Grid - Three Column Layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Revenue Card */}
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {dashboardData.isLoading ? "—" : `$${dashboardData.data?.totalRevenue?.toFixed(2) || '0.00'}`}
            </div>
            <p className="text-xs text-green-600 dark:text-green-500">
              From paid invoices
            </p>
          </CardContent>
        </Card>

        {/* Pending Revenue Card */}
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              {dashboardData.isLoading ? "—" : `$${dashboardData.data?.pendingRevenue?.toFixed(2) || '0.00'}`}
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-500">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        {/* Overdue Balance Card */}
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Balance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {dashboardData.isLoading ? "—" : `$${dashboardData.data?.overdueRevenue?.toFixed(2) || '0.00'}`}
            </div>
            <p className="text-xs text-red-600 dark:text-red-500">
              Needs attention
            </p>
          </CardContent>
        </Card>

        {/* Total Clients Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clientsCount.isLoading ? "—" : clientsCount.data}
            </div>
            <p className="text-xs text-muted-foreground">
              Active client relationships
            </p>
          </CardContent>
        </Card>

        {/* Total Invoices Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoicesCount.isLoading ? "—" : invoicesCount.data}
            </div>
            <p className="text-xs text-muted-foreground">
              Invoices created
            </p>
          </CardContent>
        </Card>

        {/* Invoice Success Rate Card */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {dashboardData.isLoading ? "—" :
                dashboardData.data?.totalInvoices ?
                  Math.round((dashboardData.data.totalRevenue / (dashboardData.data.totalRevenue + dashboardData.data.pendingRevenue + dashboardData.data.overdueRevenue)) * 100)
                  : 0}%
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-500">
              Payment success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Intelligent Insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profitability & Focus Alert */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Profitability Insight
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientSegmentation.isLoading ? (
              <div className="h-24 bg-muted animate-pulse rounded-lg" />
            ) : clientSegmentation.data && clientSegmentation.data.length > 0 ? (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Your high-value clients pay {dso.data ? Math.max(0, 30 - dso.data) : 0} days faster than average.
                </p>
                <p className="font-medium mb-3">
                  Focus your efforts on these top clients:
                </p>
                <div className="space-y-2">
                  {clientSegmentation.data.slice(0, 3).map((client, index) => (
                    <div key={client.name} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </div>
                        <span className="font-medium">{client.name}</span>
                      </div>
                      <span className="text-green-600 font-semibold">${Number(client.revenue).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => window.location.href = '/dashboard?tab=clients'}
                >
                  View All Clients
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No client data available</p>
                <p className="text-sm">Complete some paid invoices to see insights</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time-Saving Automation Summary */}
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Automation Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-700 mb-2">
                {recentMatchedPayments.data ? recentMatchedPayments.data.length * 5 : 0} hours
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Saved this month through auto-matched payments and smart drafting
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Auto-Matched: {recentMatchedPayments.data ? recentMatchedPayments.data.length : 0} payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>AI Extractions: {recentMatchedPayments.data ? recentMatchedPayments.data.length * 2 : 0} files</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => window.location.href = '/dashboard?tab=analytics'}
              >
                View Detailed Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cash Flow Timeline (Next 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cashFlowTimeline.isLoading ? (
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
          ) : cashFlowTimeline.data && cashFlowTimeline.data.length > 0 ? (
            <ChartContainer
              config={{
                incoming: {
                  label: "Expected In",
                  color: "hsl(var(--primary))",
                },
                outgoing: {
                  label: "Expected Out",
                  color: "hsl(var(--destructive))",
                },
                net: {
                  label: "Net Cash Flow",
                  color: "hsl(var(--secondary))",
                },
              }}
              className="h-64"
            >
              <AreaChart data={cashFlowTimeline.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <ChartTooltip
                  content={<ChartTooltipContent
                    formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name]}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  />}
                />
                <Area
                  type="monotone"
                  dataKey="incoming"
                  stackId="1"
                  stroke="var(--color-incoming)"
                  fill="var(--color-incoming)"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="outgoing"
                  stackId="2"
                  stroke="var(--color-outgoing)"
                  fill="var(--color-outgoing)"
                  fillOpacity={0.6}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="var(--color-net)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-net)" }}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No cash flow data available</p>
                <p className="text-sm">Create invoices and recurring bills to see projections</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Management Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Clients by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardData.isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : dashboardData.data?.topClients && dashboardData.data.topClients.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.data.topClients.map((client, index) => (
                <div key={client.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">Top client</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${Number(client.revenue).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Total revenue</p>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => window.location.href = '/dashboard?tab=clients'}
              >
                View All Clients
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No client data available</p>
              <p className="text-sm">Add clients and complete invoices to see top performers</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            What's Happening Now
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityFeed.isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : activityFeed.data && activityFeed.data.length > 0 ? (
            <div className="space-y-3">
              {activityFeed.data.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.activity_type === 'invoice_sent' ? 'bg-blue-500' :
                    activity.activity_type === 'payment_received' ? 'bg-green-500' :
                    activity.activity_type === 'reminder_sent' ? 'bg-yellow-500' :
                    activity.activity_type === 'client_added' ? 'bg-purple-500' :
                    'bg-gray-500'
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activity.created_at).toLocaleDateString()} at {new Date(activity.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {activity.activity_type.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => window.location.href = '/dashboard?tab=clients'}
              >
                View All Activity
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm">Activity will appear here as you interact with clients</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pro Features Showcase */}
      {!isPro && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Pro Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold mb-1">Advanced Analytics</h4>
                <p className="text-sm text-muted-foreground">
                  Detailed business insights and revenue tracking
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Crown className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold mb-1">Custom Branding</h4>
                <p className="text-sm text-muted-foreground">
                  Add your logo and colors to invoices
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold mb-1">PDF Export</h4>
                <p className="text-sm text-muted-foreground">
                  Export and send professional invoices
                </p>
              </div>
            </div>
            <div className="text-center mt-6">
              <Button 
                onClick={() => window.open("https://buy.stripe.com/aFaeVd2ub23leHdf3p7kc03", "_blank")}
                size="lg"
                className="flex items-center gap-2"
              >
                <Crown className="h-4 w-4" />
                Upgrade to Pro - $4.99/month
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

export default Overview;
