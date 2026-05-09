import { supabase } from "./supabaseClient.js";
import { demoSeedBundle } from "./seedData.js";

const emptyWorkspaceBundle = {
  workspace: null,
  customers: [],
  deals: [],
  invoices: [],
  followups: [],
  outboundMessages: [],
  emailSettings: null,
  auditLogs: []
};

function missingSupabaseResult() {
  return {
    ok: false,
    message: "Supabase credentials are not configured yet."
  };
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanOptionalText(value) {
  const nextValue = cleanText(value);
  return nextValue || null;
}

function cleanAmount(value) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 0;
}

function hasLiveData(bundle) {
  return Boolean(bundle.customers.length || bundle.deals.length || bundle.invoices.length);
}

function isMissingRpc(error) {
  return error?.code === "PGRST202" || error?.code === "42883" || String(error?.message ?? "").includes("seed_demo_workspace");
}

function seedMessage(counts, method) {
  const customers = counts?.customers ?? 0;
  const deals = counts?.deals ?? 0;
  const invoices = counts?.invoices ?? 0;
  const suffix = method === "database_rpc" ? " using the database RPC." : ".";
  return `Seeded ${customers} customers, ${deals} deals, and ${invoices} invoices${suffix}`;
}

function cleanChannel(value) {
  return ["email", "whatsapp", "manual"].includes(value) ? value : "manual";
}

function cleanEmailStatus(value) {
  return ["draft", "active", "disabled"].includes(value) ? value : "draft";
}

export async function sendMagicLink(email) {
  if (!supabase) {
    return missingSupabaseResult();
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: "Magic link sent. Check your email." };
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function subscribeToAuthChanges(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function listWorkspaces() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, location, industry, currency, created_at)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((membership) => ({
    role: membership.role,
    workspace: membership.workspaces
  })).filter((item) => item.workspace);
}

export async function fetchWorkspaceBundle(workspaceId) {
  if (!supabase || !workspaceId) {
    return { ...emptyWorkspaceBundle };
  }

  const [workspaceResult, customersResult, dealsResult, invoicesResult, followupsResult, outboundMessagesResult, emailSettingsResult, auditLogsResult] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", workspaceId).single(),
    supabase.from("customers").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("deals").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("ai_followups").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(10),
    supabase.from("outbound_messages").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    supabase.from("workspace_email_settings").select("*").eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("audit_logs").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(25)
  ]);

  const error = workspaceResult.error || customersResult.error || dealsResult.error || invoicesResult.error || followupsResult.error || outboundMessagesResult.error || emailSettingsResult.error || auditLogsResult.error;
  if (error) throw error;

  return {
    workspace: workspaceResult.data,
    customers: customersResult.data ?? [],
    deals: dealsResult.data ?? [],
    invoices: invoicesResult.data ?? [],
    followups: followupsResult.data ?? [],
    outboundMessages: outboundMessagesResult.data ?? [],
    emailSettings: emailSettingsResult.data ?? null,
    auditLogs: auditLogsResult.data ?? []
  };
}

export async function generateFollowupDraft({ workspaceId, invoiceId, tone = "friendly" }) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !invoiceId) {
    return {
      ok: false,
      message: "Choose a workspace and invoice first."
    };
  }

  const { data, error } = await supabase.functions.invoke("generate-followup", {
    body: {
      workspaceId,
      invoiceId,
      tone
    }
  });

  if (error) {
    return {
      ok: false,
      message: error.message || "AI follow-up function failed."
    };
  }

  if (data?.error) {
    return {
      ok: false,
      message: data.error
    };
  }

  return {
    ok: true,
    followup: data.followup,
    draft: data.draft,
    message: "AI follow-up draft generated."
  };
}

