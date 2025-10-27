import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all bank transactions and invoices for matching
    const { data: transactions, error: transError } = await supabaseClient
      .from('bank_transactions')
      .select('*')
      .eq('status', 'pending')

    if (transError) throw transError

    const { data: invoices, error: invError } = await supabaseClient
      .from('invoices')
      .select('*')
      .in('status', ['sent', 'overdue'])

    if (invError) throw invError

    const matches = []

    // Simple matching algorithm: match by amount and date proximity
    for (const trans of transactions) {
      for (const inv of invoices) {
        const amountDiff = Math.abs(trans.amount - inv.total)
        const dateDiff = Math.abs(new Date(trans.date).getTime() - new Date(inv.due_date).getTime())
        const maxDateDiff = 7 * 24 * 60 * 60 * 1000 // 7 days

        if (amountDiff < 0.01 && dateDiff < maxDateDiff) {
          matches.push({
            transaction_id: trans.id,
            invoice_id: inv.id,
            confidence: 0.9
          })
        }
      }
    }

    // Update matches
    for (const match of matches) {
      await supabaseClient
        .from('bank_transactions')
        .update({ status: 'matched', matched_invoice_id: match.invoice_id })
        .eq('id', match.transaction_id)

      await supabaseClient
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', match.invoice_id)
    }

    return new Response(JSON.stringify({ matches: matches.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})