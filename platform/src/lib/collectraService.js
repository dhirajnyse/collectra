import { supabase } from "./supabaseClient.js";
import { demoSeedBundle } from "./seedData.js";

const emptyWorkspaceBundle = {
  workspace: null,
  customers: [],
  deals: [],
  invoices: [],
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

  const [workspaceResult, customersResult, dealsResult, invoicesResult, auditLogsResult] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", workspaceId).single(),
    supabase.from("customers").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("deals").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("audit_logs").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(25)
  ]);

  const error = workspaceResult.error || customersResult.error || dealsResult.error || invoicesResult.error || auditLogsResult.error;
  if (error) throw error;

  return {
    workspace: workspaceResult.data,
    customers: customersResult.data ?? [],
    deals: dealsResult.data ?? [],
    invoices: invoicesResult.data ?? [],
    auditLogs: auditLogsResult.data ?? []
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
    message: `Seeded ${customers?.length ?? 0} customers, ${deals?.length ?? 0} deals, and ${invoices?.length ?? 0} invoices.`
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
