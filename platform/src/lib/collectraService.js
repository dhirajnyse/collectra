import { supabase } from "./supabaseClient.js";
import { demoSeedBundle } from "./seedData.js";

const emptyWorkspaceBundle = {
  workspace: null,
  customers: [],
  deals: [],
  invoices: [],
  followups: [],
  outboundMessages: [],
  deliveryEvents: [],
  collectionActions: [],
  ownerDigests: [],
  ownerDigestSchedules: [],
  ownerProfiles: [],
  customerPlaybooks: [],
  accountingConnections: [],
  accountingSyncRuns: [],
  providerOAuthRequests: [],
  providerOAuthCallbackEvents: [],
  providerCredentialVault: [],
  providerTokenExchangeRuns: [],
  bankAccounts: [],
  bankTransactions: [],
  paymentMatchSuggestions: [],
  paymentMatchSplitLines: [],
  paymentAllocations: [],
  paymentAllocationLines: [],
  customerPaymentCredits: [],
  emailSettings: null,
  whatsappSettings: null,
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

function isMissingApprovalRpc(error) {
  return error?.code === "PGRST202" || error?.code === "42883" || String(error?.message ?? "").includes("approve_payment_match");
}

function isMissingReversalRpc(error) {
  return error?.code === "PGRST202" || error?.code === "42883" || String(error?.message ?? "").includes("reverse_payment_allocation");
}

function isMissingTableError(error, tableName) {
  const message = String(error?.message ?? "");
  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || (message.includes("Could not find") && message.includes(tableName));
}

function seedMessage(counts, method) {
  const customers = counts?.customers ?? 0;
  const deals = counts?.deals ?? 0;
  const invoices = counts?.invoices ?? 0;
  const owners = counts?.owners ?? 0;
  const playbooks = counts?.playbooks ?? 0;
  const accountingConnections = counts?.accounting_connections ?? 0;
  const accountingRuns = counts?.accounting_runs ?? 0;
  const oauthRequests = counts?.oauth_requests ?? 0;
  const oauthCallbackEvents = counts?.oauth_callback_events ?? 0;
  const credentialVaultEntries = counts?.credential_vault_entries ?? 0;
  const tokenExchangeRuns = counts?.token_exchange_runs ?? 0;
  const bankAccounts = counts?.bank_accounts ?? 0;
  const bankTransactions = counts?.bank_transactions ?? 0;
  const matchSuggestions = counts?.match_suggestions ?? 0;
  const suffix = method === "database_rpc" ? " using the database RPC." : ".";
  return `Seeded ${customers} customers, ${deals} deals, ${invoices} invoices, ${owners} owner profiles, ${playbooks} customer playbooks, ${accountingConnections} accounting connection, ${accountingRuns} sync runs, ${oauthRequests} OAuth requests, ${oauthCallbackEvents} OAuth callback events, ${credentialVaultEntries} credential vault entries, ${tokenExchangeRuns} token exchange runs, ${bankAccounts} bank account, ${bankTransactions} bank transactions, and ${matchSuggestions} match suggestions${suffix}`;
}

function cleanChannel(value) {
  return ["email", "whatsapp", "manual"].includes(value) ? value : "manual";
}

function cleanEmailStatus(value) {
  return ["draft", "active", "disabled"].includes(value) ? value : "draft";
}

function cleanProviderStatus(value) {
  return ["draft", "active", "disabled"].includes(value) ? value : "draft";
}

function cleanDigestCadence(value) {
  return ["daily", "weekly", "monthly"].includes(value) ? value : "weekly";
}

function cleanDigestScheduleStatus(value) {
  return ["active", "paused", "disabled"].includes(value) ? value : "active";
}

function cleanActionStatus(value) {
  return String(value || "").toLowerCase();
}

function cleanRiskScore(value) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return 0;
  return Math.max(0, Math.min(100, Math.trunc(nextValue)));
}

function cleanEscalationLevel(value) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return 0;
  return Math.max(0, Math.min(3, Math.trunc(nextValue)));
}

function cleanOwnerLabel(value) {
  const label = cleanText(value);
  return label ? label.slice(0, 80) : "Finance owner";
}

function cleanReviewStatus(value) {
  return ["pending", "approved", "rejected"].includes(value) ? value : "pending";
}

function cleanPlaybookBehavior(value) {
  return ["standard", "reliable", "seasonal", "slow_payer", "dispute_prone", "new_account"].includes(value) ? value : "standard";
}

function cleanPreferredContactChannel(value) {
  return ["email", "whatsapp", "phone", "manual"].includes(value) ? value : "email";
}

function cleanReminderTone(value) {
  return ["friendly", "firm", "urgent"].includes(value) ? value : "friendly";
}

function cleanEscalationPolicy(value) {
  return ["standard", "high_touch", "owner_review", "hold"].includes(value) ? value : "standard";
}

function cleanAccountingProvider(value) {
  return ["quickbooks", "xero", "zoho_books", "tally", "manual_csv"].includes(value) ? value : "manual_csv";
}

function cleanAccountingConnectionStatus(value) {
  return ["draft", "sandbox", "active", "paused", "error"].includes(value) ? value : "draft";
}

function cleanAccountingSyncDirection(value) {
  return ["import_payments", "export_invoices", "two_way", "manual_review"].includes(value) ? value : "import_payments";
}

function cleanAccountingRunType(value) {
  return ["manual", "scheduled", "webhook", "dry_run"].includes(value) ? value : "dry_run";
}

function cleanAccountingRunStatus(value) {
  return ["queued", "running", "completed", "failed", "needs_review"].includes(value) ? value : "queued";
}

function cleanProviderIntegrationType(value) {
  return ["accounting", "bank"].includes(value) ? value : "accounting";
}

function cleanProviderOAuthProvider(value) {
  return ["quickbooks", "xero", "zoho_books", "tally", "manual_csv", "plaid", "lean", "tarabut_gateway", "emirates_nbd"].includes(value) ? value : "manual_csv";
}

function cleanProviderOAuthStatus(value) {
  return ["draft", "ready", "redirect_pending", "exchange_pending", "authorized", "expired", "error", "cancelled"].includes(value) ? value : "draft";
}

function cleanCodeChallengeMethod(value) {
  return ["S256", "plain", "not_required"].includes(value) ? value : "S256";
}

function cleanProviderOAuthCallbackStatus(value) {
  return ["received", "validated", "rejected", "exchange_pending", "authorized", "error"].includes(value) ? value : "received";
}

function cleanProviderCredentialStatus(value) {
  return ["pending_exchange", "active", "rotation_due", "revoked", "error"].includes(value) ? value : "pending_exchange";
}

function cleanProviderTokenExchangeMode(value) {
  return ["authorization_code", "refresh_token", "dry_run"].includes(value) ? value : "authorization_code";
}

function cleanProviderTokenExchangeStatus(value) {
  return ["prepared", "blocked", "exchanging", "vaulted", "failed"].includes(value) ? value : "prepared";
}

function cleanBankAccountStatus(value) {
  return ["draft", "active", "paused", "error"].includes(value) ? value : "draft";
}

function cleanBankTransactionDirection(value) {
  return ["credit", "debit"].includes(value) ? value : "credit";
}

function cleanBankTransactionStatus(value) {
  return ["imported", "matched", "needs_review", "ignored"].includes(value) ? value : "imported";
}

function cleanPaymentMatchStatus(value) {
  return ["suggested", "accepted", "rejected", "needs_review"].includes(value) ? value : "suggested";
}

function cleanPaymentAllocationStatus(value) {
  return ["posted", "reversed"].includes(value) ? value : "posted";
}

function cleanCustomerCreditStatus(value) {
  return ["open", "applied", "void"].includes(value) ? value : "open";
}

function cleanInvoiceStatus(value) {
  return ["open", "due", "overdue", "partial", "paid"].includes(value) ? value : "open";
}

function cleanConfidence(value) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return 0;
  return Math.max(0, Math.min(100, Math.trunc(nextValue)));
}

function cleanCount(value) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return 0;
  return Math.max(0, Math.trunc(nextValue));
}

function cleanRiskWeight(value) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return 0;
  return Math.max(-20, Math.min(30, Math.trunc(nextValue)));
}

function cleanDaysBeforeDue(value) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return 3;
  return Math.max(0, Math.min(30, Math.trunc(nextValue)));
}

