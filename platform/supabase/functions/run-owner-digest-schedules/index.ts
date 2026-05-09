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

function cleanRiskScore(value: unknown) {
  return cleanInteger(value, 0, 0, 100);
}

function hasAutomationSecret(request: Request, expectedSecret: string) {
  const headerSecret = cleanText(request.headers.get("x-collectra-automation-secret"));
  const bearerSecret = cleanText(request.headers.get("Authorization")).replace(/^Bearer\s+/i, "");
  return Boolean(expectedSecret && (headerSecret === expectedSecret || bearerSecret === expectedSecret));
}

function isDue(nextRunAt: unknown, now: Date) {
  const text = cleanText(nextRunAt);
  if (!text) return true;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) || date.getTime() <= now.getTime();
}

function nextRunAt(cadence: unknown, now: Date) {
  const nextRun = new Date(now);
  const cadenceText = cleanText(cadence);
  if (cadenceText === "daily") {
    nextRun.setDate(nextRun.getDate() + 1);
  } else if (cadenceText === "monthly") {
    nextRun.setMonth(nextRun.getMonth() + 1);
  } else {
    nextRun.setDate(nextRun.getDate() + 7);
  }
  nextRun.setHours(9, 0, 0, 0);
  return nextRun.toISOString();
}

function actionIsOverdue(action: Record<string, unknown>, now: Date) {
  const dueAt = cleanText(action.due_at);
  if (!dueAt) return false;
  const date = new Date(dueAt);
  return !Number.isNaN(date.getTime()) && date.getTime() < now.getTime();
}

