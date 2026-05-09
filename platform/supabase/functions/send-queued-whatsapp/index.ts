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

function cleanPhone(value: unknown) {
  return cleanText(value).replace(/[^\d]/g, "");
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
  const whatsappProvider = Deno.env.get("WHATSAPP_PROVIDER") ?? "";
  const whatsappAccessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
  const graphApiVersion = cleanText(Deno.env.get("WHATSAPP_GRAPH_API_VERSION"));

  if (!supabaseUrl || !serviceRoleKey || !whatsappProvider) {
    return jsonResponse({ error: "Missing server environment configuration" }, 500);
  }

  if (whatsappProvider !== "whatsapp_cloud") {
    return jsonResponse({ error: "Unsupported WhatsApp provider" }, 500);
  }

  if (!whatsappAccessToken) {
    return jsonResponse({ error: "Missing WhatsApp access token" }, 500);
  }

  if (!graphApiVersion) {
    return jsonResponse({ error: "Missing WhatsApp Graph API version" }, 500);
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

  if (queuedMessage.channel !== "whatsapp") {
    return jsonResponse({ error: "Only WhatsApp messages can be sent by this function" }, 400);
  }

  if (queuedMessage.status !== "queued") {
    return jsonResponse({ error: "Only queued messages can be sent" }, 409);
  }

  if (queuedMessage.review_status !== "approved") {
    return jsonResponse({ error: "Message must be approved before provider delivery" }, 409);
  }

  const recipient = cleanPhone(queuedMessage.recipient);
  if (!recipient || !cleanText(queuedMessage.message)) {
    return jsonResponse({ error: "Recipient phone and message are required" }, 400);
  }

  const { data: settings, error: settingsError } = await supabase
    .from("workspace_whatsapp_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", "whatsapp_cloud")
    .eq("status", "active")
    .single();

  if (settingsError || !settings) {
    return jsonResponse({ error: "Active workspace WhatsApp settings not found" }, 400);
  }

  const phoneNumberId = cleanText(settings.phone_number_id);
  if (!phoneNumberId) {
    return jsonResponse({ error: "WhatsApp phone number ID is required" }, 400);
  }

  const providerPayload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: {
      preview_url: false,
      body: queuedMessage.message
    }
  };

  const providerResponse = await fetch(`https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${whatsappAccessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(providerPayload)
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
        delivery_detail: "WhatsApp provider request failed",
        failed_at: new Date().toISOString(),
        last_delivery_event_at: new Date().toISOString(),
        next_retry_at: nextRetryAt(queuedMessage.retry_count),
        metadata: {
          ...(queuedMessage.metadata ?? {}),
          provider: "whatsapp_cloud",
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
      summary: "WhatsApp send failed",
      metadata: {
        provider: "whatsapp_cloud",
        provider_error: providerResult
      }
    });

    await supabase.from("outbound_message_events").insert({
      workspace_id: workspaceId,
      outbound_message_id: outboundMessageId,
      provider: "whatsapp_cloud",
      provider_message_id: cleanText(queuedMessage.provider_message_id),
      event_type: "whatsapp.failed",
      delivery_status: "failed",
      summary: "WhatsApp provider request failed",
      metadata: {
        provider_error: providerResult
      }
    });

    return jsonResponse({ error: "WhatsApp provider request failed", detail: providerResult }, 502);
  }

  const providerMessages = (providerResult as Record<string, unknown>).messages;
  const firstMessage = Array.isArray(providerMessages) ? providerMessages[0] as Record<string, unknown> : {};
  const providerMessageId = cleanText(firstMessage?.id);
  const { data: sentMessage, error: updateError } = await supabase
    .from("outbound_messages")
    .update({
      status: "sent",
      delivery_status: "sent",
      delivery_detail: "Accepted by WhatsApp Cloud API",
      sent_at: new Date().toISOString(),
      last_delivery_event_at: new Date().toISOString(),
      provider_message_id: providerMessageId || null,
      metadata: {
        ...(queuedMessage.metadata ?? {}),
        provider: "whatsapp_cloud",
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
    summary: "Queued WhatsApp message sent",
    metadata: {
      provider: "whatsapp_cloud",
      provider_message_id: providerMessageId
    }
  });

  await supabase.from("outbound_message_events").insert({
    workspace_id: workspaceId,
    outbound_message_id: outboundMessageId,
    provider: "whatsapp_cloud",
    provider_message_id: providerMessageId || null,
    event_type: "whatsapp.sent",
    delivery_status: "sent",
    summary: "WhatsApp message accepted by provider",
    metadata: {
      provider_response: providerResult
    }
  });

  return jsonResponse({
    ok: true,
    outboundMessage: sentMessage,
    provider: "whatsapp_cloud",
    providerMessageId
  });
});
