import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-collectra-automation-secret",
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

function cleanInteger(value: unknown, fallback: number, min: number, max: number) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(nextValue)));
}

function hasAutomationSecret(request: Request, expectedSecret: string) {
  const headerSecret = cleanText(request.headers.get("x-collectra-automation-secret"));
  const bearerSecret = cleanText(request.headers.get("Authorization")).replace(/^Bearer\s+/i, "");
  return Boolean(expectedSecret && (headerSecret === expectedSecret || bearerSecret === expectedSecret));
}

function isDue(nextRetryAt: unknown, now: Date) {
  const text = cleanText(nextRetryAt);
  if (!text) return true;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) || date.getTime() <= now.getTime();
}

async function insertRetryEvent({
  supabase,
  message,
  retryCount,
  occurredAt,
  maxRetries
}: {
  supabase: ReturnType<typeof createClient>;
  message: Record<string, unknown>;
  retryCount: number;
  occurredAt: string;
  maxRetries: number;
}) {
  const { error } = await supabase.from("outbound_message_events").insert({
    workspace_id: message.workspace_id,
    outbound_message_id: message.id,
    provider: "collectra",
    provider_event_id: `retry:${message.id}:${retryCount}:${occurredAt}`,
    event_type: "retry.queued",
    delivery_status: "not_sent",
    summary: `Retry ${retryCount} queued by automation`,
    occurred_at: occurredAt,
    metadata: {
      max_retries: maxRetries,
      previous_status: message.status,
      previous_delivery_status: message.delivery_status,
      previous_detail: message.delivery_detail
    }
  });

  if (error?.code !== "23505" && error) throw error;
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
  const automationSecret = Deno.env.get("SUPABASE_AUTOMATION_SECRET") ?? "";

  if (!supabaseUrl || !serviceRoleKey || !automationSecret) {
    return jsonResponse({ error: "Missing server environment configuration" }, 500);
  }

  if (!hasAutomationSecret(request, automationSecret)) {
    return jsonResponse({ error: "Automation secret required" }, 401);
  }

  const body = await request.json().catch(() => ({}));
  const workspaceId = cleanText(body.workspaceId);
  const batchSize = cleanInteger(body.batchSize, 25, 1, 50);
  const maxRetries = cleanInteger(body.maxRetries, 3, 1, 10);
  const dryRun = body.dryRun === true;
  const now = new Date();
  const nowIso = now.toISOString();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  let query = supabase
    .from("outbound_messages")
    .select("*")
    .eq("status", "failed")
    .in("channel", ["email", "whatsapp"])
    .lt("retry_count", maxRetries)
    .order("failed_at", { ascending: true })
    .limit(batchSize);

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  const { data: failedMessages, error: fetchError } = await query;
  if (fetchError) throw fetchError;

  const dueMessages = (failedMessages ?? []).filter((message) => isDue(message.next_retry_at, now));
  const queued = [];
  const skipped = [];

  for (const message of dueMessages) {
    const retryCount = Number(message.retry_count ?? 0) + 1;

    if (dryRun) {
      queued.push({ id: message.id, workspaceId: message.workspace_id, retryCount, dryRun: true });
      continue;
    }

    const updatePayload = {
      status: "queued",
      delivery_status: "not_sent",
      delivery_detail: `Retry ${retryCount} queued by automation`,
      sent_at: null,
      delivered_at: null,
      read_at: null,
      failed_at: null,
      last_delivery_event_at: nowIso,
      retry_count: retryCount,
      next_retry_at: null,
      provider_message_id: null,
      metadata: {
        ...(message.metadata ?? {}),
        retry: {
          queued_at: nowIso,
          retry_count: retryCount,
          max_retries: maxRetries,
          previous_delivery_status: message.delivery_status
        }
      }
    };

    const { data: updated, error: updateError } = await supabase
      .from("outbound_messages")
      .update(updatePayload)
      .eq("id", message.id)
      .eq("workspace_id", message.workspace_id)
      .eq("status", "failed")
      .select("id, workspace_id")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updated) {
      skipped.push({ id: message.id, reason: "status changed before retry" });
      continue;
    }

    await insertRetryEvent({
      supabase,
      message,
      retryCount,
      occurredAt: nowIso,
      maxRetries
    });

    await supabase.from("audit_logs").insert({
      workspace_id: message.workspace_id,
      actor_id: null,
      action: "outbound_message.retry_queued",
      entity_type: "outbound_message",
      entity_id: message.id,
      summary: `Retry ${retryCount} queued by automation`,
      metadata: {
        max_retries: maxRetries,
        previous_delivery_status: message.delivery_status
      }
    });

    queued.push({ id: message.id, workspaceId: message.workspace_id, retryCount });
  }

  return jsonResponse({
    ok: true,
    dryRun,
    checked: failedMessages?.length ?? 0,
    due: dueMessages.length,
    queued: queued.length,
    skipped: skipped.length,
    results: queued,
    skippedResults: skipped
  });
});
