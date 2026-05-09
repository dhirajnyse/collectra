import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
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

function base64ToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

async function verifySvixSignature({
  payload,
  webhookId,
  timestamp,
  signatureHeader,
  secret
}: {
  payload: string;
  webhookId: string;
  timestamp: string;
  signatureHeader: string;
  secret: string;
}) {
  if (!payload || !webhookId || !timestamp || !signatureHeader || !secret) return false;

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return false;

  const driftSeconds = Math.abs(Date.now() / 1000 - timestampNumber);
  if (driftSeconds > 300) return false;

  const secretValue = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(secretValue),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedContent = `${webhookId}.${timestamp}.${payload}`;
  const expectedSignature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent)));

  return signatureHeader.split(" ").some((candidate) => {
    const [version, signature] = candidate.split(",");
    if (version !== "v1" || !signature) return false;
    return timingSafeEqual(expectedSignature, base64ToBytes(signature));
  });
}

function mapResendStatus(eventType: string) {
  const mapping: Record<string, { status: string; detail: string; messageStatus?: string }> = {
    "email.sent": { status: "sent", detail: "Email accepted by Resend", messageStatus: "sent" },
    "email.delivered": { status: "delivered", detail: "Email delivered to recipient mail server", messageStatus: "sent" },
    "email.opened": { status: "opened", detail: "Email opened by recipient", messageStatus: "sent" },
    "email.clicked": { status: "clicked", detail: "Recipient clicked an email link", messageStatus: "sent" },
    "email.bounced": { status: "bounced", detail: "Email bounced", messageStatus: "failed" },
    "email.complained": { status: "complained", detail: "Recipient marked email as spam", messageStatus: "failed" },
    "email.suppressed": { status: "suppressed", detail: "Email suppressed by provider", messageStatus: "failed" },
    "email.failed": { status: "failed", detail: "Email failed at provider", messageStatus: "failed" },
    "email.delivery_delayed": { status: "unknown", detail: "Email delivery delayed", messageStatus: "sent" }
  };
  return mapping[eventType] ?? { status: "unknown", detail: `Unhandled Resend event: ${eventType}` };
}

function timestampFor(value: unknown) {
  const text = cleanText(value);
  const date = text ? new Date(text) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function recordResendEvent({ supabase, providerMessageId, providerEventId, eventType, payload }: {
  supabase: ReturnType<typeof createClient>;
  providerMessageId: string;
  providerEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  const { data: message, error: messageError } = await supabase
    .from("outbound_messages")
    .select("*")
    .eq("provider_message_id", providerMessageId)
    .limit(1)
    .maybeSingle();

  if (messageError) throw messageError;
  if (!message) return { matched: false };

  const mapped = mapResendStatus(eventType);
  const occurredAt = timestampFor(payload.created_at);
  const updatePayload: Record<string, unknown> = {
    delivery_status: mapped.status,
    delivery_detail: mapped.detail,
    last_delivery_event_at: occurredAt
  };

  if (mapped.messageStatus) updatePayload.status = mapped.messageStatus;
  if (["delivered"].includes(mapped.status)) updatePayload.delivered_at = occurredAt;
  if (["opened", "clicked"].includes(mapped.status)) updatePayload.read_at = occurredAt;
  if (["failed", "bounced", "complained", "suppressed"].includes(mapped.status)) updatePayload.failed_at = occurredAt;

  const { error: eventError } = await supabase.from("outbound_message_events").insert({
    workspace_id: message.workspace_id,
    outbound_message_id: message.id,
    provider: "resend",
    provider_message_id: providerMessageId,
    provider_event_id: providerEventId,
    event_type: eventType,
    delivery_status: mapped.status,
    summary: mapped.detail,
    occurred_at: occurredAt,
    metadata: payload
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

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    return jsonResponse({ error: "Missing server environment configuration" }, 500);
  }

  const payloadText = await request.text();
  const svixId = request.headers.get("svix-id") ?? "";
  const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
  const svixSignature = request.headers.get("svix-signature") ?? "";

  const verified = await verifySvixSignature({
    payload: payloadText,
    webhookId: svixId,
    timestamp: svixTimestamp,
    signatureHeader: svixSignature,
    secret: webhookSecret
  }).catch(() => false);

  if (!verified) {
    return jsonResponse({ error: "Invalid webhook signature" }, 401);
  }

  const payload = JSON.parse(payloadText) as Record<string, unknown>;
  const eventType = cleanText(payload.type);
  const data = payload.data as Record<string, unknown> | undefined;
  const providerMessageId = cleanText(data?.email_id);

  if (!eventType || !providerMessageId) {
    return jsonResponse({ ok: true, ignored: true });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const result = await recordResendEvent({
    supabase,
    providerMessageId,
    providerEventId: svixId,
    eventType,
    payload
  });

  return jsonResponse({ ok: true, provider: "resend", ...result });
});
