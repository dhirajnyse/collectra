import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const allowedTones = new Set(["friendly", "firm", "urgent"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDraft(rawText: string) {
  const fallback = {
    subject: "Payment follow-up",
    message: cleanText(rawText),
    next_action: "Review and send to customer",
    risk_note: "Generated draft requires human approval"
  };

  try {
    const parsed = JSON.parse(rawText);
    return {
      subject: cleanText(parsed.subject) || fallback.subject,
      message: cleanText(parsed.message) || fallback.message,
      next_action: cleanText(parsed.next_action) || fallback.next_action,
      risk_note: cleanText(parsed.risk_note) || fallback.risk_note
    };
  } catch (_error) {
    return fallback;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const openAiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  const openAiModel = Deno.env.get("OPENAI_MODEL") ?? "";

  if (!supabaseUrl || !serviceRoleKey || !openAiKey || !openAiModel) {
    return jsonResponse({ error: "Missing server environment configuration" }, 500);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const jwt = authorization.replace("Bearer ", "").trim();
  if (!jwt) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(jwt);
  const user = userResult?.user;
  if (userError || !user) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  const body = await request.json().catch(() => ({}));
  const workspaceId = cleanText(body.workspaceId);
  const invoiceId = cleanText(body.invoiceId);
  const tone = allowedTones.has(cleanText(body.tone)) ? cleanText(body.tone) : "friendly";

  if (!workspaceId || !invoiceId) {
    return jsonResponse({ error: "workspaceId and invoiceId are required" }, 400);
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return jsonResponse({ error: "Workspace access denied" }, 403);
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, customer_id, invoice_number, amount, due_date, status, customers(name, contact, email, terms, notes)")
    .eq("workspace_id", workspaceId)
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return jsonResponse({ error: "Invoice not found" }, 404);
  }

  const customer = Array.isArray(invoice.customers) ? invoice.customers[0] : invoice.customers;
  const { data: playbook } = await supabase
    .from("customer_collection_playbooks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("customer_id", invoice.customer_id)
    .eq("status", "active")
    .maybeSingle();

  const prompt = [
    "Write a concise B2B payment follow-up draft.",
    "Do not invent payment commitments, bank details, legal threats, discounts, or facts not present here.",
    "Keep the message professional and human. The user must review before sending.",
    "Use the customer collection playbook when present, but do not disclose internal risk scores or policy names to the customer.",
    "Return only JSON with subject, message, next_action, and risk_note.",
    "",
    `Requested tone: ${tone}`,
    `Invoice: ${invoice.invoice_number}`,
    `Amount: AED ${Number(invoice.amount ?? 0).toLocaleString("en-US")}`,
    `Due date: ${invoice.due_date ?? "not set"}`,
    `Status: ${invoice.status}`,
    `Customer: ${customer?.name ?? "Unknown customer"}`,
    `Contact: ${customer?.contact ?? "Unknown contact"}`,
    `Payment terms: ${customer?.terms ?? "not set"}`,
    `Notes: ${customer?.notes ?? "none"}`,
    `Playbook: ${playbook?.playbook_name ?? "none"}`,
    `Payment behavior: ${playbook?.payment_behavior ?? "not set"}`,
    `Preferred channel: ${playbook?.preferred_channel ?? "not set"}`,
    `Playbook tone: ${playbook?.reminder_tone ?? "not set"}`,
    `Escalation policy: ${playbook?.escalation_policy ?? "not set"}`,
    `Days before due reminder: ${playbook?.days_before_due ?? "not set"}`,
    `Playbook notes: ${playbook?.notes ?? "none"}`
  ].join("\n");

  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: openAiModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are Collectra's finance follow-up assistant. You draft messages only; you never send them."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!openAiResponse.ok) {
    const detail = await openAiResponse.text();
    return jsonResponse({ error: "OpenAI request failed", detail }, 502);
  }

  const completion = await openAiResponse.json();
  const content = completion?.choices?.[0]?.message?.content ?? "";
  const draft = parseDraft(content);

  const { data: followup, error: followupError } = await supabase
    .from("ai_followups")
    .insert({
      workspace_id: workspaceId,
      invoice_id: invoiceId,
      created_by: user.id,
      tone,
      message: draft.message,
      model: openAiModel,
      metadata: {
        subject: draft.subject,
        next_action: draft.next_action,
        risk_note: draft.risk_note,
        invoice_number: invoice.invoice_number,
        customer_playbook_id: playbook?.id ?? null,
        payment_behavior: playbook?.payment_behavior ?? null,
        preferred_channel: playbook?.preferred_channel ?? null,
        escalation_policy: playbook?.escalation_policy ?? null,
        playbook_risk_weight: playbook?.risk_weight ?? null
      }
    })
    .select("*")
    .single();

  if (followupError) {
    return jsonResponse({ error: followupError.message }, 500);
  }

  await supabase.from("audit_logs").insert({
    workspace_id: workspaceId,
    actor_id: user.id,
    action: "ai_followup.generated",
    entity_type: "ai_followup",
    entity_id: followup.id,
    summary: `AI follow-up generated for ${invoice.invoice_number}`,
    metadata: {
      tone,
      model: openAiModel,
      invoice_id: invoiceId,
      customer_playbook_id: playbook?.id ?? null
    }
  });

  return jsonResponse({
    ok: true,
    followup,
    draft
  });
});
