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
    const { amount, customerId, address } = await req.json()

    if (!amount || !customerId) {
      return new Response(JSON.stringify({ error: 'Missing amount or customerId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Stripe secret key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Calculate tax using Stripe Tax API
    const taxResponse = await fetch('https://api.stripe.com/v1/tax/calculations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        currency: 'usd',
        customer: customerId,
        'line_items[0][amount]': amount,
        'line_items[0][tax_behavior]': 'exclusive',
        'shipping_cost[amount]': '0',
        'automatic_tax[enabled]': 'true',
        ...(address && {
          'customer_details[address][line1]': address.line1 || '',
          'customer_details[address][city]': address.city || '',
          'customer_details[address][state]': address.state || '',
          'customer_details[address][postal_code]': address.postal_code || '',
          'customer_details[address][country]': address.country || 'US',
        })
      })
    })

    if (!taxResponse.ok) {
      const error = await taxResponse.text()
      console.error('Stripe Tax API error:', error)
      return new Response(JSON.stringify({ error: 'Failed to calculate tax' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const taxResult = await taxResponse.json()

    return new Response(JSON.stringify({
      taxAmount: taxResult.amount_total - taxResult.amount_subtotal,
      taxRate: taxResult.tax_amount_exclusive ? (taxResult.tax_amount_exclusive / taxResult.amount_subtotal) * 100 : 0,
      totalAmount: taxResult.amount_total
    }), {
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