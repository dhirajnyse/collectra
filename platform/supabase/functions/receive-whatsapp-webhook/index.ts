import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
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

function hexToBytes(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

async function verifyHubSignature(payload: string, signatureHeader: string, appSecret: string) {
  if (!payload || !signatureHeader || !appSecret) return false;
  const signature = signatureHeader.replace("sha256=", "").trim();
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expectedHex = bytesToHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return timingSafeEqual(hexToBytes(expectedHex), hexToBytes(signature));
}

function mapWhatsAppStatus(status: string) {
  const mapping: Record<string, { status: string; detail: string; messageStatus?: string }> = {
    sent: { status: "sent", detail: "WhatsApp message sent by provider", messageStatus: "sent" },
    delivered: { status: "delivered", detail: "WhatsApp message delivered", messageStatus: "sent" },
    read: { status: "read", detail: "WhatsApp message read", messageStatus: "sent" },
    failed: { status: "failed", detail: "WhatsApp message failed", messageStatus: "failed" }
  };
  return mapping[status] ?? { status: "unknown", detail: `Unhandled WhatsApp status: ${status}` };
}

function statusTimestamp(value: unknown) {
  const raw = Number(cleanText(value));
  if (Number.isFinite(raw) && raw > 0) {
    return new Date(raw * 1000).toISOString();
  }
  return new Date().toISOString();
}

function collectStatuses(payload: Record<string, unknown>) {
  const statuses: Array<Record<string, unknown>> = [];
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray((entry as Record<string, unknown>).changes) ? (entry as Record<string, unknown>).changes as Array<Record<string, unknown>> : [];
    for (const change of changes) {
      const value = change.value as Record<string, unknown> | undefined;
      const nextStatuses = Array.isArray(value?.statuses) ? value.statuses as Array<Record<string, unknown>> : [];
      statuses.push(...nextStatuses);
    }
  }

  return statuses;
}

async function recordWhatsAppStatus({
  supabase,
  statusPayload,
  rawPayload
}: {
  supabase: ReturnType<typeof createClient>;
  statusPayload: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
}) {
  const providerMessageId = cleanText(statusPayload.id);
  const statusValue = cleanText(statusPayload.status);
  if (!providerMessageId || !statusValue) return { matched: false };

  const { data: message, error: messageError } = await supabase
    .from("outbound_messages")
    .select("*")
    .eq("provider_message_id", providerMessageId)
    .limit(1)
    .maybeSingle();

  if (messageError) throw messageError;
  if (!message) return { matched: false };

  const mapped = mapWhatsAppStatus(statusValue);
  const occurredAt = statusTimestamp(statusPayload.timestamp);
  const providerEventId = `${providerMessageId}:${statusValue}:${cleanText(statusPayload.timestamp) || occurredAt}`;
  const updatePayload: Record<string, unknown> = {
    delivery_status: mapped.status,
    delivery_detail: mapped.detail,
    last_delivery_event_at: occurredAt
  };

  if (mapped.messageStatus) updatePayload.status = mapped.messageStatus;
  if (mapped.status === "delivered") updatePayload.delivered_at = occurredAt;
  if (mapped.status === "read") updatePayload.read_at = occurredAt;
  if (mapped.status === "failed") updatePayload.failed_at = occurredAt;

  const { error: eventError } = await supabase.from("outbound_message_events").insert({
    workspace_id: message.workspace_id,
    outbound_message_id: message.id,
    provider: "whatsapp_cloud",
    provider_message_id: providerMessageId,
    provider_event_id: providerEventId,
    event_type: `whatsapp.${statusValue}`,
    delivery_status: mapped.status,
    summary: mapped.detail,
    occurred_at: occurredAt,
    metadata: {
      status: statusPayload,
      payload: rawPayload
    }
  });

  if (eventError?.code === "23505") {
    return { matched: true, duplicate: true };
  }
  if (eventError) throw eventError;

  const { error: updateError } = await supabase
    .from("outbound_messages")
    .update(updatePayload)
    .eq("id", message.id)
    .eq("workspace_id", message.workspace_id);

  if (updateError) throw updateError;

  return { matched: true, duplicate: false };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const verifyToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") ?? "";

  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode") ?? "";
    const token = url.searchParams.get("hub.verify_token") ?? "";
    const challenge = url.searchParams.get("hub.challenge") ?? "";

    if (mode === "subscribe" && token && token === verifyToken) {
      return new Response(challenge, {
        status: 200,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }

    return jsonResponse({ error: "Webhook verification failed" }, 403);
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET") ?? "";

  if (!supabaseUrl || !serviceRoleKey || !verifyToken || !appSecret) {
    return jsonResponse({ error: "Missing server environment configuration" }, 500);
  }

  const payloadText = await request.text();
  const signatureHeader = request.headers.get("x-hub-signature-256") ?? "";
  const verified = await verifyHubSignature(payloadText, signatureHeader, appSecret).catch(() => false);

  if (!verified) {
    return jsonResponse({ error: "Invalid webhook signature" }, 401);
  }

  const payload = JSON.parse(payloadText) as Record<string, unknown>;
  const statuses = collectStatuses(payload);
  if (!statuses.length) {
    return jsonResponse({ ok: true, ignored: true });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const results = [];
  for (const statusPayload of statuses) {
    results.push(await recordWhatsAppStatus({
      supabase,
      statusPayload,
      rawPayload: payload
    }));
  }

  return jsonResponse({
    ok: true,
    provider: "whatsapp_cloud",
    processed: results.length,
    matched: results.filter((result) => result.matched).length,
    duplicates: results.filter((result) => result.duplicate).length
  });
});
