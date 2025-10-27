import { supabase } from "@/integrations/supabase/client";

export interface HealthScoreData {
  score: number;
  status: "excellent" | "good" | "fair" | "poor" | "critical";
  overdueCount: number;
  totalInvoiced: number;
  totalPaid: number;
  paymentRatio: number;
}

export function calculateHealthScore(
  overdueCount: number,
  totalInvoiced: number,
  totalPaid: number
): HealthScoreData {
  let score = 100;

  // Deduct points for overdue invoices (max 50 points)
  score -= overdueCount * 15;
  if (score < 50) score = 50;

  // Deduct points based on payment ratio (max 50 points)
  const paymentRatio = totalInvoiced > 0 ? totalPaid / totalInvoiced : 1;
  score -= (1 - paymentRatio) * 50;

  // Ensure score stays within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine status
  let status: HealthScoreData["status"];
  if (score >= 80) status = "excellent";
  else if (score >= 60) status = "good";
  else if (score >= 40) status = "fair";
  else if (score >= 20) status = "poor";
  else status = "critical";

  return {
    score: Math.round(score),
    status,
    overdueCount,
    totalInvoiced,
    totalPaid,
    paymentRatio
  };
}

export async function getClientHealthScore(clientId: string): Promise<HealthScoreData> {
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("total, status, due_date")
    .eq("client_id", clientId);

  if (error) throw error;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let overdueCount = 0;
  let totalInvoiced = 0;
  let totalPaid = 0;

  invoices?.forEach(invoice => {
    totalInvoiced += invoice.total;

    if (invoice.status === "paid") {
      totalPaid += invoice.total;
    } else if (invoice.status === "overdue") {
      overdueCount++;
    } else if (invoice.status === "sent" && invoice.due_date && new Date(invoice.due_date) < thirtyDaysAgo) {
      overdueCount++;
    }
  });

  return calculateHealthScore(overdueCount, totalInvoiced, totalPaid);
}

export async function updateClientHealthScore(clientId: string): Promise<void> {
  const healthData = await getClientHealthScore(clientId);

  const { error } = await supabase
    .from("clients")
    .update({
      health_score: healthData.score,
      updated_at: new Date().toISOString()
    })
    .eq("id", clientId);

  if (error) throw error;
}

export async function updateAllClientsHealthScores(): Promise<void> {
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id");

  if (clientsError) throw clientsError;

  for (const client of clients || []) {
    try {
      await updateClientHealthScore(client.id);
    } catch (error) {
      console.error(`Failed to update health score for client ${client.id}:`, error);
    }
  }
}