function cleanMetadata(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function invoiceStatusAfterPayment(invoice, allocatedAmount, previousStatus = "") {
  const invoiceAmount = cleanAmount(invoice?.amount);
  const nextAllocatedAmount = cleanAmount(allocatedAmount);
  if (invoiceAmount > 0 && nextAllocatedAmount >= invoiceAmount) return "paid";
  if (nextAllocatedAmount > 0) return "partial";
  if (["open", "due", "overdue"].includes(previousStatus)) return previousStatus;
  const dueDate = cleanOptionalText(invoice?.due_date);
  if (!dueDate) return "open";
  const due = new Date(`${dueDate}T00:00:00`).getTime();
  if (!Number.isFinite(due)) return "open";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due - today.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "due";
  return "open";
}

function restoredInvoiceStatus(previousStatus, invoice, remainingAllocatedAmount = 0) {
  return invoiceStatusAfterPayment(invoice, remainingAllocatedAmount, previousStatus);
}

function restoredBankTransactionStatus(previousStatus) {
  return ["imported", "needs_review", "ignored"].includes(previousStatus) ? previousStatus : "needs_review";
}

function restoredPaymentMatchStatus(previousStatus) {
  return ["suggested", "rejected", "needs_review"].includes(previousStatus) ? previousStatus : "needs_review";
}

async function fetchInvoiceAllocatedAmount({ workspaceId, invoiceId, excludedMatchId = null, excludedAllocationId = null }) {
  const { data: allocations, error: allocationsError } = await supabase
    .from("payment_allocations")
    .select("id,amount,payment_match_suggestion_id,status")
    .eq("workspace_id", workspaceId)
    .eq("invoice_id", invoiceId)
    .eq("status", "posted");

  if (allocationsError && !isMissingTableError(allocationsError, "payment_allocations")) {
    return { ok: false, message: allocationsError.message, amount: 0 };
  }

  const allocationAmount = (allocations ?? [])
    .filter((allocation) => !excludedAllocationId || allocation.id !== excludedAllocationId)
    .filter((allocation) => !excludedMatchId || allocation.payment_match_suggestion_id !== excludedMatchId)
    .reduce((sum, allocation) => sum + cleanAmount(allocation.amount), 0);

  const { data: allocationLines, error: allocationLinesError } = await supabase
    .from("payment_allocation_lines")
    .select("payment_allocation_id,payment_match_suggestion_id,amount,status")
    .eq("workspace_id", workspaceId)
    .eq("invoice_id", invoiceId)
    .eq("status", "posted");

  if (allocationLinesError && !isMissingTableError(allocationLinesError, "payment_allocation_lines")) {
    return { ok: false, message: allocationLinesError.message, amount: 0 };
  }

  const lineAmount = (allocationLines ?? [])
    .filter((line) => !excludedAllocationId || line.payment_allocation_id !== excludedAllocationId)
    .filter((line) => !excludedMatchId || line.payment_match_suggestion_id !== excludedMatchId)
    .reduce((sum, line) => sum + cleanAmount(line.amount), 0);

  return { ok: true, amount: allocationAmount + lineAmount };
}

function isActionOverdue(action) {
  if (!action?.due_at) return false;
  const dueAt = new Date(action.due_at).getTime();
  return Number.isFinite(dueAt) && dueAt < Date.now();
}

async function findOwnerProfile(workspaceId, ownerLabel) {
  if (!supabase || !workspaceId) return null;
  const { data, error } = await supabase
    .from("workspace_owner_profiles")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("label", cleanOwnerLabel(ownerLabel))
    .eq("status", "active")
    .maybeSingle();

  return error ? null : data;
}

function nextDigestRunAt(cadence) {
  const nextRun = new Date();
  if (cadence === "daily") {
    nextRun.setDate(nextRun.getDate() + 1);
  } else if (cadence === "monthly") {
    nextRun.setMonth(nextRun.getMonth() + 1);
  } else {
    nextRun.setDate(nextRun.getDate() + 7);
  }
  nextRun.setHours(9, 0, 0, 0);
  return nextRun.toISOString();
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

  const [workspaceResult, customersResult, dealsResult, invoicesResult, followupsResult, outboundMessagesResult, deliveryEventsResult, collectionActionsResult, ownerDigestsResult, ownerDigestSchedulesResult, ownerProfilesResult, customerPlaybooksResult, accountingConnectionsResult, accountingSyncRunsResult, providerOAuthRequestsResult, providerOAuthCallbackEventsResult, providerCredentialVaultResult, providerTokenExchangeRunsResult, bankAccountsResult, bankTransactionsResult, paymentMatchSuggestionsResult, paymentMatchSplitLinesResult, paymentAllocationsResult, paymentAllocationLinesResult, customerPaymentCreditsResult, emailSettingsResult, whatsappSettingsResult, auditLogsResult] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", workspaceId).single(),
    supabase.from("customers").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("deals").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("ai_followups").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(10),
    supabase.from("outbound_messages").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    supabase.from("outbound_message_events").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50),
    supabase.from("collection_actions").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50),
    supabase.from("owner_digest_runs").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    supabase.from("owner_digest_schedules").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    supabase.from("workspace_owner_profiles").select("*").eq("workspace_id", workspaceId).order("label", { ascending: true }).limit(50),
    supabase.from("customer_collection_playbooks").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100),
    supabase.from("workspace_accounting_connections").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    supabase.from("accounting_sync_runs").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    supabase.from("provider_oauth_requests").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    supabase.from("provider_oauth_callback_events").select("*").eq("workspace_id", workspaceId).order("received_at", { ascending: false }).limit(20),
    supabase.from("provider_credential_vault").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    supabase.from("provider_token_exchange_runs").select("*").eq("workspace_id", workspaceId).order("started_at", { ascending: false }).limit(20),
    supabase.from("workspace_bank_accounts").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    supabase.from("bank_transactions").select("*").eq("workspace_id", workspaceId).order("transaction_date", { ascending: false }).limit(50),
    supabase.from("payment_match_suggestions").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50),
    supabase.from("payment_match_split_lines").select("*").eq("workspace_id", workspaceId).order("line_order", { ascending: true }).limit(100),
    supabase.from("payment_allocations").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50),
    supabase.from("payment_allocation_lines").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100),
    supabase.from("customer_payment_credits").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50),
    supabase.from("workspace_email_settings").select("*").eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("workspace_whatsapp_settings").select("*").eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("audit_logs").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(25)
  ]);

  const customerPlaybooksError = customerPlaybooksResult.error && !isMissingTableError(customerPlaybooksResult.error, "customer_collection_playbooks")
    ? customerPlaybooksResult.error
    : null;
  const accountingConnectionsError = accountingConnectionsResult.error && !isMissingTableError(accountingConnectionsResult.error, "workspace_accounting_connections")
    ? accountingConnectionsResult.error
    : null;
  const accountingSyncRunsError = accountingSyncRunsResult.error && !isMissingTableError(accountingSyncRunsResult.error, "accounting_sync_runs")
    ? accountingSyncRunsResult.error
    : null;
  const providerOAuthRequestsError = providerOAuthRequestsResult.error && !isMissingTableError(providerOAuthRequestsResult.error, "provider_oauth_requests")
    ? providerOAuthRequestsResult.error
    : null;
  const providerOAuthCallbackEventsError = providerOAuthCallbackEventsResult.error && !isMissingTableError(providerOAuthCallbackEventsResult.error, "provider_oauth_callback_events")
    ? providerOAuthCallbackEventsResult.error
    : null;
  const providerCredentialVaultError = providerCredentialVaultResult.error && !isMissingTableError(providerCredentialVaultResult.error, "provider_credential_vault")
    ? providerCredentialVaultResult.error
    : null;
  const providerTokenExchangeRunsError = providerTokenExchangeRunsResult.error && !isMissingTableError(providerTokenExchangeRunsResult.error, "provider_token_exchange_runs")
    ? providerTokenExchangeRunsResult.error
    : null;
  const bankAccountsError = bankAccountsResult.error && !isMissingTableError(bankAccountsResult.error, "workspace_bank_accounts")
    ? bankAccountsResult.error
    : null;
  const bankTransactionsError = bankTransactionsResult.error && !isMissingTableError(bankTransactionsResult.error, "bank_transactions")
    ? bankTransactionsResult.error
    : null;
  const paymentMatchSuggestionsError = paymentMatchSuggestionsResult.error && !isMissingTableError(paymentMatchSuggestionsResult.error, "payment_match_suggestions")
    ? paymentMatchSuggestionsResult.error
    : null;
  const paymentMatchSplitLinesError = paymentMatchSplitLinesResult.error && !isMissingTableError(paymentMatchSplitLinesResult.error, "payment_match_split_lines")
    ? paymentMatchSplitLinesResult.error
    : null;
  const paymentAllocationsError = paymentAllocationsResult.error && !isMissingTableError(paymentAllocationsResult.error, "payment_allocations")
    ? paymentAllocationsResult.error
    : null;
  const paymentAllocationLinesError = paymentAllocationLinesResult.error && !isMissingTableError(paymentAllocationLinesResult.error, "payment_allocation_lines")
    ? paymentAllocationLinesResult.error
    : null;
  const customerPaymentCreditsError = customerPaymentCreditsResult.error && !isMissingTableError(customerPaymentCreditsResult.error, "customer_payment_credits")
    ? customerPaymentCreditsResult.error
    : null;
  const error = workspaceResult.error || customersResult.error || dealsResult.error || invoicesResult.error || followupsResult.error || deliveryEventsResult.error || collectionActionsResult.error || ownerDigestsResult.error || ownerDigestSchedulesResult.error || ownerProfilesResult.error || customerPlaybooksError || accountingConnectionsError || accountingSyncRunsError || providerOAuthRequestsError || providerOAuthCallbackEventsError || providerCredentialVaultError || providerTokenExchangeRunsError || bankAccountsError || bankTransactionsError || paymentMatchSuggestionsError || paymentMatchSplitLinesError || paymentAllocationsError || paymentAllocationLinesError || customerPaymentCreditsError || emailSettingsResult.error || whatsappSettingsResult.error || auditLogsResult.error;
  if (error) throw error;

  return {
    workspace: workspaceResult.data,
    customers: customersResult.data ?? [],
    deals: dealsResult.data ?? [],
    invoices: invoicesResult.data ?? [],
    followups: followupsResult.data ?? [],
    outboundMessages: outboundMessagesResult.data ?? [],
    deliveryEvents: deliveryEventsResult.data ?? [],
    collectionActions: collectionActionsResult.data ?? [],
    ownerDigests: ownerDigestsResult.data ?? [],
    ownerDigestSchedules: ownerDigestSchedulesResult.data ?? [],
    ownerProfiles: ownerProfilesResult.data ?? [],
    customerPlaybooks: customerPlaybooksResult.error ? [] : customerPlaybooksResult.data ?? [],
    accountingConnections: accountingConnectionsResult.error ? [] : accountingConnectionsResult.data ?? [],
    accountingSyncRuns: accountingSyncRunsResult.error ? [] : accountingSyncRunsResult.data ?? [],
    providerOAuthRequests: providerOAuthRequestsResult.error ? [] : providerOAuthRequestsResult.data ?? [],
    providerOAuthCallbackEvents: providerOAuthCallbackEventsResult.error ? [] : providerOAuthCallbackEventsResult.data ?? [],
    providerCredentialVault: providerCredentialVaultResult.error ? [] : providerCredentialVaultResult.data ?? [],
    providerTokenExchangeRuns: providerTokenExchangeRunsResult.error ? [] : providerTokenExchangeRunsResult.data ?? [],
    bankAccounts: bankAccountsResult.error ? [] : bankAccountsResult.data ?? [],
    bankTransactions: bankTransactionsResult.error ? [] : bankTransactionsResult.data ?? [],
    paymentMatchSuggestions: paymentMatchSuggestionsResult.error ? [] : paymentMatchSuggestionsResult.data ?? [],
    paymentMatchSplitLines: paymentMatchSplitLinesResult.error ? [] : paymentMatchSplitLinesResult.data ?? [],
    paymentAllocations: paymentAllocationsResult.error ? [] : paymentAllocationsResult.data ?? [],
    paymentAllocationLines: paymentAllocationLinesResult.error ? [] : paymentAllocationLinesResult.data ?? [],
    customerPaymentCredits: customerPaymentCreditsResult.error ? [] : customerPaymentCreditsResult.data ?? [],
    emailSettings: emailSettingsResult.data ?? null,
    whatsappSettings: whatsappSettingsResult.data ?? null,
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
    review_status: "approved",
    delivery_status: "not_sent",
    approved_at: new Date().toISOString(),
    approved_by: userId,
    review_note: "Approved by user when queueing AI draft."
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
      channel: data.channel,
      review_status: data.review_status
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

export async function saveWhatsAppSettings({
  workspaceId,
  provider = "whatsapp_cloud",
  businessLabel = "",
  phoneNumberId = "",
  displayPhone = "",
  status = "draft"
}) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !cleanText(phoneNumberId)) {
    return {
      ok: false,
      message: "Workspace and phone number ID are required."
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Sign in before saving WhatsApp settings."
    };
  }

  const payload = {
    workspace_id: workspaceId,
    created_by: userId,
    provider: provider === "whatsapp_cloud" ? "whatsapp_cloud" : "whatsapp_cloud",
    business_label: cleanOptionalText(businessLabel),
    phone_number_id: cleanText(phoneNumberId),
    display_phone: cleanOptionalText(displayPhone),
    status: cleanProviderStatus(status)
  };

  const { data, error } = await supabase
    .from("workspace_whatsapp_settings")
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
    action: "whatsapp_settings.saved",
    entityType: "workspace_whatsapp_settings",
    entityId: data.id,
    summary: "Workspace WhatsApp settings saved",
    metadata: {
      provider: data.provider,
      status: data.status
    }
  });

  return {
    ok: true,
    whatsappSettings: data,
    audit,
    message: "WhatsApp settings saved."
  };
}

export async function sendQueuedWhatsApp({ workspaceId, outboundMessageId }) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !outboundMessageId) {
    return {
      ok: false,
      message: "Choose a queued WhatsApp message first."
    };
  }

  const { data, error } = await supabase.functions.invoke("send-queued-whatsapp", {
    body: {
      workspaceId,
      outboundMessageId
    }
  });

  if (error) {
    return {
      ok: false,
      message: error.message || "Send WhatsApp function failed."
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
    message: "Queued WhatsApp message sent."
  };
}

export async function trackCollectionAction({
  workspaceId,
  invoiceId = null,
  customerId = null,
  ownerLabel = "Finance owner",
  actionLabel = "",
  actionChannel = "",
  actionUrgency = "",
  rationale = "",
  riskScore = 0,
  riskBand = "",
  dueAt = null,
  metadata = {}
}) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !cleanText(actionLabel)) {
    return {
      ok: false,
      message: "Choose a recommended action first."
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Sign in before tracking an action."
    };
  }

  const nextOwnerLabel = cleanOwnerLabel(ownerLabel);
  const ownerProfile = await findOwnerProfile(workspaceId, nextOwnerLabel);
  const payload = {
    workspace_id: workspaceId,
    invoice_id: invoiceId,
    customer_id: customerId,
    created_by: userId,
    assigned_to: userId,
    owner_profile_id: ownerProfile?.id ?? null,
    owner_label: nextOwnerLabel,
    assignment_note: "Assigned when action was tracked.",
    assigned_at: new Date().toISOString(),
    assigned_by: userId,
    action_label: cleanText(actionLabel),
    action_channel: cleanText(actionChannel) || "Review",
    action_urgency: cleanText(actionUrgency) || "Next",
    rationale: cleanOptionalText(rationale),
    status: "open",
    risk_score: cleanRiskScore(riskScore),
    risk_band: cleanOptionalText(riskBand),
    due_at: cleanOptionalText(dueAt),
    metadata
  };

  const { data, error } = await supabase
    .from("collection_actions")
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
    action: "collection_action.tracked",
    entityType: "collection_action",
    entityId: data.id,
    summary: `${data.action_label} tracked`,
    metadata: {
      invoice_id: invoiceId,
      customer_id: customerId,
      risk_score: data.risk_score,
      action_channel: data.action_channel,
      action_urgency: data.action_urgency,
      owner_label: data.owner_label,
      owner_profile_id: data.owner_profile_id
    }
  });

  return {
    ok: true,
    collectionAction: data,
    audit,
    message: "Action tracked."
  };
}

