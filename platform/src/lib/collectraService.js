import { supabase } from "./supabaseClient.js";

export async function sendMagicLink(email) {
  if (!supabase) {
    return {
      ok: false,
      message: "Supabase credentials are not configured yet."
    };
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

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function fetchWorkspaceBundle(workspaceId) {
  if (!supabase || !workspaceId) {
    return {
      workspace: null,
      customers: [],
      deals: [],
      invoices: [],
      auditLogs: []
    };
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
    return {
      ok: false,
      message: "Supabase credentials are not configured yet."
    };
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

export async function writeAuditLog({ workspaceId, action, entityType, entityId = null, summary = "", metadata = {} }) {
  if (!supabase) {
    return {
      ok: false,
      message: "Supabase credentials are not configured yet."
    };
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
