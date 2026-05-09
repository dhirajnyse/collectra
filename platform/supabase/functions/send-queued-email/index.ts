import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

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

function nextRetryAt(retryCount: unknown) {
  const retryNumber = Number(retryCount);
  const attempt = Number.isFinite(retryNumber) && retryNumber >= 0 ? retryNumber + 1 : 1;
  const delayMinutes = Math.min(60, attempt * 15);
  return new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
}

function buildFrom(settings: Record<string, unknown>) {
  const fromEmail = cleanText(settings.from_email);
  const fromName = cleanText(settings.from_name);
  return fromName ? `${fromName} <${fromEmail}>` : fromEmail;
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
  const emailProvider = Deno.env.get("EMAIL_PROVIDER") ?? "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey || !emailProvider) {
    return jsonResponse({ error: "Missing server environment configuration" }, 500);
  }

  if (emailProvider !== "resend") {
    return jsonResponse({ error: "Unsupported email provider" }, 500);
  }

  if (!resendApiKey) {
    return jsonResponse({ error: "Missing Resend API key" }, 500);
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
  const outboundMessageId = cleanText(body.outboundMessageId);

  if (!workspaceId || !outboundMessageId) {
    return jsonResponse({ error: "workspaceId and outboundMessageId are required" }, 400);
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

  const { data: queuedMessage, error: messageError } = await supabase
    .from("outbound_messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", outboundMessageId)
    .single();

  if (messageError || !queuedMessage) {
    return jsonResponse({ error: "Queued message not found" }, 404);
  }

  if (queuedMessage.channel !== "email") {
    return jsonResponse({ error: "Only email messages can be sent by this function" }, 400);
  }

  if (queuedMessage.status !== "queued") {
    return jsonResponse({ error: "Only queued messages can be sent" }, 409);
  }

  if (queuedMessage.review_status !== "approved") {
    return jsonResponse({ error: "Message must be approved before provider delivery" }, 409);
  }

  if (!cleanText(queuedMessage.recipient) || !cleanText(queuedMessage.message)) {
    return jsonResponse({ error: "Recipient and message are required" }, 400);
  }

  const { data: settings, error: settingsError } = await supabase
    .from("workspace_email_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", "resend")
    .eq("status", "active")
    .single();

  if (settingsError || !settings) {
    return jsonResponse({ error: "Active workspace email settings not found" }, 400);
  }

  const resendPayload: Record<string, unknown> = {
    from: buildFrom(settings),
    to: [queuedMessage.recipient],
    subject: cleanText(queuedMessage.subject) || "Payment follow-up",
    text: queuedMessage.message
  };

  if (cleanText(settings.reply_to)) {
    resendPayload.reply_to = settings.reply_to;
  }

  const providerResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(resendPayload)
  });

  const providerResult = await providerResponse.json().catch(async () => ({
    raw: await providerResponse.text()
  }));

  if (!providerResponse.ok) {
    await supabase
      .from("outbound_messages")
      .update({
        status: "failed",
        delivery_status: "failed",
        delivery_detail: "Email provider request failed",
        failed_at: new Date().toISOString(),
        last_delivery_event_at: new Date().toISOString(),
        next_retry_at: nextRetryAt(queuedMessage.retry_count),
        metadata: {
          ...(queuedMessage.metadata ?? {}),
          provider: "resend",
          provider_error: providerResult
        }
      })
      .eq("workspace_id", workspaceId)
      .eq("id", outboundMessageId);

    await supabase.from("audit_logs").insert({
      workspace_id: workspaceId,
      actor_id: user.id,
      action: "outbound_message.failed",
      entity_type: "outbound_message",
      entity_id: outboundMessageId,
      summary: "Email send failed",
      metadata: {
        provider: "resend",
        provider_error: providerResult
      }
    });

    await supabase.from("outbound_message_events").insert({
      workspace_id: workspaceId,
      outbound_message_id: outboundMessageId,
      provider: "resend",
      provider_message_id: cleanText(queuedMessage.provider_message_id),
      event_type: "email.failed",
      delivery_status: "failed",
      summary: "Email provider request failed",
      metadata: {
        provider_error: providerResult
      }
    });

    return jsonResponse({ error: "Email provider request failed", detail: providerResult }, 502);
  }

  const providerMessageId = cleanText((providerResult as Record<string, unknown>).id);
  const { data: sentMessage, error: updateError } = await supabase
    .from("outbound_messages")
    .update({
      status: "sent",
      delivery_status: "sent",
      delivery_detail: "Accepted by Resend",
      sent_at: new Date().toISOString(),
      last_delivery_event_at: new Date().toISOString(),
      provider_message_id: providerMessageId || null,
      metadata: {
        ...(queuedMessage.metadata ?? {}),
        provider: "resend",
        provider_response: providerResult
      }
    })
    .eq("workspace_id", workspaceId)
    .eq("id", outboundMessageId)
    .select("*")
    .single();

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  await supabase.from("audit_logs").insert({
    workspace_id: workspaceId,
    actor_id: user.id,
    action: "outbound_message.sent",
    entity_type: "outbound_message",
    entity_id: outboundMessageId,
    summary: "Queued email sent",
    metadata: {
      provider: "resend",
      provider_message_id: providerMessageId
    }
  });

  await supabase.from("outbound_message_events").insert({
    workspace_id: workspaceId,
    outbound_message_id: outboundMessageId,
    provider: "resend",
    provider_message_id: providerMessageId || null,
    event_type: "email.sent",
    delivery_status: "sent",
    summary: "Email accepted by provider",
    metadata: {
      provider_response: providerResult
    }
  });

  return jsonResponse({
    ok: true,
    outboundMessage: sentMessage,
    provider: "resend",
    providerMessageId
  });
});