export async function queueOutboundMessage({
  workspaceId,
  followupId = null,
  invoiceId = null,
  customerId = null,
  channel = "manual",
  recipient = "",
  subject = "",
  message = ""
}) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !message) {
    return {
      ok: false,
      message: "Choose a workspace and message before queueing."
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Sign in before queueing an outbound message."
    };
  }

  const payload = {
    workspace_id: workspaceId,
    followup_id: followupId,
    invoice_id: invoiceId,
    customer_id: customerId,
    created_by: userId,
    channel: cleanChannel(channel),
    recipient: cleanOptionalText(recipient),
    subject: cleanOptionalText(subject),
    message: cleanText(message),
    status: "queued",
    approved_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("outbound_messages")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  const audit = await writeAuditLog({
    workspaceId,
    action: "outbound_message.queued",
    entityType: "outbound_message",
    entityId: data.id,
    summary: `${data.channel} follow-up queued for review`,
    metadata: {
      followup_id: followupId,
      invoice_id: invoiceId,
      channel: data.channel
    }
  });

  return {
    ok: true,
    outboundMessage: data,
    audit,
    message: "Follow-up queued for outbound review."
  };
}

export async function saveEmailSettings({
  workspaceId,
  provider = "resend",
  fromName = "",
  fromEmail = "",
  replyTo = "",
  status = "draft"
}) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !cleanText(fromEmail)) {
    return {
      ok: false,
      message: "Workspace and from email are required."
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Sign in before saving email settings."
    };
  }

  const payload = {
    workspace_id: workspaceId,
    created_by: userId,
    provider: provider === "resend" ? "resend" : "resend",
    from_name: cleanOptionalText(fromName),
    from_email: cleanText(fromEmail),
    reply_to: cleanOptionalText(replyTo),
    status: cleanEmailStatus(status)
  };

  const { data, error } = await supabase
    .from("workspace_email_settings")
    .upsert(payload, { onConflict: "workspace_id" })
    .select("*")
    .single();

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  const audit = await writeAuditLog({
    workspaceId,
    action: "email_settings.saved",
    entityType: "workspace_email_settings",
    entityId: data.id,
    summary: "Workspace email settings saved",
    metadata: {
      provider: data.provider,
      status: data.status
    }
  });

  return {
    ok: true,
    emailSettings: data,
    audit,
    message: "Email settings saved."
  };
}

export async function sendQueuedEmail({ workspaceId, outboundMessageId }) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !outboundMessageId) {
    return {
      ok: false,
      message: "Choose a queued email first."
    };
  }

  const { data, error } = await supabase.functions.invoke("send-queued-email", {
    body: {
      workspaceId,
      outboundMessageId
    }
  });

  if (error) {
    return {
      ok: false,
      message: error.message || "Send email function failed."
    };
  }

  if (data?.error) {
    return {
      ok: false,
      message: data.error
    };
  }

  return {
    ok: true,
    outboundMessage: data.outboundMessage,
    provider: data.provider,
    providerMessageId: data.providerMessageId,
    message: "Queued email sent."
  };
}

export async function createWorkspace(name, location = "") {
  if (!supabase) {
    return missingSupabaseResult();
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Sign in before creating a workspace."
    };
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name, location, owner_id: userId })
    .select("*")
    .single();

  if (workspaceError) {
    return { ok: false, message: workspaceError.message };
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: userId, role: "owner" });

  if (memberError) {
    return { ok: false, message: memberError.message };
  }

  await writeAuditLog({
    workspaceId: workspace.id,
    action: "workspace.created",
    entityType: "workspace",
    entityId: workspace.id,
    summary: `Workspace ${workspace.name} created`
  });

  return {
    ok: true,
    workspace,
    message: "Workspace created."
  };
}