export async function updateCollectionActionStatus({ workspaceId, actionId, status }) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !actionId) {
    return {
      ok: false,
      message: "Choose a tracked action first."
    };
  }

  const nextStatus = cleanActionStatus(status);
  if (!["completed", "dismissed", "open"].includes(nextStatus)) {
    return {
      ok: false,
      message: "Unsupported action status."
    };
  }

  const now = new Date().toISOString();
  const payload = {
    status: nextStatus,
    completed_at: nextStatus === "completed" ? now : null,
    dismissed_at: nextStatus === "dismissed" ? now : null
  };

  const { data, error } = await supabase
    .from("collection_actions")
    .update(payload)
    .eq("workspace_id", workspaceId)
    .eq("id", actionId)
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
    action: `collection_action.${nextStatus}`,
    entityType: "collection_action",
    entityId: data.id,
    summary: `${data.action_label} ${nextStatus}`,
    metadata: {
      invoice_id: data.invoice_id,
      customer_id: data.customer_id,
      risk_score: data.risk_score,
      action_channel: data.action_channel,
      action_urgency: data.action_urgency,
      owner_label: data.owner_label
    }
  });

  return {
    ok: true,
    collectionAction: data,
    audit,
    message: `Action ${nextStatus}.`
  };
}

export async function escalateCollectionAction({ workspaceId, actionId, reason = "" }) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !actionId) {
    return {
      ok: false,
      message: "Choose a tracked action first."
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Sign in before escalating an action."
    };
  }

  const { data: currentAction, error: readError } = await supabase
    .from("collection_actions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", actionId)
    .single();

  if (readError) {
    return {
      ok: false,
      message: readError.message
    };
  }

  if (currentAction.status !== "open") {
    return {
      ok: false,
      message: "Only open actions can be escalated."
    };
  }

  const nextLevel = cleanEscalationLevel(Number(currentAction.escalation_level ?? 0) + 1);
  const payload = {
    escalation_level: nextLevel,
    escalation_reason: cleanOptionalText(reason) || "Owner review requested",
    escalated_at: new Date().toISOString(),
    last_escalated_by: userId
  };

  const { data, error } = await supabase
    .from("collection_actions")
    .update(payload)
    .eq("workspace_id", workspaceId)
    .eq("id", actionId)
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
    action: "collection_action.escalated",
    entityType: "collection_action",
    entityId: data.id,
    summary: `${data.action_label} escalated to level ${data.escalation_level}`,
    metadata: {
      invoice_id: data.invoice_id,
      customer_id: data.customer_id,
      escalation_level: data.escalation_level,
      escalation_reason: data.escalation_reason,
      owner_label: data.owner_label,
      risk_score: data.risk_score
    }
  });

  return {
    ok: true,
    collectionAction: data,
    audit,
    message: `Action escalated to level ${data.escalation_level}.`
  };
}

export async function assignCollectionAction({ workspaceId, actionId, ownerLabel = "", note = "" }) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !actionId) {
    return {
      ok: false,
      message: "Choose a tracked action first."
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Sign in before assigning an action."
    };
  }

  const nextOwnerLabel = cleanOwnerLabel(ownerLabel);
  const ownerProfile = await findOwnerProfile(workspaceId, nextOwnerLabel);
  const payload = {
    owner_label: nextOwnerLabel,
    owner_profile_id: ownerProfile?.id ?? null,
    assignment_note: cleanOptionalText(note) || "Owner assignment updated.",
    assigned_at: new Date().toISOString(),
    assigned_by: userId,
    assigned_to: userId
  };

  const { data, error } = await supabase
    .from("collection_actions")
    .update(payload)
    .eq("workspace_id", workspaceId)
    .eq("id", actionId)
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
    action: "collection_action.assigned",
    entityType: "collection_action",
    entityId: data.id,
    summary: `${data.action_label} assigned to ${data.owner_label}`,
    metadata: {
      invoice_id: data.invoice_id,
      customer_id: data.customer_id,
      owner_label: data.owner_label,
      owner_profile_id: data.owner_profile_id,
      assignment_note: data.assignment_note,
      risk_score: data.risk_score
    }
  });

  return {
    ok: true,
    collectionAction: data,
    audit,
    message: `Action assigned to ${data.owner_label}.`
  };
}

export async function createOwnerDigest({ workspaceId, ownerLabel = "" }) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId) {
    return {
      ok: false,
      message: "Choose a workspace before creating a digest."
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Sign in before creating a digest."
    };
  }

  const nextOwnerLabel = cleanOwnerLabel(ownerLabel);
  const ownerProfile = await findOwnerProfile(workspaceId, nextOwnerLabel);
  const { data: actions, error: actionError } = await supabase
    .from("collection_actions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .eq("owner_label", nextOwnerLabel)
    .order("due_at", { ascending: true })
    .order("risk_score", { ascending: false });

  if (actionError) {
    return {
      ok: false,
      message: actionError.message
    };
  }

  const openActions = actions ?? [];
  if (!openActions.length) {
    return {
      ok: false,
      message: `No open actions found for ${nextOwnerLabel}.`
    };
  }

  const overdueActions = openActions.filter(isActionOverdue);
  const escalatedActions = openActions.filter((action) => Number(action.escalation_level ?? 0) > 0);
  const totalRiskScore = openActions.reduce((sum, action) => sum + cleanRiskScore(action.risk_score), 0);
  const actionLines = openActions.slice(0, 6).map((action, index) => {
    const dueText = action.due_at ? new Date(action.due_at).toLocaleString() : "No due time";
    const escalationText = Number(action.escalation_level ?? 0) > 0 ? `, level ${action.escalation_level}` : "";
    return `${index + 1}. ${action.action_label} (${action.action_channel}, ${action.risk_score}/100${escalationText}) due ${dueText}`;
  });

  const subject = `${nextOwnerLabel} cash digest: ${openActions.length} open action${openActions.length === 1 ? "" : "s"}`;
  const body = [
    `Owner: ${nextOwnerLabel}`,
    `Open actions: ${openActions.length}`,
    `Overdue: ${overdueActions.length}`,
    `Escalated: ${escalatedActions.length}`,
    `Total risk score: ${totalRiskScore}`,
    "",
    "Priority actions:",
    ...actionLines
  ].join("\n");

  const payload = {
    workspace_id: workspaceId,
    created_by: userId,
    owner_profile_id: ownerProfile?.id ?? null,
    owner_label: nextOwnerLabel,
    subject,
    body,
    action_count: openActions.length,
    overdue_count: overdueActions.length,
    escalated_count: escalatedActions.length,
    total_risk_score: totalRiskScore,
    status: "draft",
    metadata: {
      action_ids: openActions.map((action) => action.id),
      top_action: openActions[0]?.action_label ?? null,
      owner_profile: ownerProfile ? {
        id: ownerProfile.id,
        display_name: ownerProfile.display_name,
        work_email: ownerProfile.work_email,
        phone: ownerProfile.phone,
        preferred_channel: ownerProfile.preferred_channel
      } : null
    }
  };

  const { data, error } = await supabase
    .from("owner_digest_runs")
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
    action: "owner_digest.created",
    entityType: "owner_digest",
    entityId: data.id,
    summary: `${data.owner_label} digest created`,
    metadata: {
      owner_label: data.owner_label,
      owner_profile_id: data.owner_profile_id,
      action_count: data.action_count,
      overdue_count: data.overdue_count,
      escalated_count: data.escalated_count,
      total_risk_score: data.total_risk_score
    }
  });

  return {
    ok: true,
    ownerDigest: data,
    audit,
    message: `${data.owner_label} digest created.`
  };
}

export async function queueOwnerDigest({
  workspaceId,
  digestId,
  channel = "manual",
  recipient = ""
}) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !digestId) {
    return {
      ok: false,
      message: "Choose a digest before queueing it."
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Sign in before queueing a digest."
    };
  }

  const { data: digest, error: digestError } = await supabase
    .from("owner_digest_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", digestId)
    .single();

  if (digestError) {
    return {
      ok: false,
      message: digestError.message
    };
  }

  if (digest.status !== "draft") {
    return {
      ok: false,
      message: `${digest.owner_label} digest is already ${digest.status}.`
    };
  }

  const nextChannel = cleanChannel(channel);
  const digestMetadata = cleanMetadata(digest.metadata);
  const ownerProfile = digest.owner_profile_id ? null : await findOwnerProfile(workspaceId, digest.owner_label);
  const profileRecipient = nextChannel === "email"
    ? cleanText(digestMetadata.owner_profile?.work_email || ownerProfile?.work_email)
    : nextChannel === "whatsapp"
      ? cleanText(digestMetadata.owner_profile?.phone || ownerProfile?.phone)
      : "";
  const nextRecipient = cleanText(recipient) || profileRecipient || digest.owner_label;
  const reviewRequestedAt = new Date().toISOString();
  const messagePayload = {
    workspace_id: workspaceId,
    created_by: userId,
    channel: nextChannel,
    recipient: nextRecipient,
    subject: digest.subject,
    message: digest.body,
    status: "queued",
    review_status: "pending",
    delivery_status: "not_sent",
    review_note: "Owner digest requires approval before provider delivery.",
    metadata: {
      source: "owner_digest",
      owner_digest_id: digest.id,
      owner_label: digest.owner_label,
      action_count: digest.action_count,
      overdue_count: digest.overdue_count,
      escalated_count: digest.escalated_count,
      total_risk_score: digest.total_risk_score,
      review_requested_at: reviewRequestedAt
    }
  };

  const { data: outboundMessage, error: outboundError } = await supabase
    .from("outbound_messages")
    .insert(messagePayload)
    .select("*")
    .single();

  if (outboundError) {
    return {
      ok: false,
      message: outboundError.message
    };
  }

  const nextMetadata = {
    ...digestMetadata,
    queued_outbound_message_id: outboundMessage.id,
    queued_channel: outboundMessage.channel,
    queued_recipient: outboundMessage.recipient,
    review_status: "pending",
    review_requested_at: reviewRequestedAt
  };

  const { data: ownerDigest, error: updateError } = await supabase
    .from("owner_digest_runs")
    .update({
      status: "review_pending",
      queued_outbound_message_id: outboundMessage.id,
      metadata: nextMetadata
    })
    .eq("workspace_id", workspaceId)
    .eq("id", digestId)
    .select("*")
    .single();

  if (updateError) {
    return {
      ok: false,
      message: updateError.message
    };
  }

  const outboundAudit = await writeAuditLog({
    workspaceId,
    action: "outbound_message.review_pending",
    entityType: "outbound_message",
    entityId: outboundMessage.id,
    summary: `${outboundMessage.channel} owner digest waiting for approval`,
    metadata: {
      owner_digest_id: digest.id,
      owner_label: digest.owner_label,
      channel: outboundMessage.channel,
      source: "owner_digest",
      review_status: outboundMessage.review_status
    }
  });

  const digestAudit = await writeAuditLog({
    workspaceId,
    action: "owner_digest.review_pending",
    entityType: "owner_digest",
    entityId: ownerDigest.id,
    summary: `${ownerDigest.owner_label} digest waiting for approval`,
    metadata: {
      outbound_message_id: outboundMessage.id,
      channel: outboundMessage.channel,
      recipient: outboundMessage.recipient,
      review_status: outboundMessage.review_status,
      action_count: ownerDigest.action_count,
      overdue_count: ownerDigest.overdue_count,
      escalated_count: ownerDigest.escalated_count
    }
  });

  return {
    ok: true,
    ownerDigest,
    outboundMessage,
    audit: {
      outbound: outboundAudit,
      digest: digestAudit
    },
    message: `${ownerDigest.owner_label} digest is waiting for approval.`
  };
}