function digestForSchedule({
  schedule,
  actions,
  now
}: {
  schedule: Record<string, unknown>;
  actions: Record<string, unknown>[];
  now: Date;
}) {
  const ownerLabel = cleanText(schedule.owner_label) || "Finance owner";
  const overdueActions = actions.filter((action) => actionIsOverdue(action, now));
  const escalatedActions = actions.filter((action) => Number(action.escalation_level ?? 0) > 0);
  const totalRiskScore = actions.reduce((sum, action) => sum + cleanRiskScore(action.risk_score), 0);
  const actionLines = actions.slice(0, 6).map((action, index) => {
    const dueText = cleanText(action.due_at) || "No due time";
    const escalationText = Number(action.escalation_level ?? 0) > 0 ? `, level ${action.escalation_level}` : "";
    return `${index + 1}. ${cleanText(action.action_label)} (${cleanText(action.action_channel)}, ${cleanRiskScore(action.risk_score)}/100${escalationText}) due ${dueText}`;
  });

  const subject = `${ownerLabel} scheduled cash digest: ${actions.length} open action${actions.length === 1 ? "" : "s"}`;
  const body = [
    `Owner: ${ownerLabel}`,
    `Open actions: ${actions.length}`,
    `Overdue: ${overdueActions.length}`,
    `Escalated: ${escalatedActions.length}`,
    `Total risk score: ${totalRiskScore}`,
    "",
    "Priority actions:",
    ...actionLines
  ].join("\n");

  return {
    ownerLabel,
    subject,
    body,
    actionCount: actions.length,
    overdueCount: overdueActions.length,
    escalatedCount: escalatedActions.length,
    totalRiskScore,
    actionIds: actions.map((action) => action.id)
  };
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
  const batchSize = cleanInteger(body.batchSize, 20, 1, 50);
  const dryRun = body.dryRun === true;
  const now = new Date();
  const nowIso = now.toISOString();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  let scheduleQuery = supabase
    .from("owner_digest_schedules")
    .select("*")
    .eq("status", "active")
    .order("next_run_at", { ascending: true, nullsFirst: true })
    .limit(batchSize);

  if (workspaceId) {
    scheduleQuery = scheduleQuery.eq("workspace_id", workspaceId);
  }

  const { data: schedules, error: scheduleError } = await scheduleQuery;
  if (scheduleError) throw scheduleError;

  const dueSchedules = (schedules ?? []).filter((schedule) => isDue(schedule.next_run_at, now));
  const queued = [];
  const skipped = [];

  for (const schedule of dueSchedules) {
    const nextRun = nextRunAt(schedule.cadence, now);
    const { data: actions, error: actionError } = await supabase
      .from("collection_actions")
      .select("*")
      .eq("workspace_id", schedule.workspace_id)
      .eq("status", "open")
      .eq("owner_label", schedule.owner_label)
      .order("due_at", { ascending: true })
      .order("risk_score", { ascending: false });

    if (actionError) throw actionError;
    const openActions = actions ?? [];

    if (!openActions.length) {
      if (!dryRun) {
        await supabase
          .from("owner_digest_schedules")
          .update({
            next_run_at: nextRun,
            metadata: {
              ...(schedule.metadata ?? {}),
              last_runner: {
                checked_at: nowIso,
                result: "no_open_actions"
              }
            }
          })
          .eq("workspace_id", schedule.workspace_id)
          .eq("id", schedule.id);
      }
      skipped.push({ id: schedule.id, workspaceId: schedule.workspace_id, ownerLabel: schedule.owner_label, reason: "no open actions" });
      continue;
    }

    const digest = digestForSchedule({
      schedule,
      actions: openActions,
      now
    });

    if (dryRun) {
      queued.push({
        scheduleId: schedule.id,
        workspaceId: schedule.workspace_id,
        ownerLabel: digest.ownerLabel,
        actionCount: digest.actionCount,
        dryRun: true
      });
      continue;
    }

    const { data: ownerDigest, error: digestError } = await supabase
      .from("owner_digest_runs")
      .insert({
        workspace_id: schedule.workspace_id,
        created_by: null,
        owner_profile_id: cleanText(schedule.owner_profile_id) || null,
        owner_label: digest.ownerLabel,
        subject: digest.subject,
        body: digest.body,
        action_count: digest.actionCount,
        overdue_count: digest.overdueCount,
        escalated_count: digest.escalatedCount,
        total_risk_score: digest.totalRiskScore,
        status: "review_pending",
        metadata: {
          source: "owner_digest_schedule",
          owner_digest_schedule_id: schedule.id,
          action_ids: digest.actionIds,
          review_status: "pending",
          review_requested_at: nowIso
        }
      })
      .select("*")
      .single();

    if (digestError) throw digestError;

    const channel = cleanText(schedule.channel) || "manual";
    const recipient = cleanText(schedule.recipient) || digest.ownerLabel;
    const { data: outboundMessage, error: outboundError } = await supabase
      .from("outbound_messages")
      .insert({
        workspace_id: schedule.workspace_id,
        created_by: null,
        channel,
        recipient,
        subject: digest.subject,
        message: digest.body,
        status: "queued",
        review_status: "pending",
        delivery_status: "not_sent",
        review_note: "Scheduled owner digest requires approval before provider delivery.",
        metadata: {
          source: "owner_digest_schedule",
          owner_digest_id: ownerDigest.id,
          owner_digest_schedule_id: schedule.id,
          owner_label: digest.ownerLabel,
          cadence: schedule.cadence,
          action_count: digest.actionCount,
          overdue_count: digest.overdueCount,
          escalated_count: digest.escalatedCount,
          total_risk_score: digest.totalRiskScore
        }
      })
      .select("*")
      .single();

    if (outboundError) throw outboundError;

    const { data: queuedDigest, error: digestUpdateError } = await supabase
      .from("owner_digest_runs")
      .update({
        status: "review_pending",
        queued_outbound_message_id: outboundMessage.id,
        metadata: {
          ...(ownerDigest.metadata ?? {}),
          queued_outbound_message_id: outboundMessage.id,
          queued_channel: channel,
          queued_recipient: recipient,
          review_status: "pending",
          review_requested_at: nowIso
        }
      })
      .eq("workspace_id", schedule.workspace_id)
      .eq("id", ownerDigest.id)
      .select("*")
      .single();

    if (digestUpdateError) throw digestUpdateError;

    const { error: scheduleUpdateError } = await supabase
      .from("owner_digest_schedules")
      .update({
        last_queued_at: nowIso,
        next_run_at: nextRun,
        metadata: {
          ...(schedule.metadata ?? {}),
            last_runner: {
              checked_at: nowIso,
              result: "review_pending",
              owner_digest_id: queuedDigest.id,
              outbound_message_id: outboundMessage.id
            }
        }
      })
      .eq("workspace_id", schedule.workspace_id)
      .eq("id", schedule.id);

    if (scheduleUpdateError) throw scheduleUpdateError;

    await supabase.from("audit_logs").insert([
      {
        workspace_id: schedule.workspace_id,
        actor_id: null,
        action: "owner_digest.created",
        entity_type: "owner_digest",
        entity_id: ownerDigest.id,
        summary: `${digest.ownerLabel} scheduled digest created`,
        metadata: {
          owner_digest_schedule_id: schedule.id,
          action_count: digest.actionCount,
          overdue_count: digest.overdueCount,
          escalated_count: digest.escalatedCount,
          total_risk_score: digest.totalRiskScore
        }
      },
      {
        workspace_id: schedule.workspace_id,
        actor_id: null,
        action: "outbound_message.review_pending",
        entity_type: "outbound_message",
        entity_id: outboundMessage.id,
        summary: `${channel} scheduled owner digest waiting for approval`,
        metadata: {
          owner_digest_id: ownerDigest.id,
          owner_digest_schedule_id: schedule.id,
          owner_label: digest.ownerLabel,
          source: "owner_digest_schedule",
          review_status: outboundMessage.review_status
        }
      },
      {
        workspace_id: schedule.workspace_id,
        actor_id: null,
        action: "owner_digest.review_pending",
        entity_type: "owner_digest",
        entity_id: ownerDigest.id,
        summary: `${digest.ownerLabel} scheduled digest waiting for approval`,
        metadata: {
          outbound_message_id: outboundMessage.id,
          owner_digest_schedule_id: schedule.id,
          channel,
          recipient,
          review_status: outboundMessage.review_status
        }
      },
      {
        workspace_id: schedule.workspace_id,
        actor_id: null,
        action: "owner_digest_schedule.run_queued",
        entity_type: "owner_digest_schedule",
        entity_id: schedule.id,
        summary: `${digest.ownerLabel} schedule created a review item`,
        metadata: {
          owner_digest_id: ownerDigest.id,
          outbound_message_id: outboundMessage.id,
          review_status: outboundMessage.review_status,
          next_run_at: nextRun
        }
      }
    ]);

    queued.push({
      scheduleId: schedule.id,
      workspaceId: schedule.workspace_id,
      ownerLabel: digest.ownerLabel,
      ownerDigestId: ownerDigest.id,
      outboundMessageId: outboundMessage.id,
      actionCount: digest.actionCount,
      reviewStatus: outboundMessage.review_status,
      nextRunAt: nextRun
    });
  }

  return jsonResponse({
    ok: true,
    dryRun,
    checked: schedules?.length ?? 0,
    due: dueSchedules.length,
    queued: queued.length,
    skipped: skipped.length,
    results: queued,
    skippedResults: skipped
  });
});