export async function createCustomer(workspaceId, customer) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId) {
    return { ok: false, message: "Choose a workspace first." };
  }

  const payload = {
    workspace_id: workspaceId,
    name: cleanText(customer.name),
    contact: cleanOptionalText(customer.contact),
    email: cleanOptionalText(customer.email),
    phone: cleanOptionalText(customer.phone),
    segment: cleanOptionalText(customer.segment),
    terms: cleanOptionalText(customer.terms),
    notes: cleanOptionalText(customer.notes)
  };

  if (!payload.name) {
    return { ok: false, message: "Customer name is required." };
  }

  const { data, error } = await supabase
    .from("customers")
    .insert(payload)
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  const audit = await writeAuditLog({
    workspaceId,
    action: "customer.created",
    entityType: "customer",
    entityId: data.id,
    summary: `Customer ${data.name} created`
  });

  return {
    ok: true,
    customer: data,
    audit,
    message: "Customer created."
  };
}

export async function updateCustomer(workspaceId, customerId, patch) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !customerId) {
    return { ok: false, message: "Choose a customer first." };
  }

  const payload = {};
  ["name", "contact", "email", "phone", "segment", "terms", "notes"].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      payload[key] = key === "name" ? cleanText(patch[key]) : cleanOptionalText(patch[key]);
    }
  });

  if (Object.prototype.hasOwnProperty.call(payload, "name") && !payload.name) {
    return { ok: false, message: "Customer name is required." };
  }

  if (!Object.keys(payload).length) {
    return { ok: false, message: "No customer fields changed." };
  }

  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("workspace_id", workspaceId)
    .eq("id", customerId)
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  const audit = await writeAuditLog({
    workspaceId,
    action: "customer.updated",
    entityType: "customer",
    entityId: data.id,
    summary: `Customer ${data.name} updated`,
    metadata: { fields: Object.keys(payload) }
  });

  return {
    ok: true,
    customer: data,
    audit,
    message: "Customer updated."
  };
}

export async function createDeal(workspaceId, deal) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId) {
    return { ok: false, message: "Choose a workspace first." };
  }

  const payload = {
    workspace_id: workspaceId,
    customer_id: deal.customer_id || null,
    title: cleanText(deal.title),
    value: cleanAmount(deal.value),
    stage: cleanText(deal.stage) || "lead",
    owner: cleanOptionalText(deal.owner),
    next_action: cleanOptionalText(deal.next_action)
  };

  if (!payload.title) {
    return { ok: false, message: "Deal title is required." };
  }

  const { data, error } = await supabase
    .from("deals")
    .insert(payload)
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  const audit = await writeAuditLog({
    workspaceId,
    action: "deal.created",
    entityType: "deal",
    entityId: data.id,
    summary: `Deal ${data.title} created`,
    metadata: { value: data.value, stage: data.stage }
  });

  return {
    ok: true,
    deal: data,
    audit,
    message: "Deal created."
  };
}

export async function createInvoice(workspaceId, invoice) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId) {
    return { ok: false, message: "Choose a workspace first." };
  }

  const payload = {
    workspace_id: workspaceId,
    customer_id: invoice.customer_id || null,
    invoice_number: cleanText(invoice.invoice_number),
    amount: cleanAmount(invoice.amount),
    due_date: cleanOptionalText(invoice.due_date),
    status: cleanText(invoice.status) || "open"
  };

  if (!payload.invoice_number) {
    return { ok: false, message: "Invoice number is required." };
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert(payload)
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  const audit = await writeAuditLog({
    workspaceId,
    action: "invoice.created",
    entityType: "invoice",
    entityId: data.id,
    summary: `Invoice ${data.invoice_number} created`,
    metadata: { amount: data.amount, status: data.status }
  });

  return {
    ok: true,
    invoice: data,
    audit,
    message: "Invoice created."
  };
}

export async function markInvoicePaid(workspaceId, invoiceId) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !invoiceId) {
    return { ok: false, message: "Choose an invoice first." };
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "paid" })
    .eq("workspace_id", workspaceId)
    .eq("id", invoiceId)
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  const audit = await writeAuditLog({
    workspaceId,
    action: "invoice.marked_paid",
    entityType: "invoice",
    entityId: data.id,
    summary: `Invoice ${data.invoice_number} marked paid`,
    metadata: { amount: data.amount }
  });

  return {
    ok: true,
    invoice: data,
    audit,
    message: "Invoice marked paid."
  };
}

