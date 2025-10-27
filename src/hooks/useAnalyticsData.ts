import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Hook for DSO (Days Sales Outstanding)
export const useDSO = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dso", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // First get paid bank transactions with matched invoices
      const { data: transactions, error: txError } = await supabase
        .from("bank_transactions")
        .select("date, matched_invoice_id")
        .eq("user_id", user!.id)
        .not("matched_invoice_id", "is", null)
        .not("date", "is", null);

      if (txError) throw txError;

      if (!transactions || transactions.length === 0) return 0;

      // Get the invoice issue dates for matched invoices
      const invoiceIds = transactions.map(tx => tx.matched_invoice_id).filter(Boolean);
      const { data: invoices, error: invoiceError } = await supabase
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
};

// Hook for Client Segmentation (Top 5 clients by revenue)
export const useClientSegmentation = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clientSegmentation", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get paid invoices with client information
      const { data: invoices, error: invoiceError } = await supabase
        .from("invoices")
        .select("total, client_id")
        .eq("user_id", user!.id)
        .eq("status", "paid");

      if (invoiceError) throw invoiceError;

      if (!invoices || invoices.length === 0) return [];

      // Get client details for the invoice client IDs
      const clientIds = [...new Set(invoices.map(inv => inv.client_id))];
      const { data: clients, error: clientError } = await supabase
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
};

// Hook for Payment Methods
export const usePaymentMethods = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["paymentMethods", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select("description")
        .eq("user_id", user!.id)
        .not("description", "is", null);

      if (error) throw error;

      const methods = data.reduce((acc, tx) => {
        const desc = tx.description?.toLowerCase() || "";
        if (desc.includes("ach") || desc.includes("direct deposit")) {
          acc.ACH = (acc.ACH || 0) + 1;
        } else if (desc.includes("credit") || desc.includes("visa") || desc.includes("mastercard")) {
          acc["Credit Card"] = (acc["Credit Card"] || 0) + 1;
        } else if (desc.includes("check")) {
          acc.Check = (acc.Check || 0) + 1;
        } else {
          acc.Other = (acc.Other || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(methods).map(([method, count]) => ({ method, count }));
    },
  });
};

// Hook for Projected Cash Flow
export const useProjectedCashFlow = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["projectedCashFlow", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from("invoices")
        .select("total")
        .eq("user_id", user!.id)
        .eq("status", "sent")
        .lte("due_date", thirtyDaysFromNow.toISOString())
        .gte("due_date", now.toISOString());

      if (error) throw error;

      return data.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    },
  });
};

// Hook for Revenue Over Time (for charts)
export const useRevenueOverTime = (timeRange: string = "12months") => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenueOverTime", user?.id, timeRange],
    enabled: !!user,
    queryFn: async () => {
      let startDate: Date;
      const now = new Date();

      switch (timeRange) {
        case "3months":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "6months":
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case "12months":
        default:
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }

      const { data, error } = await supabase
        .from("invoices")
        .select("total, status, issue_date, due_date")
        .eq("user_id", user!.id)
        .gte("issue_date", startDate.toISOString())
        .order("issue_date");

      if (error) throw error;

      // Group by month
      const monthlyData = data.reduce((acc, invoice) => {
        const month = new Date(invoice.issue_date).toISOString().slice(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = { month, revenue: 0, pending: 0, overdue: 0 };
        }
        if (invoice.status === "paid") {
          acc[month].revenue += invoice.total || 0;
        } else if (invoice.status === "sent" || invoice.status === "overdue") {
          acc[month].pending += invoice.total || 0;
          if (invoice.due_date && new Date(invoice.due_date) < now) {
            acc[month].overdue += invoice.total || 0;
          }
        }
        return acc;
      }, {} as Record<string, { month: string; revenue: number; pending: number; overdue: number }>);

      return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    },
  });
};

// Hook for Client Tags
export const useClientTags = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clientTags", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("tags")
        .eq("user_id", user!.id)
        .not("tags", "is", null);

      if (error) throw error;

      const allTags = data.flatMap(client => client.tags || []);
      return [...new Set(allTags)];
    },
  });
};

// Hook for Service Descriptions
export const useServiceDescriptions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["serviceDescriptions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // First get invoices for the user
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("id")
        .eq("user_id", user!.id);

      if (invoicesError) throw invoicesError;

      if (!invoices || invoices.length === 0) return [];

      // Then get invoice items for those invoices
      const invoiceIds = invoices.map(inv => inv.id);
      const { data, error } = await supabase
        .from("invoice_items")
        .select("description")
        .in("invoice_id", invoiceIds)
        .not("description", "is", null);

      if (error) throw error;

      return [...new Set(data.map(item => item.description))];
    },
  });
};