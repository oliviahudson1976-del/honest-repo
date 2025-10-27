import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileId, content } = await req.json()

    if (!fileId || !content) {
      return new Response(JSON.stringify({ error: 'Missing fileId or content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get API keys from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY') // Optional for free OCR

    let processedText = content
    let extractedText = processedText
    let extractedFields: any = { raw_text: processedText }

    // If content is base64 and file is image, use OCR
    if (content.startsWith('data:image/') && ocrSpaceApiKey) {
      const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'apikey': ocrSpaceApiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          base64Image: content.split(',')[1],
          language: 'eng',
          isOverlayRequired: 'false'
        })
      })

      if (ocrResponse.ok) {
        const ocrResult = await ocrResponse.json()
        processedText = ocrResult.ParsedResults?.[0]?.ParsedText || content
      }
    }

    // Call OpenAI API for text extraction
    if (openaiApiKey) {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant that extracts structured data from documents. Parse the provided text and return key information in JSON format, such as client name, amount, date, description, etc.'
            },
            {
              role: 'user',
              content: processedText
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        })
      })

      if (openaiResponse.ok) {
        const aiResult = await openaiResponse.json()
        extractedText = aiResult.choices[0]?.message?.content || processedText

        // Parse the extracted text as JSON if possible
        try {
          extractedFields = JSON.parse(extractedText)
        } catch {
          extractedFields = { raw_text: extractedText }
        }
      }
    }

    // Store the extraction in the database
    const { error: insertError } = await supabaseClient
      .from('ai_extractions')
      .insert({
        file_id: fileId,
        extracted_text: extractedText,
        extracted_fields: extractedFields
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to save extraction' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update the file status
    await supabaseClient
      .from('uploaded_files')
      .update({ status: 'processed' })
      .eq('id', fileId)

    return new Response(JSON.stringify({ success: true, extractedFields }), {
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