export async function seedDemoWorkspace(workspaceId) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId) {
    return { ok: false, message: "Choose a workspace first." };
  }

  const rpcResult = await supabase.rpc("seed_demo_workspace", {
    target_workspace_id: workspaceId
  });

  if (!rpcResult.error) {
    return {
      ok: true,
      counts: rpcResult.data,
      method: rpcResult.data?.method ?? "database_rpc",
      message: seedMessage(rpcResult.data, "database_rpc")
    };
  }

  if (!isMissingRpc(rpcResult.error)) {
    return {
      ok: false,
      method: "database_rpc",
      message: rpcResult.error.message
    };
  }

  const currentBundle = await fetchWorkspaceBundle(workspaceId);
  if (hasLiveData(currentBundle)) {
    return {
      ok: false,
      message: "This workspace already has live data. Create a fresh workspace before seeding the demo set."
    };
  }

  const customerPayload = demoSeedBundle.customers.map(({ key, ...customer }) => ({
    ...customer,
    workspace_id: workspaceId
  }));

  const { data: customers, error: customerError } = await supabase
    .from("customers")
    .insert(customerPayload)
    .select("*");

  if (customerError) return { ok: false, message: customerError.message };

  const keyToCustomerName = new Map(demoSeedBundle.customers.map((customer) => [customer.key, customer.name]));
  const customerIdByName = new Map((customers ?? []).map((customer) => [customer.name, customer.id]));
  const customerIdByKey = (key) => customerIdByName.get(keyToCustomerName.get(key)) ?? null;

  const dealPayload = demoSeedBundle.deals.map(({ customerKey, ...deal }) => ({
    ...deal,
    workspace_id: workspaceId,
    customer_id: customerIdByKey(customerKey)
  }));

  const { data: deals, error: dealError } = await supabase
    .from("deals")
    .insert(dealPayload)
    .select("*");

  if (dealError) return { ok: false, message: dealError.message };

  const invoicePayload = demoSeedBundle.invoices.map(({ customerKey, ...invoice }) => ({
    ...invoice,
    workspace_id: workspaceId,
    customer_id: customerIdByKey(customerKey)
  }));

  const { data: invoices, error: invoiceError } = await supabase
    .from("invoices")
    .insert(invoicePayload)
    .select("*");

  if (invoiceError) return { ok: false, message: invoiceError.message };

  const audit = await writeAuditLog({
    workspaceId,
    action: "workspace.seeded",
    entityType: "workspace",
    entityId: workspaceId,
    summary: "Demo customers, deals, and invoices seeded",
    metadata: {
      customers: customers?.length ?? 0,
      deals: deals?.length ?? 0,
      invoices: invoices?.length ?? 0
    }
  });

  return {
    ok: true,
    audit,
    method: "browser_fallback",
    counts: {
      customers: customers?.length ?? 0,
      deals: deals?.length ?? 0,
      invoices: invoices?.length ?? 0
    },
    message: seedMessage({
      customers: customers?.length ?? 0,
      deals: deals?.length ?? 0,
      invoices: invoices?.length ?? 0
    }, "browser_fallback")
  };
}

export async function writeAuditLog({ workspaceId, action, entityType, entityId = null, summary = "", metadata = {} }) {
  if (!supabase) {
    return missingSupabaseResult();
  }

  const session = await getSession();
  const actorId = session?.user?.id;
  if (!actorId) {
    return {
      ok: false,
      message: "Sign in before writing audit logs."
    };
  }

  const { error } = await supabase.from("audit_logs").insert({
    workspace_id: workspaceId,
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    summary,
    metadata
  });

  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: "Audit log written." };
}