export async function approveOutboundMessage({ workspaceId, outboundMessageId, note = "" }) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !outboundMessageId) {
    return {
      ok: false,
      message: "Choose a queued message before approving it."
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Sign in before approving a queued message."
    };
  }

  const { data: message, error: readError } = await supabase
    .from("outbound_messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", outboundMessageId)
    .single();

  if (readError) {
    return {
      ok: false,
      message: readError.message
    };
  }

  if (message.status !== "queued") {
    return {
      ok: false,
      message: "Only queued messages can be approved."
    };
  }

  if (cleanReviewStatus(message.review_status) === "approved") {
    return {
      ok: false,
      message: "This message is already approved."
    };
  }

  const approvedAt = new Date().toISOString();
  const { data: approvedMessage, error: updateError } = await supabase
    .from("outbound_messages")
    .update({
      review_status: "approved",
      approved_at: approvedAt,
      approved_by: userId,
      rejected_at: null,
      rejected_by: null,
      review_note: cleanOptionalText(note) || "Approved for provider delivery."
    })
    .eq("workspace_id", workspaceId)
    .eq("id", outboundMessageId)
    .select("*")
    .single();

  if (updateError) {
    return {
      ok: false,
      message: updateError.message
    };
  }

  const messageMetadata = cleanMetadata(message.metadata);
  const ownerDigestId = cleanText(messageMetadata.owner_digest_id);
  let ownerDigest = null;
  if (ownerDigestId) {
    const { data: currentDigest } = await supabase
      .from("owner_digest_runs")
      .select("metadata")
      .eq("workspace_id", workspaceId)
      .eq("id", ownerDigestId)
      .maybeSingle();
    const { data: digestData } = await supabase
      .from("owner_digest_runs")
      .update({
        status: "queued",
        queued_at: approvedAt,
        queued_by: userId,
        metadata: {
          ...cleanMetadata(currentDigest?.metadata),
          ...messageMetadata,
          review_status: "approved",
          approved_at: approvedAt,
          approved_by: userId,
          queued_outbound_message_id: approvedMessage.id
        }
      })
      .eq("workspace_id", workspaceId)
      .eq("id", ownerDigestId)
      .select("*")
      .maybeSingle();
    ownerDigest = digestData ?? null;
  }

  const outboundAudit = await writeAuditLog({
    workspaceId,
    action: "outbound_message.approved",
    entityType: "outbound_message",
    entityId: approvedMessage.id,
    summary: `${approvedMessage.channel} message approved for delivery`,
    metadata: {
      channel: approvedMessage.channel,
      review_status: approvedMessage.review_status,
      owner_digest_id: ownerDigestId || null
    }
  });

  let digestAudit = null;
  if (ownerDigest) {
    digestAudit = await writeAuditLog({
      workspaceId,
      action: "owner_digest.approved",
      entityType: "owner_digest",
      entityId: ownerDigest.id,
      summary: `${ownerDigest.owner_label} digest approved into outbound queue`,
      metadata: {
        outbound_message_id: approvedMessage.id,
        channel: approvedMessage.channel,
        recipient: approvedMessage.recipient,
        review_status: approvedMessage.review_status
      }
    });
  }

  return {
    ok: true,
    outboundMessage: approvedMessage,
    ownerDigest,
    audit: {
      outbound: outboundAudit,
      digest: digestAudit
    },
    message: "Queued message approved for delivery."
  };
}

export async function rejectOutboundMessage({ workspaceId, outboundMessageId, note = "" }) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !outboundMessageId) {
    return {
      ok: false,
      message: "Choose a queued message before rejecting it."
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Sign in before rejecting a queued message."
    };
  }

  const { data: message, error: readError } = await supabase
    .from("outbound_messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", outboundMessageId)
    .single();

  if (readError) {
    return {
      ok: false,
      message: readError.message
    };
  }

  if (message.status !== "queued") {
    return {
      ok: false,
      message: "Only queued messages can be rejected."
    };
  }

  const rejectedAt = new Date().toISOString();
  const { data: rejectedMessage, error: updateError } = await supabase
    .from("outbound_messages")
    .update({
      status: "cancelled",
      review_status: "rejected",
      rejected_at: rejectedAt,
      rejected_by: userId,
      review_note: cleanOptionalText(note) || "Rejected before provider delivery.",
      delivery_detail: "Rejected before provider delivery"
    })
    .eq("workspace_id", workspaceId)
    .eq("id", outboundMessageId)
    .select("*")
    .single();

  if (updateError) {
    return {
      ok: false,
      message: updateError.message
    };
  }

  const messageMetadata = cleanMetadata(message.metadata);
  const ownerDigestId = cleanText(messageMetadata.owner_digest_id);
  let ownerDigest = null;
  if (ownerDigestId) {
    const { data: currentDigest } = await supabase
      .from("owner_digest_runs")
      .select("metadata")
      .eq("workspace_id", workspaceId)
      .eq("id", ownerDigestId)
      .maybeSingle();
    const { data: digestData } = await supabase
      .from("owner_digest_runs")
      .update({
        status: "rejected",
        rejected_at: rejectedAt,
        rejected_by: userId,
        metadata: {
          ...cleanMetadata(currentDigest?.metadata),
          ...messageMetadata,
          review_status: "rejected",
          rejected_at: rejectedAt,
          rejected_by: userId,
          rejected_outbound_message_id: rejectedMessage.id
        }
      })
      .eq("workspace_id", workspaceId)
      .eq("id", ownerDigestId)
      .select("*")
      .maybeSingle();
    ownerDigest = digestData ?? null;
  }

  const outboundAudit = await writeAuditLog({
    workspaceId,
    action: "outbound_message.rejected",
    entityType: "outbound_message",
    entityId: rejectedMessage.id,
    summary: `${rejectedMessage.channel} message rejected before delivery`,
    metadata: {
      channel: rejectedMessage.channel,
      review_status: rejectedMessage.review_status,
      owner_digest_id: ownerDigestId || null
    }
  });

  let digestAudit = null;
  if (ownerDigest) {
    digestAudit = await writeAuditLog({
      workspaceId,
      action: "owner_digest.rejected",
      entityType: "owner_digest",
      entityId: ownerDigest.id,
      summary: `${ownerDigest.owner_label} digest rejected before delivery`,
      metadata: {
        outbound_message_id: rejectedMessage.id,
        channel: rejectedMessage.channel,
        recipient: rejectedMessage.recipient,
        review_status: rejectedMessage.review_status
      }
    });
  }

  return {
    ok: true,
    outboundMessage: rejectedMessage,
    ownerDigest,
    audit: {
      outbound: outboundAudit,
      digest: digestAudit
    },
    message: "Queued message rejected before delivery."
  };
}

export async function saveOwnerDigestSchedule({
  workspaceId,
  ownerLabel = "",
  cadence = "weekly",
  channel = "manual",
  recipient = "",
  status = "active"
}) {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !cleanText(ownerLabel)) {
    return {
      ok: false,
      message: "Choose an owner before saving a digest schedule."
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Sign in before saving a digest schedule."
    };
  }

  const nextCadence = cleanDigestCadence(cadence);
  const nextChannel = cleanChannel(channel);
  const nextStatus = cleanDigestScheduleStatus(status);
  const nextOwnerLabel = cleanOwnerLabel(ownerLabel);
  const ownerProfile = await findOwnerProfile(workspaceId, nextOwnerLabel);
  const profileRecipient = nextChannel === "email"
    ? cleanText(ownerProfile?.work_email)
    : nextChannel === "whatsapp"
      ? cleanText(ownerProfile?.phone)
      : "";
  const payload = {
    workspace_id: workspaceId,
    created_by: userId,
    owner_profile_id: ownerProfile?.id ?? null,
    owner_label: nextOwnerLabel,
    cadence: nextCadence,
    channel: nextChannel,
    recipient: cleanOptionalText(recipient) || profileRecipient || nextOwnerLabel,
    status: nextStatus,
    next_run_at: nextStatus === "active" ? nextDigestRunAt(nextCadence) : null,
    metadata: {
      saved_from: "owner_digest_panel",
      owner_profile: ownerProfile ? {
        id: ownerProfile.id,
        display_name: ownerProfile.display_name,
        preferred_channel: ownerProfile.preferred_channel
      } : null
    }
  };

  const { data, error } = await supabase
    .from("owner_digest_schedules")
    .upsert(payload, { onConflict: "workspace_id,owner_label" })
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
    action: "owner_digest_schedule.saved",
    entityType: "owner_digest_schedule",
    entityId: data.id,
    summary: `${data.owner_label} digest schedule saved`,
    metadata: {
      owner_label: data.owner_label,
      owner_profile_id: data.owner_profile_id,
      cadence: data.cadence,
      channel: data.channel,
      recipient: data.recipient,
      status: data.status,
      next_run_at: data.next_run_at
    }
  });

  return {
    ok: true,
    ownerDigestSchedule: data,
    audit,
    message: `${data.owner_label} digest schedule saved.`
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
    status: cleanInvoiceStatus(invoice.status)
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

export async function approvePaymentMatch(workspaceId, matchSuggestionId, approvalNote = "") {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !matchSuggestionId) {
    return { ok: false, message: "Choose a payment match suggestion first." };
  }

  const rpcResult = await supabase.rpc("approve_payment_match", {
    target_match_id: matchSuggestionId,
    approval_note: cleanOptionalText(approvalNote)
  });

  if (!rpcResult.error) {
    const invoiceStatus = rpcResult.data?.invoice_status;
    const hasCustomerCredit = Boolean(rpcResult.data?.customer_credit_id);
    const isSplitPayment = Boolean(rpcResult.data?.split_payment);
    return {
      ok: true,
      result: rpcResult.data,
      method: rpcResult.data?.method ?? "database_rpc",
      message: isSplitPayment
        ? `Split payment allocated across ${rpcResult.data?.split_line_count ?? "multiple"} invoices.`
        : invoiceStatus === "partial"
        ? `Partial payment allocated for ${rpcResult.data?.invoice_number ?? "invoice"}.`
        : hasCustomerCredit
          ? `Payment approved and customer credit created for ${rpcResult.data?.invoice_number ?? "invoice"}.`
        : `Payment match approved for ${rpcResult.data?.invoice_number ?? "invoice"}.`
    };
  }

  if (!isMissingApprovalRpc(rpcResult.error)) {
    return {
      ok: false,
      method: "database_rpc",
      message: rpcResult.error.message
    };
  }

  const { data: match, error: matchError } = await supabase
    .from("payment_match_suggestions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", matchSuggestionId)
    .single();

  if (matchError) return { ok: false, message: matchError.message };
  if (match.match_status === "rejected") {
    return { ok: false, message: "Rejected payment matches cannot be approved." };
  }

  const { data: splitLines, error: splitLinesError } = await supabase
    .from("payment_match_split_lines")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("payment_match_suggestion_id", match.id)
    .neq("status", "rejected")
    .order("line_order", { ascending: true });

  if (splitLinesError && !isMissingTableError(splitLinesError, "payment_match_split_lines")) {
    return { ok: false, message: splitLinesError.message };
  }

  const paymentSplitLines = splitLinesError ? [] : splitLines ?? [];
  if (!match?.invoice_id && !paymentSplitLines.length) {
    return { ok: false, message: "This match is not linked to an invoice or split lines yet." };
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", match.bank_transaction_id)
    .single();

  if (transactionError) return { ok: false, message: transactionError.message };

  if (paymentSplitLines.length) {
    const session = await getSession();
    const userId = session?.user?.id ?? null;
    const cleanNote = cleanOptionalText(approvalNote);
    const transactionAmount = cleanAmount(transaction.amount);

    const { error: matchUpdateError } = await supabase
      .from("payment_match_suggestions")
      .update({
        match_status: "accepted",
        review_note: cleanNote || match.review_note,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        metadata: {
          ...cleanMetadata(match.metadata),
          approved_by: userId,
          approved_at: new Date().toISOString(),
          split_payment: true
        }
      })
      .eq("workspace_id", workspaceId)
      .eq("id", match.id);

    if (matchUpdateError) return { ok: false, message: matchUpdateError.message };

    const { error: transactionUpdateError } = await supabase
      .from("bank_transactions")
      .update({ status: "matched" })
      .eq("workspace_id", workspaceId)
      .eq("id", transaction.id);

    if (transactionUpdateError) return { ok: false, message: transactionUpdateError.message };

    const { data: allocationRow, error: allocationError } = await supabase
      .from("payment_allocations")
      .upsert({
        workspace_id: workspaceId,
        payment_match_suggestion_id: match.id,
        bank_transaction_id: transaction.id,
        invoice_id: null,
        customer_id: match.customer_id,
        approved_by: userId,
        amount: 0,
        currency: cleanText(transaction.currency) || "AED",
        status: "posted",
        allocation_note: cleanNote || match.review_note,
        metadata: {
          confidence: cleanConfidence(match.confidence),
          match_reason: match.match_reason,
          bank_reference: transaction.reference,
          previous_bank_status: transaction.status,
          previous_match_status: match.match_status,
          transaction_amount: transactionAmount,
          split_payment: true
        }
      }, { onConflict: "workspace_id,payment_match_suggestion_id" })
      .select("*")
      .single();

    if (allocationError && !isMissingTableError(allocationError, "payment_allocations")) {
      return { ok: false, message: allocationError.message };
    }

    const allocation = allocationRow ?? null;
    if (!allocation) return { ok: false, message: "Payment allocation table is required for split approval." };

    let appliedAmount = 0;
    let creditCustomerId = match.customer_id || null;
    const splitSummary = [];

    const { error: deleteLinesError } = await supabase
      .from("payment_allocation_lines")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("payment_allocation_id", allocation.id);

    if (deleteLinesError && !isMissingTableError(deleteLinesError, "payment_allocation_lines")) {
      return { ok: false, message: deleteLinesError.message };
    }

    for (const splitLine of paymentSplitLines) {
      const remainingTransactionAmount = Math.max(transactionAmount - appliedAmount, 0);
      if (remainingTransactionAmount <= 0) break;

      const { data: splitInvoice, error: splitInvoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("id", splitLine.invoice_id)
        .single();

      if (splitInvoiceError) return { ok: false, message: splitInvoiceError.message };

      creditCustomerId = creditCustomerId || splitInvoice.customer_id;
      const allocatedResult = await fetchInvoiceAllocatedAmount({
        workspaceId,
        invoiceId: splitInvoice.id,
        excludedMatchId: match.id,
        excludedAllocationId: allocation.id
      });
      if (!allocatedResult.ok) return { ok: false, message: allocatedResult.message };

      const invoiceAmount = cleanAmount(splitInvoice.amount);
      const remainingBefore = Math.max(invoiceAmount - allocatedResult.amount, 0);
      const suggestedAmount = cleanAmount(splitLine.amount) || remainingBefore;
      const lineAppliedAmount = Math.min(suggestedAmount, remainingBefore, remainingTransactionAmount);
      if (lineAppliedAmount <= 0) continue;

      const remainingAfter = Math.max(invoiceAmount - allocatedResult.amount - lineAppliedAmount, 0);
      const nextStatus = invoiceStatusAfterPayment(splitInvoice, allocatedResult.amount + lineAppliedAmount, cleanInvoiceStatus(splitInvoice.status));

      const { error: invoiceUpdateError } = await supabase
        .from("invoices")
        .update({ status: nextStatus })
        .eq("workspace_id", workspaceId)
        .eq("id", splitInvoice.id);

      if (invoiceUpdateError) return { ok: false, message: invoiceUpdateError.message };

      const { error: lineInsertError } = await supabase
        .from("payment_allocation_lines")
        .insert({
          workspace_id: workspaceId,
          payment_allocation_id: allocation.id,
          payment_match_suggestion_id: match.id,
          bank_transaction_id: transaction.id,
          invoice_id: splitInvoice.id,
          customer_id: splitInvoice.customer_id,
          amount: lineAppliedAmount,
          currency: cleanText(transaction.currency) || "AED",
          status: "posted",
          previous_invoice_status: cleanInvoiceStatus(splitInvoice.status),
          remaining_after: remainingAfter,
          metadata: {
            invoice_number: splitInvoice.invoice_number,
            invoice_amount: invoiceAmount,
            allocated_before: allocatedResult.amount,
            suggested_amount: cleanAmount(splitLine.amount),
            applied_amount: lineAppliedAmount,
            remaining_after: remainingAfter,
            invoice_status_after_allocation: nextStatus,
            line_order: splitLine.line_order
          }
        });

      if (lineInsertError && !isMissingTableError(lineInsertError, "payment_allocation_lines")) {
        return { ok: false, message: lineInsertError.message };
      }

      await supabase
        .from("payment_match_split_lines")
        .update({
          status: "accepted",
          metadata: {
            ...cleanMetadata(splitLine.metadata),
            approved_amount: lineAppliedAmount,
            approved_at: new Date().toISOString()
          }
        })
        .eq("workspace_id", workspaceId)
        .eq("id", splitLine.id);

      appliedAmount += lineAppliedAmount;
      splitSummary.push({
        invoice_id: splitInvoice.id,
        invoice_number: splitInvoice.invoice_number,
        customer_id: splitInvoice.customer_id,
        amount: lineAppliedAmount,
        remaining_after: remainingAfter,
        invoice_status: nextStatus
      });
    }

    if (appliedAmount <= 0) {
      return { ok: false, message: "Split lines did not allocate any payment amount." };
    }

    const unallocatedTransactionAmount = Math.max(transactionAmount - appliedAmount, 0);
    const allocationMetadata = {
      ...cleanMetadata(allocation.metadata),
      applied_amount: appliedAmount,
      remaining_after: unallocatedTransactionAmount,
      unallocated_transaction_amount: unallocatedTransactionAmount,
      split_payment: true,
      split_line_count: splitSummary.length,
      split_lines: splitSummary
    };

    const { data: updatedAllocation, error: allocationUpdateError } = await supabase
      .from("payment_allocations")
      .update({
        amount: appliedAmount,
        customer_id: creditCustomerId,
        metadata: allocationMetadata
      })
      .eq("workspace_id", workspaceId)
      .eq("id", allocation.id)
      .select("*")
      .single();

    if (allocationUpdateError && !isMissingTableError(allocationUpdateError, "payment_allocations")) {
      return { ok: false, message: allocationUpdateError.message };
    }

    let customerCredit = null;
    if (unallocatedTransactionAmount > 0) {
      const { data: creditRow, error: creditError } = await supabase
        .from("customer_payment_credits")
        .upsert({
          workspace_id: workspaceId,
          customer_id: creditCustomerId,
          source_payment_allocation_id: allocation.id,
          bank_transaction_id: transaction.id,
          payment_match_suggestion_id: match.id,
          created_by: userId,
          amount: unallocatedTransactionAmount,
          currency: cleanText(transaction.currency) || "AED",
          status: "open",
          credit_note: `Split payment remainder from ${transaction.reference || "bank transaction"}`,
          metadata: {
            split_payment: true,
            split_lines: splitSummary,
            bank_reference: transaction.reference,
            transaction_amount: transactionAmount,
            applied_amount: appliedAmount,
            credit_amount: unallocatedTransactionAmount,
            source: "approve_payment_match_split"
          }
        }, { onConflict: "workspace_id,source_payment_allocation_id" })
        .select("*")
        .single();

      if (creditError && !isMissingTableError(creditError, "customer_payment_credits")) {
        return { ok: false, message: creditError.message };
      }
      customerCredit = creditRow ?? null;
    }

    const audit = await writeAuditLog({
      workspaceId,
      action: "payment_match.approved",
      entityType: "payment_match_suggestion",
      entityId: match.id,
      summary: `Payment split approved across ${splitSummary.length} invoices`,
      metadata: {
        split_payment: true,
        split_lines: splitSummary,
        bank_transaction_id: transaction.id,
        bank_reference: transaction.reference,
        allocation_id: allocation.id,
        amount: appliedAmount,
        transaction_amount: transactionAmount,
        unallocated_transaction_amount: unallocatedTransactionAmount,
        customer_credit_id: customerCredit?.id ?? null,
        currency: transaction.currency,
        confidence: match.confidence
      }
    });

    return {
      ok: true,
      transaction,
      allocation: updatedAllocation ?? { ...allocation, amount: appliedAmount, metadata: allocationMetadata },
      customerCredit,
      audit,
      method: "browser_fallback",
      message: `Split payment allocated across ${splitSummary.length} invoices.`
    };
  }

  const { data: currentInvoice, error: currentInvoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", match.invoice_id)
    .single();

  if (currentInvoiceError) return { ok: false, message: currentInvoiceError.message };
  const previousInvoiceStatus = cleanInvoiceStatus(currentInvoice.status);
  const allocatedResult = await fetchInvoiceAllocatedAmount({
    workspaceId,
    invoiceId: currentInvoice.id,
    excludedMatchId: match.id
  });
  if (!allocatedResult.ok) return { ok: false, message: allocatedResult.message };

  const allocatedBefore = allocatedResult.amount;
  const invoiceAmount = cleanAmount(currentInvoice.amount);
  const transactionAmount = cleanAmount(transaction.amount);
  const remainingBefore = Math.max(invoiceAmount - allocatedBefore, 0);
  const appliedAmount = Math.min(transactionAmount, remainingBefore);
  const remainingAfter = Math.max(invoiceAmount - allocatedBefore - appliedAmount, 0);
  const unallocatedTransactionAmount = Math.max(transactionAmount - appliedAmount, 0);
  const nextInvoiceStatus = invoiceStatusAfterPayment(currentInvoice, allocatedBefore + appliedAmount, previousInvoiceStatus);

  if (appliedAmount <= 0) {
    return { ok: false, message: "This invoice has no remaining balance to allocate." };
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .update({ status: nextInvoiceStatus })
    .eq("workspace_id", workspaceId)
    .eq("id", match.invoice_id)
    .select("*")
    .single();

  if (invoiceError) return { ok: false, message: invoiceError.message };

  const session = await getSession();
  const userId = session?.user?.id ?? null;
  const cleanNote = cleanOptionalText(approvalNote);

  const { error: matchUpdateError } = await supabase
    .from("payment_match_suggestions")
    .update({
      match_status: "accepted",
      review_note: cleanNote || match.review_note,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      metadata: {
        ...cleanMetadata(match.metadata),
        approved_by: userId,
        approved_at: new Date().toISOString()
      }
    })
    .eq("workspace_id", workspaceId)
    .eq("id", match.id);

  if (matchUpdateError) return { ok: false, message: matchUpdateError.message };

  const { error: transactionUpdateError } = await supabase
    .from("bank_transactions")
    .update({ status: "matched" })
    .eq("workspace_id", workspaceId)
    .eq("id", transaction.id);

  if (transactionUpdateError) return { ok: false, message: transactionUpdateError.message };

  let allocation = null;
  const { data: allocationRow, error: allocationError } = await supabase
    .from("payment_allocations")
    .insert({
      workspace_id: workspaceId,
      payment_match_suggestion_id: match.id,
      bank_transaction_id: transaction.id,
      invoice_id: invoice.id,
      customer_id: match.customer_id || invoice.customer_id,
      approved_by: userId,
      amount: appliedAmount,
      currency: cleanText(transaction.currency) || "AED",
      status: "posted",
      allocation_note: cleanNote || match.review_note,
      metadata: {
        confidence: cleanConfidence(match.confidence),
        match_reason: match.match_reason,
        invoice_number: invoice.invoice_number,
        bank_reference: transaction.reference,
        previous_invoice_status: previousInvoiceStatus,
        previous_bank_status: transaction.status,
        previous_match_status: match.match_status,
        invoice_amount: invoiceAmount,
        allocated_before: allocatedBefore,
        applied_amount: appliedAmount,
        remaining_after: remainingAfter,
        transaction_amount: transactionAmount,
        unallocated_transaction_amount: unallocatedTransactionAmount,
        invoice_status_after_allocation: nextInvoiceStatus,
        partial_payment: nextInvoiceStatus === "partial"
      }
    })
    .select("*")
    .single();

  if (allocationError && !isMissingTableError(allocationError, "payment_allocations")) {
    return { ok: false, message: allocationError.message };
  }

  allocation = allocationRow ?? null;

  let customerCredit = null;
  if (allocation && unallocatedTransactionAmount > 0) {
    const creditMetadata = {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      bank_reference: transaction.reference,
      transaction_amount: transactionAmount,
      applied_amount: appliedAmount,
      credit_amount: unallocatedTransactionAmount,
      source: "approve_payment_match"
    };
    const { data: creditRow, error: creditError } = await supabase
      .from("customer_payment_credits")
      .upsert({
        workspace_id: workspaceId,
        customer_id: match.customer_id || invoice.customer_id,
        source_payment_allocation_id: allocation.id,
        bank_transaction_id: transaction.id,
        payment_match_suggestion_id: match.id,
        created_by: userId,
        amount: unallocatedTransactionAmount,
        currency: cleanText(transaction.currency) || "AED",
        status: "open",
        credit_note: `Overpayment credit from ${transaction.reference || invoice.invoice_number}`,
        metadata: creditMetadata
      }, { onConflict: "workspace_id,source_payment_allocation_id" })
      .select("*")
      .single();

    if (creditError && !isMissingTableError(creditError, "customer_payment_credits")) {
      return { ok: false, message: creditError.message };
    }

    customerCredit = creditRow ?? null;

    if (customerCredit) {
      const nextAllocationMetadata = {
        ...cleanMetadata(allocation.metadata),
        customer_credit_id: customerCredit.id,
        overpayment_credit_amount: unallocatedTransactionAmount
      };
      const { data: updatedAllocation, error: allocationMetadataError } = await supabase
        .from("payment_allocations")
        .update({ metadata: nextAllocationMetadata })
        .eq("workspace_id", workspaceId)
        .eq("id", allocation.id)
        .select("*")
        .single();

      if (allocationMetadataError && !isMissingTableError(allocationMetadataError, "payment_allocations")) {
        return { ok: false, message: allocationMetadataError.message };
      }

      allocation = updatedAllocation ?? { ...allocation, metadata: nextAllocationMetadata };

      await writeAuditLog({
        workspaceId,
        action: "customer_payment_credit.created",
        entityType: "customer_payment_credit",
        entityId: customerCredit.id,
        summary: `Overpayment credit created for invoice ${invoice.invoice_number}`,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          bank_transaction_id: transaction.id,
          bank_reference: transaction.reference,
          allocation_id: allocation.id,
          amount: unallocatedTransactionAmount,
          currency: transaction.currency
        }
      });
    }
  }

  const audit = await writeAuditLog({
    workspaceId,
    action: "payment_match.approved",
    entityType: "payment_match_suggestion",
    entityId: match.id,
    summary: `Payment match approved for invoice ${invoice.invoice_number}`,
    metadata: {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      bank_transaction_id: transaction.id,
      bank_reference: transaction.reference,
      allocation_id: allocation?.id ?? null,
      amount: appliedAmount,
      transaction_amount: transactionAmount,
      remaining_after: remainingAfter,
      unallocated_transaction_amount: unallocatedTransactionAmount,
      customer_credit_id: customerCredit?.id ?? null,
      invoice_status: nextInvoiceStatus,
      currency: transaction.currency,
      confidence: match.confidence
    }
  });

  return {
    ok: true,
    invoice,
    transaction,
    allocation,
    customerCredit,
    audit,
    method: "browser_fallback",
    message: nextInvoiceStatus === "partial"
      ? `Partial payment allocated for ${invoice.invoice_number}.`
      : customerCredit
        ? `Payment approved and customer credit created for ${invoice.invoice_number}.`
        : `Payment match approved for ${invoice.invoice_number}.`
  };
}

export async function reversePaymentAllocation(workspaceId, allocationId, reversalNote = "") {
  if (!supabase) return missingSupabaseResult();
  if (!workspaceId || !allocationId) {
    return { ok: false, message: "Choose a payment allocation first." };
  }

  const rpcResult = await supabase.rpc("reverse_payment_allocation", {
    target_allocation_id: allocationId,
    reversal_note: cleanOptionalText(reversalNote)
  });

  if (!rpcResult.error) {
    return {
      ok: true,
      result: rpcResult.data,
      method: rpcResult.data?.method ?? "database_rpc",
      message: "Payment allocation reversed for review."
    };
  }

  if (!isMissingReversalRpc(rpcResult.error)) {
    return {
      ok: false,
      method: "database_rpc",
      message: rpcResult.error.message
    };
  }

  const { data: allocation, error: allocationError } = await supabase
    .from("payment_allocations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", allocationId)
    .single();

  if (allocationError) return { ok: false, message: allocationError.message };
  if (cleanPaymentAllocationStatus(allocation.status) === "reversed") {
    return { ok: false, message: "This payment allocation is already reversed." };
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", allocation.bank_transaction_id)
    .single();

  if (transactionError) return { ok: false, message: transactionError.message };

  let invoice = null;
  if (allocation.invoice_id) {
    const { data: invoiceRow, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", allocation.invoice_id)
      .single();

    if (invoiceError) return { ok: false, message: invoiceError.message };
    invoice = invoiceRow;
  }

  let remainingInvoiceAllocated = 0;
  if (invoice) {
    const allocatedResult = await fetchInvoiceAllocatedAmount({
      workspaceId,
      invoiceId: invoice.id,
      excludedAllocationId: allocation.id
    });
    if (!allocatedResult.ok) return { ok: false, message: allocatedResult.message };
    remainingInvoiceAllocated = allocatedResult.amount;
  }

  const metadata = cleanMetadata(allocation.metadata);
  const invoiceStatus = restoredInvoiceStatus(metadata.previous_invoice_status, invoice, remainingInvoiceAllocated);
  const bankStatus = restoredBankTransactionStatus(metadata.previous_bank_status);
  const matchStatus = restoredPaymentMatchStatus(metadata.previous_match_status);
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  const cleanNote = cleanOptionalText(reversalNote) || allocation.reversal_note || "Allocation reversed for review.";
  const reversedAt = new Date().toISOString();

  const { error: allocationUpdateError } = await supabase
    .from("payment_allocations")
    .update({
      status: "reversed",
      reversal_note: cleanNote,
      reversed_by: userId,
      reversed_at: reversedAt,
      metadata: {
        ...metadata,
        reversed_by: userId,
        reversed_at: reversedAt
      }
    })
    .eq("workspace_id", workspaceId)
    .eq("id", allocation.id);

  if (allocationUpdateError) return { ok: false, message: allocationUpdateError.message };

  const { error: transactionUpdateError } = await supabase
    .from("bank_transactions")
    .update({ status: bankStatus })
    .eq("workspace_id", workspaceId)
    .eq("id", transaction.id);

  if (transactionUpdateError) return { ok: false, message: transactionUpdateError.message };

  if (invoice) {
    const { error: invoiceUpdateError } = await supabase
      .from("invoices")
      .update({ status: invoiceStatus })
      .eq("workspace_id", workspaceId)
      .eq("id", invoice.id);

    if (invoiceUpdateError) return { ok: false, message: invoiceUpdateError.message };
  }

  if (allocation.payment_match_suggestion_id) {
    const { data: match, error: matchError } = await supabase
      .from("payment_match_suggestions")
      .select("metadata")
      .eq("workspace_id", workspaceId)
      .eq("id", allocation.payment_match_suggestion_id)
      .single();

    if (matchError) return { ok: false, message: matchError.message };

    const { error: matchUpdateError } = await supabase
      .from("payment_match_suggestions")
      .update({
        match_status: matchStatus,
        review_note: cleanNote,
        reviewed_by: null,
        reviewed_at: null,
        metadata: {
          ...cleanMetadata(match.metadata),
          reversed_by: userId,
          reversed_at: reversedAt
        }
      })
      .eq("workspace_id", workspaceId)
      .eq("id", allocation.payment_match_suggestion_id);

    if (matchUpdateError) return { ok: false, message: matchUpdateError.message };
  }

  const reversedSplitLines = [];
  const { data: allocationLines, error: allocationLinesError } = await supabase
    .from("payment_allocation_lines")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("payment_allocation_id", allocation.id)
    .eq("status", "posted");

  if (allocationLinesError && !isMissingTableError(allocationLinesError, "payment_allocation_lines")) {
    return { ok: false, message: allocationLinesError.message };
  }

  for (const line of allocationLines ?? []) {
    const { data: lineInvoice, error: lineInvoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", line.invoice_id)
      .single();

    if (lineInvoiceError) return { ok: false, message: lineInvoiceError.message };

    const allocatedResult = await fetchInvoiceAllocatedAmount({
      workspaceId,
      invoiceId: lineInvoice.id,
      excludedAllocationId: allocation.id
    });
    if (!allocatedResult.ok) return { ok: false, message: allocatedResult.message };

    const restoredLineStatus = restoredInvoiceStatus(line.previous_invoice_status, lineInvoice, allocatedResult.amount);
    const { error: lineInvoiceUpdateError } = await supabase
      .from("invoices")
      .update({ status: restoredLineStatus })
      .eq("workspace_id", workspaceId)
      .eq("id", lineInvoice.id);

    if (lineInvoiceUpdateError) return { ok: false, message: lineInvoiceUpdateError.message };

    const { error: lineUpdateError } = await supabase
      .from("payment_allocation_lines")
      .update({
        status: "reversed",
        metadata: {
          ...cleanMetadata(line.metadata),
          reversed_by: userId,
          reversed_at: reversedAt
        }
      })
      .eq("workspace_id", workspaceId)
      .eq("id", line.id);

    if (lineUpdateError && !isMissingTableError(lineUpdateError, "payment_allocation_lines")) {
      return { ok: false, message: lineUpdateError.message };
    }

    reversedSplitLines.push({
      invoice_id: lineInvoice.id,
      invoice_number: lineInvoice.invoice_number,
      amount: cleanAmount(line.amount),
      restored_invoice_status: restoredLineStatus,
      remaining_invoice_allocated: allocatedResult.amount
    });
  }

  let voidedCustomerCredit = null;
  const { data: customerCreditRows, error: customerCreditError } = await supabase
    .from("customer_payment_credits")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("source_payment_allocation_id", allocation.id)
    .eq("status", "open")
    .limit(1);

  if (customerCreditError && !isMissingTableError(customerCreditError, "customer_payment_credits")) {
    return { ok: false, message: customerCreditError.message };
  }

  const customerCredit = customerCreditRows?.[0] ?? null;
  if (customerCredit) {
    const { data: creditRow, error: creditUpdateError } = await supabase
      .from("customer_payment_credits")
      .update({
        status: "void",
        metadata: {
          ...cleanMetadata(customerCredit.metadata),
          voided_by: userId,
          voided_at: reversedAt,
          void_reason: "source allocation reversed"
        }
      })
      .eq("workspace_id", workspaceId)
      .eq("id", customerCredit.id)
      .select("*")
      .single();

    if (creditUpdateError && !isMissingTableError(creditUpdateError, "customer_payment_credits")) {
      return { ok: false, message: creditUpdateError.message };
    }

    voidedCustomerCredit = creditRow ?? { ...customerCredit, status: cleanCustomerCreditStatus("void") };
  }

  const audit = await writeAuditLog({
    workspaceId,
    action: "payment_allocation.reversed",
    entityType: "payment_allocation",
    entityId: allocation.id,
    summary: "Payment allocation reversed for review",
    metadata: {
      allocation_id: allocation.id,
      invoice_id: allocation.invoice_id,
      bank_transaction_id: allocation.bank_transaction_id,
      payment_match_suggestion_id: allocation.payment_match_suggestion_id,
      restored_invoice_status: invoiceStatus,
      restored_bank_status: bankStatus,
      restored_match_status: matchStatus,
      remaining_invoice_allocated: remainingInvoiceAllocated,
      reversed_split_lines: reversedSplitLines,
      voided_customer_credit_id: voidedCustomerCredit?.id ?? null,
      amount: allocation.amount,
      currency: allocation.currency
    }
  });

  return {
    ok: true,
    allocation: { ...allocation, status: "reversed", reversal_note: cleanNote },
    voidedCustomerCredit,
    audit,
    method: "browser_fallback",
    message: "Payment allocation reversed for review."
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

  const session = await getSession();
  const userId = session?.user?.id ?? null;
  const ownerPayload = demoSeedBundle.ownerProfiles.map((owner) => ({
    ...owner,
    workspace_id: workspaceId,
    created_by: userId
  }));

  const { data: ownerProfiles, error: ownerError } = await supabase
    .from("workspace_owner_profiles")
    .insert(ownerPayload)
    .select("*");

  if (ownerError) return { ok: false, message: ownerError.message };

  let accountingConnections = [];
  let accountingSyncRuns = [];
  if (demoSeedBundle.accountingConnections?.length) {
    const accountingPayload = demoSeedBundle.accountingConnections.map(({ key, ...connection }) => ({
      workspace_id: workspaceId,
      created_by: userId,
      provider: cleanAccountingProvider(connection.provider),
      connection_name: cleanText(connection.connection_name) || "Accounting connection",
      status: cleanAccountingConnectionStatus(connection.status),
      external_tenant_id: cleanOptionalText(connection.external_tenant_id),
      sync_direction: cleanAccountingSyncDirection(connection.sync_direction),
      default_currency: cleanText(connection.default_currency) || "AED",
      last_sync_at: cleanOptionalText(connection.last_sync_at),
      next_sync_at: cleanOptionalText(connection.next_sync_at),
      metadata: cleanMetadata(connection.metadata)
    }));

    const { data: connectionRows, error: accountingError } = await supabase
      .from("workspace_accounting_connections")
      .insert(accountingPayload)
      .select("*");

    if (accountingError && !isMissingTableError(accountingError, "workspace_accounting_connections")) {
      return { ok: false, message: accountingError.message };
    }

    accountingConnections = connectionRows ?? [];
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

  if (accountingConnections.length && demoSeedBundle.accountingSyncRuns?.length) {
    const connectionKeyByProvider = new Map(demoSeedBundle.accountingConnections.map((connection) => [connection.provider, connection.key]));
    const connectionByKey = new Map(accountingConnections.map((connection) => [connectionKeyByProvider.get(connection.provider), connection]));
    const syncRunPayload = demoSeedBundle.accountingSyncRuns.map(({ connectionKey, ...run }) => ({
      workspace_id: workspaceId,
      accounting_connection_id: connectionByKey.get(connectionKey)?.id ?? null,
      created_by: userId,
      run_type: cleanAccountingRunType(run.run_type),
      status: cleanAccountingRunStatus(run.status),
      started_at: cleanOptionalText(run.started_at),
      completed_at: cleanOptionalText(run.completed_at),
      records_examined: cleanCount(run.records_examined),
      records_matched: cleanCount(run.records_matched),
      records_created: cleanCount(run.records_created),
      records_failed: cleanCount(run.records_failed),
      summary: cleanOptionalText(run.summary),
      metadata: cleanMetadata(run.metadata)
    }));

    const { data: syncRunRows, error: syncRunError } = await supabase
      .from("accounting_sync_runs")
      .insert(syncRunPayload)
      .select("*");

    if (syncRunError && !isMissingTableError(syncRunError, "accounting_sync_runs")) {
      return { ok: false, message: syncRunError.message };
    }

    accountingSyncRuns = syncRunRows ?? [];
  }

  const keyToCustomerName = new Map(demoSeedBundle.customers.map((customer) => [customer.key, customer.name]));
  const customerIdByName = new Map((customers ?? []).map((customer) => [customer.name, customer.id]));
  const customerIdByKey = (key) => customerIdByName.get(keyToCustomerName.get(key)) ?? null;

  let playbooks = [];
  if (demoSeedBundle.customerPlaybooks?.length) {
    const playbookPayload = demoSeedBundle.customerPlaybooks.map(({ customerKey, ...playbook }) => ({
      workspace_id: workspaceId,
      customer_id: customerIdByKey(customerKey),
      created_by: userId,
      playbook_name: cleanText(playbook.playbook_name) || "Customer collection playbook",
      payment_behavior: cleanPlaybookBehavior(playbook.payment_behavior),
      preferred_channel: cleanPreferredContactChannel(playbook.preferred_channel),
      reminder_tone: cleanReminderTone(playbook.reminder_tone),
      escalation_policy: cleanEscalationPolicy(playbook.escalation_policy),
      risk_weight: cleanRiskWeight(playbook.risk_weight),
      days_before_due: cleanDaysBeforeDue(playbook.days_before_due),
      notes: cleanOptionalText(playbook.notes),
      metadata: cleanMetadata(playbook.metadata)
    }));

    const { data: playbookRows, error: playbookError } = await supabase
      .from("customer_collection_playbooks")
      .insert(playbookPayload)
      .select("*");

    if (playbookError && !isMissingTableError(playbookError, "customer_collection_playbooks")) {
      return { ok: false, message: playbookError.message };
    }

    playbooks = playbookRows ?? [];
  }

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

  const invoiceIdByNumber = new Map((invoices ?? []).map((invoice) => [invoice.invoice_number, invoice.id]));

  let bankAccounts = [];
  if (demoSeedBundle.bankAccounts?.length) {
    const bankAccountPayload = demoSeedBundle.bankAccounts.map(({ key, ...account }) => ({
      workspace_id: workspaceId,
      created_by: userId,
      account_name: cleanText(account.account_name) || "Operating account",
      bank_name: cleanOptionalText(account.bank_name),
      account_mask: cleanOptionalText(account.account_mask),
      currency: cleanText(account.currency) || "AED",
      status: cleanBankAccountStatus(account.status),
      last_import_at: cleanOptionalText(account.last_import_at),
      metadata: cleanMetadata(account.metadata)
    }));

    const { data: bankAccountRows, error: bankAccountError } = await supabase
      .from("workspace_bank_accounts")
      .insert(bankAccountPayload)
      .select("*");

    if (bankAccountError && !isMissingTableError(bankAccountError, "workspace_bank_accounts")) {
      return { ok: false, message: bankAccountError.message };
    }

    bankAccounts = bankAccountRows ?? [];
  }

  let providerOAuthRequests = [];
  if (demoSeedBundle.providerOAuthRequests?.length) {
    const accountingConnectionKeyByProvider = new Map(demoSeedBundle.accountingConnections.map((connection) => [connection.provider, connection.key]));
    const accountingConnectionByKey = new Map(accountingConnections.map((connection) => [accountingConnectionKeyByProvider.get(connection.provider), connection]));
    const bankAccountNameByKey = new Map(demoSeedBundle.bankAccounts.map((account) => [account.key, account.account_name]));
    const bankAccountByName = new Map(bankAccounts.map((account) => [account.account_name, account]));
    const bankAccountByKey = (key) => bankAccountByName.get(bankAccountNameByKey.get(key)) ?? null;
    const oauthPayload = demoSeedBundle.providerOAuthRequests.map(({ key, accountingConnectionKey, bankAccountKey, ...request }) => ({
      workspace_id: workspaceId,
      created_by: userId,
      integration_type: cleanProviderIntegrationType(request.integration_type),
      provider: cleanProviderOAuthProvider(request.provider),
      accounting_connection_id: accountingConnectionByKey.get(accountingConnectionKey)?.id ?? null,
      bank_account_id: bankAccountByKey(bankAccountKey)?.id ?? null,
      status: cleanProviderOAuthStatus(request.status),
      requested_scopes: Array.isArray(request.requested_scopes) ? request.requested_scopes : [],
      redirect_uri: cleanOptionalText(request.redirect_uri),
      state_nonce_hash: cleanOptionalText(request.state_nonce_hash),
      code_challenge_method: cleanCodeChallengeMethod(request.code_challenge_method),
      code_challenge_hash: cleanOptionalText(request.code_challenge_hash),
      expires_at: cleanOptionalText(request.expires_at),
      authorized_at: cleanOptionalText(request.authorized_at),
      error_code: cleanOptionalText(request.error_code),
      error_message: cleanOptionalText(request.error_message),
      metadata: cleanMetadata(request.metadata)
    }));

    const { data: oauthRows, error: oauthError } = await supabase
      .from("provider_oauth_requests")
      .insert(oauthPayload)
      .select("*");

    if (oauthError && !isMissingTableError(oauthError, "provider_oauth_requests")) {
      return { ok: false, message: oauthError.message };
    }

    providerOAuthRequests = oauthRows ?? [];
  }

  let providerOAuthCallbackEvents = [];
  if (providerOAuthRequests.length && demoSeedBundle.providerOAuthCallbackEvents?.length) {
    const oauthRequestKeyByIdentity = new Map(demoSeedBundle.providerOAuthRequests.map((request) => [
      `${request.integration_type}:${request.provider}`,
      request.key
    ]));
    const oauthRequestByKey = new Map(providerOAuthRequests.map((request) => [
      oauthRequestKeyByIdentity.get(`${request.integration_type}:${request.provider}`),
      request
    ]));
    const callbackPayload = demoSeedBundle.providerOAuthCallbackEvents.map(({ key, providerOAuthRequestKey, ...event }) => {
      const oauthRequest = oauthRequestByKey.get(providerOAuthRequestKey);
      return {
        workspace_id: workspaceId,
        provider_oauth_request_id: oauthRequest?.id ?? null,
        integration_type: cleanProviderIntegrationType(event.integration_type),
        provider: cleanProviderOAuthProvider(event.provider),
        status: cleanProviderOAuthCallbackStatus(event.status),
        state_nonce_hash: cleanOptionalText(event.state_nonce_hash),
        authorization_code_hash: cleanOptionalText(event.authorization_code_hash),
        error_code: cleanOptionalText(event.error_code),
        error_description: cleanOptionalText(event.error_description),
        received_at: cleanOptionalText(event.received_at),
        metadata: cleanMetadata(event.metadata)
      };
    }).filter((event) => event.provider_oauth_request_id);

    if (callbackPayload.length) {
      const { data: callbackRows, error: callbackError } = await supabase
        .from("provider_oauth_callback_events")
        .insert(callbackPayload)
        .select("*");

      if (callbackError && !isMissingTableError(callbackError, "provider_oauth_callback_events")) {
        return { ok: false, message: callbackError.message };
      }

      providerOAuthCallbackEvents = callbackRows ?? [];
    }
  }

  let providerCredentialVault = [];
  if (providerOAuthRequests.length && demoSeedBundle.providerCredentialVault?.length) {
    const oauthRequestKeyByIdentity = new Map(demoSeedBundle.providerOAuthRequests.map((request) => [
      `${request.integration_type}:${request.provider}`,
      request.key
    ]));
    const oauthRequestByKey = new Map(providerOAuthRequests.map((request) => [
      oauthRequestKeyByIdentity.get(`${request.integration_type}:${request.provider}`),
      request
    ]));
    const callbackKeyByIdentity = new Map((demoSeedBundle.providerOAuthCallbackEvents ?? []).map((event) => [
      `${event.integration_type}:${event.provider}`,
      event.key
    ]));
    const callbackEventByKey = new Map(providerOAuthCallbackEvents.map((event) => [
      callbackKeyByIdentity.get(`${event.integration_type}:${event.provider}`),
      event
    ]));
    const accountingConnectionKeyByProvider = new Map(demoSeedBundle.accountingConnections.map((connection) => [connection.provider, connection.key]));
    const accountingConnectionByKey = new Map(accountingConnections.map((connection) => [accountingConnectionKeyByProvider.get(connection.provider), connection]));
    const bankAccountNameByKey = new Map(demoSeedBundle.bankAccounts.map((account) => [account.key, account.account_name]));
    const bankAccountByName = new Map(bankAccounts.map((account) => [account.account_name, account]));
    const bankAccountByKey = (key) => bankAccountByName.get(bankAccountNameByKey.get(key)) ?? null;
    const credentialPayload = demoSeedBundle.providerCredentialVault.map(({ key, providerOAuthRequestKey, providerOAuthCallbackKey, accountingConnectionKey, bankAccountKey, ...credential }) => {
      const oauthRequest = oauthRequestByKey.get(providerOAuthRequestKey);
      return {
        workspace_id: workspaceId,
        provider_oauth_request_id: oauthRequest?.id ?? null,
        provider_oauth_callback_event_id: callbackEventByKey.get(providerOAuthCallbackKey)?.id ?? null,
        accounting_connection_id: accountingConnectionByKey.get(accountingConnectionKey)?.id ?? null,
        bank_account_id: bankAccountByKey(bankAccountKey)?.id ?? null,
        integration_type: cleanProviderIntegrationType(credential.integration_type),
        provider: cleanProviderOAuthProvider(credential.provider),
        status: cleanProviderCredentialStatus(credential.status),
        credential_ref: cleanText(credential.credential_ref) || "vault://pending",
        token_family_hash: cleanOptionalText(credential.token_family_hash),
        encryption_key_version: cleanText(credential.encryption_key_version) || "edge-vault-v1",
        scopes: Array.isArray(credential.scopes) ? credential.scopes : [],
        token_expires_at: cleanOptionalText(credential.token_expires_at),
        last_refreshed_at: cleanOptionalText(credential.last_refreshed_at),
        rotation_due_at: cleanOptionalText(credential.rotation_due_at),
        revoked_at: cleanOptionalText(credential.revoked_at),
        error_code: cleanOptionalText(credential.error_code),
        error_message: cleanOptionalText(credential.error_message),
        metadata: cleanMetadata(credential.metadata)
      };
    }).filter((credential) => credential.provider_oauth_request_id);

    if (credentialPayload.length) {
      const { data: credentialRows, error: credentialError } = await supabase
        .from("provider_credential_vault")
        .upsert(credentialPayload, { onConflict: "workspace_id,provider,integration_type" })
        .select("*");

      if (credentialError && !isMissingTableError(credentialError, "provider_credential_vault")) {
        return { ok: false, message: credentialError.message };
      }

      providerCredentialVault = credentialRows ?? [];
    }
  }

  let providerTokenExchangeRuns = [];
  if (providerOAuthRequests.length && demoSeedBundle.providerTokenExchangeRuns?.length) {
    const oauthRequestKeyByIdentity = new Map(demoSeedBundle.providerOAuthRequests.map((request) => [
      `${request.integration_type}:${request.provider}`,
      request.key
    ]));
    const oauthRequestByKey = new Map(providerOAuthRequests.map((request) => [
      oauthRequestKeyByIdentity.get(`${request.integration_type}:${request.provider}`),
      request
    ]));
    const callbackKeyByIdentity = new Map((demoSeedBundle.providerOAuthCallbackEvents ?? []).map((event) => [
      `${event.integration_type}:${event.provider}`,
      event.key
    ]));
    const callbackEventByKey = new Map(providerOAuthCallbackEvents.map((event) => [
      callbackKeyByIdentity.get(`${event.integration_type}:${event.provider}`),
      event
    ]));
    const credentialKeyByIdentity = new Map((demoSeedBundle.providerCredentialVault ?? []).map((credential) => [
      `${credential.integration_type}:${credential.provider}`,
      credential.key
    ]));
    const credentialVaultByKey = new Map(providerCredentialVault.map((credential) => [
      credentialKeyByIdentity.get(`${credential.integration_type}:${credential.provider}`),
      credential
    ]));
    const tokenExchangePayload = demoSeedBundle.providerTokenExchangeRuns.map(({ providerOAuthRequestKey, providerOAuthCallbackKey, providerCredentialKey, ...run }) => {
      const oauthRequest = oauthRequestByKey.get(providerOAuthRequestKey);
      return {
        workspace_id: workspaceId,
        provider_oauth_request_id: oauthRequest?.id ?? null,
        provider_oauth_callback_event_id: callbackEventByKey.get(providerOAuthCallbackKey)?.id ?? null,
        provider_credential_vault_id: credentialVaultByKey.get(providerCredentialKey)?.id ?? null,
        created_by: userId,
        integration_type: cleanProviderIntegrationType(run.integration_type),
        provider: cleanProviderOAuthProvider(run.provider),
        exchange_mode: cleanProviderTokenExchangeMode(run.exchange_mode),
        status: cleanProviderTokenExchangeStatus(run.status),
        authorization_code_hash: cleanOptionalText(run.authorization_code_hash),
        code_verifier_hash: cleanOptionalText(run.code_verifier_hash),
        token_response_hash: cleanOptionalText(run.token_response_hash),
        token_expires_at: cleanOptionalText(run.token_expires_at),
        started_at: cleanOptionalText(run.started_at),
        completed_at: cleanOptionalText(run.completed_at),
        error_code: cleanOptionalText(run.error_code),
        error_message: cleanOptionalText(run.error_message),
        metadata: cleanMetadata(run.metadata)
      };
    }).filter((run) => run.provider_oauth_request_id);

    if (tokenExchangePayload.length) {
      const { data: exchangeRows, error: exchangeError } = await supabase
        .from("provider_token_exchange_runs")
        .insert(tokenExchangePayload)
        .select("*");

      if (exchangeError && !isMissingTableError(exchangeError, "provider_token_exchange_runs")) {
        return { ok: false, message: exchangeError.message };
      }

      providerTokenExchangeRuns = exchangeRows ?? [];
    }
  }

  let bankTransactions = [];
  if (bankAccounts.length && demoSeedBundle.bankTransactions?.length) {
    const bankAccountNameByKey = new Map(demoSeedBundle.bankAccounts.map((account) => [account.key, account.account_name]));
    const bankAccountIdByName = new Map(bankAccounts.map((account) => [account.account_name, account.id]));
    const bankAccountIdByKey = (key) => bankAccountIdByName.get(bankAccountNameByKey.get(key)) ?? null;
    const bankTransactionPayload = demoSeedBundle.bankTransactions.map(({ key, bankAccountKey, ...transaction }) => ({
      workspace_id: workspaceId,
      bank_account_id: bankAccountIdByKey(bankAccountKey),
      created_by: userId,
      transaction_date: cleanOptionalText(transaction.transaction_date) || new Date().toISOString().slice(0, 10),
      posted_at: cleanOptionalText(transaction.posted_at),
      description: cleanText(transaction.description) || "Imported bank transaction",
      counterparty: cleanOptionalText(transaction.counterparty),
      reference: cleanOptionalText(transaction.reference),
      direction: cleanBankTransactionDirection(transaction.direction),
      amount: cleanAmount(transaction.amount),
      currency: cleanText(transaction.currency) || "AED",
      status: cleanBankTransactionStatus(transaction.status),
      raw_payload: cleanMetadata(transaction.raw_payload)
    }));

    const { data: bankTransactionRows, error: bankTransactionError } = await supabase
      .from("bank_transactions")
      .insert(bankTransactionPayload)
      .select("*");

    if (bankTransactionError && !isMissingTableError(bankTransactionError, "bank_transactions")) {
      return { ok: false, message: bankTransactionError.message };
    }

    bankTransactions = bankTransactionRows ?? [];
  }

  let paymentMatchSuggestions = [];
  if (bankTransactions.length && demoSeedBundle.paymentMatchSuggestions?.length) {
    const transactionReferenceByKey = new Map(demoSeedBundle.bankTransactions.map((transaction) => [transaction.key, transaction.reference]));
    const transactionIdByReference = new Map(bankTransactions.map((transaction) => [transaction.reference, transaction.id]));
    const transactionIdByKey = (key) => transactionIdByReference.get(transactionReferenceByKey.get(key)) ?? null;
    const matchPayload = demoSeedBundle.paymentMatchSuggestions.map(({ bankTransactionKey, invoiceNumber, customerKey, ...match }) => ({
      workspace_id: workspaceId,
      bank_transaction_id: transactionIdByKey(bankTransactionKey),
      invoice_id: invoiceNumber ? invoiceIdByNumber.get(invoiceNumber) ?? null : null,
      customer_id: customerIdByKey(customerKey),
      created_by: userId,
      confidence: cleanConfidence(match.confidence),
      match_status: cleanPaymentMatchStatus(match.match_status),
      match_reason: cleanOptionalText(match.match_reason),
      review_note: cleanOptionalText(match.review_note),
      metadata: cleanMetadata(match.metadata)
    })).filter((match) => match.bank_transaction_id);

    const { data: matchRows, error: matchError } = await supabase
      .from("payment_match_suggestions")
      .insert(matchPayload)
      .select("*");

    if (matchError && !isMissingTableError(matchError, "payment_match_suggestions")) {
      return { ok: false, message: matchError.message };
    }

    paymentMatchSuggestions = matchRows ?? [];

    if (paymentMatchSuggestions.length && demoSeedBundle.paymentMatchSplitLines?.length) {
      const matchTransactionKeyByKey = new Map(demoSeedBundle.paymentMatchSuggestions
        .filter((match) => match.key)
        .map((match) => [match.key, match.bankTransactionKey]));
      const matchIdByKey = (key) => {
        const bankTransactionId = transactionIdByKey(matchTransactionKeyByKey.get(key));
        return paymentMatchSuggestions.find((match) => match.bank_transaction_id === bankTransactionId)?.id ?? null;
      };
      const splitLinePayload = demoSeedBundle.paymentMatchSplitLines.map(({ matchKey, invoiceNumber, customerKey, ...line }) => ({
        workspace_id: workspaceId,
        payment_match_suggestion_id: matchIdByKey(matchKey),
        invoice_id: invoiceIdByNumber.get(invoiceNumber) ?? null,
        customer_id: customerIdByKey(customerKey),
        line_order: cleanCount(line.line_order) || 1,
        amount: cleanAmount(line.amount),
        status: line.status === "accepted" || line.status === "rejected" ? line.status : "suggested",
        metadata: cleanMetadata(line.metadata)
      })).filter((line) => line.payment_match_suggestion_id && line.invoice_id);

      if (splitLinePayload.length) {
        const { error: splitLineError } = await supabase
          .from("payment_match_split_lines")
          .insert(splitLinePayload);

        if (splitLineError && !isMissingTableError(splitLineError, "payment_match_split_lines")) {
          return { ok: false, message: splitLineError.message };
        }
      }
    }
  }

  const audit = await writeAuditLog({
    workspaceId,
    action: "workspace.seeded",
    entityType: "workspace",
    entityId: workspaceId,
    summary: "Demo customers, deals, invoices, owner profiles, collection playbooks, accounting sync records, and bank match suggestions seeded",
    metadata: {
      customers: customers?.length ?? 0,
      deals: deals?.length ?? 0,
      invoices: invoices?.length ?? 0,
      owners: ownerProfiles?.length ?? 0,
      playbooks: playbooks.length,
      accounting_connections: accountingConnections.length,
      accounting_runs: accountingSyncRuns.length,
      oauth_requests: providerOAuthRequests.length,
      oauth_callback_events: providerOAuthCallbackEvents.length,
      credential_vault_entries: providerCredentialVault.length,
      token_exchange_runs: providerTokenExchangeRuns.length,
      bank_accounts: bankAccounts.length,
      bank_transactions: bankTransactions.length,
      match_suggestions: paymentMatchSuggestions.length
    }
  });

  return {
    ok: true,
    audit,
    method: "browser_fallback",
    counts: {
      customers: customers?.length ?? 0,
      deals: deals?.length ?? 0,
      invoices: invoices?.length ?? 0,
      owners: ownerProfiles?.length ?? 0,
      playbooks: playbooks.length,
      accounting_connections: accountingConnections.length,
      accounting_runs: accountingSyncRuns.length,
      oauth_requests: providerOAuthRequests.length,
      oauth_callback_events: providerOAuthCallbackEvents.length,
      credential_vault_entries: providerCredentialVault.length,
      token_exchange_runs: providerTokenExchangeRuns.length,
      bank_accounts: bankAccounts.length,
      bank_transactions: bankTransactions.length,
      match_suggestions: paymentMatchSuggestions.length
    },
    message: seedMessage({
      customers: customers?.length ?? 0,
      deals: deals?.length ?? 0,
      invoices: invoices?.length ?? 0,
      owners: ownerProfiles?.length ?? 0,
      playbooks: playbooks.length,
      accounting_connections: accountingConnections.length,
      accounting_runs: accountingSyncRuns.length,
      oauth_requests: providerOAuthRequests.length,
      oauth_callback_events: providerOAuthCallbackEvents.length,
      credential_vault_entries: providerCredentialVault.length,
      token_exchange_runs: providerTokenExchangeRuns.length,
      bank_accounts: bankAccounts.length,
      bank_transactions: bankTransactions.length,
      match_suggestions: paymentMatchSuggestions.length
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
