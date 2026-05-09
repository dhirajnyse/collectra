import { useEffect, useMemo, useState } from "react";
import { demoMetrics, roadmap, version } from "./lib/demoData.js";
import { demoAuditEvents, demoCustomers, demoWorkflow, schemaChecklist } from "./lib/platformData.js";
import { getSupabaseStatus } from "./lib/supabaseClient.js";
import {
  assignCollectionAction,
  approvePaymentMatch,
  approveOutboundMessage,
  createOwnerDigest,
  createWorkspace,
  fetchWorkspaceBundle,
  generateFollowupDraft,
  getSession,
  listWorkspaces,
  markInvoicePaid,
  queueOwnerDigest,
  queueOutboundMessage,
  rejectOutboundMessage,
  reversePaymentAllocation,
  saveEmailSettings,
  saveOwnerDigestSchedule,
  saveWhatsAppSettings,
  seedDemoWorkspace,
  sendMagicLink,
  sendQueuedEmail,
  sendQueuedWhatsApp,
  signOut,
  subscribeToAuthChanges,
  escalateCollectionAction,
  trackCollectionAction,
  updateCollectionActionStatus
} from "./lib/collectraService.js";

const defaultActionOwnerOptions = ["Finance owner", "Sales owner", "Ops owner", "Dhiraj"];

function formatCurrency(value) {
  return `AED ${Number(value || 0).toLocaleString("en-US")}`;
}

function formatDate(value) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatTimestamp(value) {
  if (!value) return "No timestamp";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function checkStatus(isReady) {
  return isReady ? "ready" : "pending";
}

function invoiceLabel(invoice, customerNameById) {
  if (!invoice) return "No invoice";
  const customerName = customerNameById.get(invoice.customer_id) || "No customer";
  return `${invoice.invoice_number} - ${customerName} - ${formatCurrency(invoice.amount)}`;
}

function daysPastDue(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  return Math.floor((today.getTime() - due.getTime()) / 86400000);
}

function riskBand(score) {
  if (score >= 75) return { label: "Critical", className: "critical" };
  if (score >= 55) return { label: "High", className: "high" };
  if (score >= 35) return { label: "Watch", className: "watch" };
  return { label: "Steady", className: "steady" };
}

function titleizeToken(value) {
  return String(value || "standard").replace(/_/g, " ");
}

function accountingProviderLabel(value) {
  const labels = {
    quickbooks: "QuickBooks",
    xero: "Xero",
    zoho_books: "Zoho Books",
    tally: "Tally",
    manual_csv: "Manual CSV",
    plaid: "Plaid",
    lean: "Lean",
    tarabut_gateway: "Tarabut Gateway",
    emirates_nbd: "Emirates NBD"
  };
  return labels[value] || titleizeToken(value);
}

function playbookChannelLabel(playbook, fallback = "Email") {
  const channel = String(playbook?.preferred_channel || "").toLowerCase();
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "phone") return "Phone";
  if (channel === "manual") return "Manual";
  if (channel === "email") return "Email";
  return fallback;
}

function playbookActionLabel(playbook, fallback) {
  const channel = String(playbook?.preferred_channel || "").toLowerCase();
  if (channel === "whatsapp") return "Send WhatsApp nudge";
  if (channel === "phone") return "Call finance contact";
  if (channel === "manual") return "Manual owner follow-up";
  return fallback;
}

function latestByCreatedAt(records) {
  return [...records].sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime())[0] ?? null;
}

function actionKeyFor(invoiceId, actionLabel) {
  return `${invoiceId || "none"}:${actionLabel || "action"}`;
}

function dueAtForUrgency(urgency) {
  const date = new Date();
  if (urgency === "Now" || urgency === "Today") {
    date.setHours(18, 0, 0, 0);
  } else if (urgency === "Next") {
    date.setDate(date.getDate() + 1);
    date.setHours(12, 0, 0, 0);
  } else {
    date.setDate(date.getDate() + 7);
    date.setHours(12, 0, 0, 0);
  }
  return date.toISOString();
}

function actionEscalationState(action) {
  const level = Number(action?.escalation_level ?? 0);
  if (action?.status !== "open") {
    return { label: String(action?.status || "closed"), className: String(action?.status || "closed"), level };
  }

  const dueAt = action?.due_at ? new Date(action.due_at) : null;
  const dueTime = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt.getTime() : null;
  const now = Date.now();

  if (level > 0) return { label: `Level ${level}`, className: "escalated", level };
  if (dueTime !== null && dueTime < now) return { label: "Overdue", className: "overdue", level };
  if (dueTime !== null && dueTime - now <= 86400000) return { label: "Due soon", className: "due-soon", level };
  return { label: "On track", className: "on-track", level };
}

function ownerLabelFor(action) {
  return action?.owner_label || "Finance owner";
}

function messageReviewStatus(message) {
  return message?.review_status || (message?.approved_at ? "approved" : "pending");
}

function isActionPastDue(action) {
  if (!action?.due_at) return false;
  const dueTime = new Date(action.due_at).getTime();
  return Number.isFinite(dueTime) && dueTime < Date.now();
}

function digestPreviewLines(value) {
  return String(value || "").split("\n").filter(Boolean).slice(0, 6);
}

function nextBestAction({ score, days, deliveryStatus, outboundStatus, retryCount, hasFollowup, playbook }) {
  const playbookPreference = playbook ? ` Customer playbook prefers ${playbookChannelLabel(playbook).toLowerCase()} and ${titleizeToken(playbook.escalation_policy)} escalation.` : "";

  if (["failed", "bounced", "complained", "suppressed"].includes(deliveryStatus) || retryCount > 0) {
    return {
      label: "Retry provider send",
      channel: "Automation",
      urgency: "Now",
      className: "urgent",
      rationale: `Last delivery path failed or already needed retry handling.${playbookPreference}`
    };
  }

  if (outboundStatus === "queued") {
    return {
      label: "Approve queued follow-up",
      channel: "Review",
      urgency: "Today",
      className: "review",
      rationale: `A customer message is waiting before it can move money forward.${playbookPreference}`
    };
  }

  if (playbook?.escalation_policy === "hold") {
    return {
      label: "Review playbook hold",
      channel: "Review",
      urgency: "Today",
      className: "review",
      rationale: "Customer playbook requires review before any follow-up is sent."
    };
  }

  if (playbook?.escalation_policy === "owner_review" && score >= 35) {
    return {
      label: "Owner review",
      channel: "Review",
      urgency: "Today",
      className: "review",
      rationale: `Customer playbook asks for owner review on collection pressure.${playbookPreference}`
    };
  }

  if (["delivered", "read", "opened", "clicked"].includes(deliveryStatus) && score >= 55) {
    return {
      label: "Call after engagement",
      channel: "Phone",
      urgency: "Today",
      className: "urgent",
      rationale: `The customer likely saw the message, so a direct nudge is timely.${playbookPreference}`
    };
  }

  if (score >= 75) {
    return {
      label: playbookActionLabel(playbook, "Call finance contact"),
      channel: playbookChannelLabel(playbook, "Phone"),
      urgency: "Today",
      className: "urgent",
      rationale: `High risk and cash impact justify direct owner-level follow-up.${playbookPreference}`
    };
  }

  if (score >= 55) {
    return {
      label: playbookActionLabel(playbook, "Send firm follow-up"),
      channel: playbookChannelLabel(playbook, "Email"),
      urgency: "Today",
      className: "firm",
      rationale: `Risk is high enough for a clear payment commitment request.${playbookPreference}`
    };
  }

  if (!hasFollowup && days !== null && days >= -3) {
    return {
      label: "Draft reminder",
      channel: "AI Desk",
      urgency: "Next",
      className: "review",
      rationale: `No follow-up exists and the due date is close or passed.${playbookPreference}`
    };
  }

  if (score >= 35) {
    return {
      label: playbookActionLabel(playbook, "Prepare reminder"),
      channel: playbookChannelLabel(playbook, "Email"),
      urgency: "Next",
      className: "review",
      rationale: `Risk is emerging but still controllable.${playbookPreference}`
    };
  }

  return {
    label: "Monitor",
      channel: "Watchlist",
      urgency: "Later",
      className: "steady",
      rationale: `Invoice is current or low-risk based on available signals.${playbookPreference}`
    };
}

function scoreCollectionRisk({ invoice, customerName, outboundMessages, followups, playbook }) {
  const days = daysPastDue(invoice.due_date);
  const invoiceStatus = String(invoice.status || "open");
  const messages = outboundMessages.filter((message) => message.invoice_id === invoice.id);
  const latestMessage = latestByCreatedAt(messages);
  const hasFollowup = followups.some((followup) => followup.invoice_id === invoice.id);
  const reasons = [];
  let score = 0;

  if (days === null) {
    score += 12;
    reasons.push("Missing due date");
  } else if (days > 30) {
    score += 45;
    reasons.push(`${days} days overdue`);
  } else if (days > 14) {
    score += 35;
    reasons.push(`${days} days overdue`);
  } else if (days > 0) {
    score += 28;
    reasons.push(`${days} days overdue`);
  } else if (days >= -3) {
    score += 18;
    reasons.push("Due within 3 days");
  } else if (days >= -10) {
    score += 10;
    reasons.push("Due within 10 days");
  }

  if (invoiceStatus === "overdue") {
    score += 20;
    reasons.push("Marked overdue");
  } else if (invoiceStatus === "due") {
    score += 8;
    reasons.push("Marked due soon");
  } else if (invoiceStatus === "partial") {
    score += 12;
    reasons.push("Partial payment received");
  }

  const amount = Number(invoice.amount || 0);
  if (amount >= 100000) {
    score += 20;
    reasons.push("Large receivable");
  } else if (amount >= 75000) {
    score += 14;
    reasons.push("Material receivable");
  } else if (amount >= 50000) {
    score += 10;
    reasons.push("Meaningful cash impact");
  }

  const deliveryStatus = String(latestMessage?.delivery_status || latestMessage?.status || "");
  if (["failed", "bounced", "complained", "suppressed"].includes(deliveryStatus)) {
    score += 22;
    reasons.push("Last send failed");
  } else if (deliveryStatus === "queued") {
    score += 8;
    reasons.push("Follow-up waiting in queue");
  } else if (["delivered", "read", "opened", "clicked"].includes(deliveryStatus)) {
    score -= 8;
    reasons.push("Provider engagement seen");
  } else if (!latestMessage && days !== null && days > 0) {
    score += 10;
    reasons.push("No outbound follow-up yet");
  }

  const retryCount = Number(latestMessage?.retry_count || 0);
  if (retryCount > 0) {
    score += Math.min(16, retryCount * 6);
    reasons.push(`${retryCount} retry attempt${retryCount === 1 ? "" : "s"}`);
  }

  if (!hasFollowup && days !== null && days >= -3) {
    score += 6;
    reasons.push("No AI draft history");
  }

  const playbookRiskWeight = Number(playbook?.risk_weight ?? 0);
  if (Number.isFinite(playbookRiskWeight) && playbookRiskWeight !== 0) {
    score += playbookRiskWeight;
    reasons.push(`Playbook ${playbookRiskWeight > 0 ? "+" : ""}${playbookRiskWeight} risk`);
  }

  if (playbook?.payment_behavior) {
    reasons.push(`${titleizeToken(playbook.payment_behavior)} behavior`);
  }

  const clampedScore = Math.max(0, Math.min(100, score));
  const band = riskBand(clampedScore);
  const action = nextBestAction({
    score: clampedScore,
    days,
    deliveryStatus,
    outboundStatus: String(latestMessage?.status || ""),
    retryCount,
    hasFollowup,
    playbook
  });

  return {
    id: invoice.id,
    invoice,
    customerName,
    score: clampedScore,
    band,
    reasons: reasons.length ? reasons.slice(0, 4) : ["Current and under control"],
    action,
    playbook
  };
}

export default function App() {
  const supabaseStatus = getSupabaseStatus();
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("Add Supabase credentials to enable live magic-link login.");
  const [isSending, setIsSending] = useState(false);
  const [session, setSession] = useState(null);
  const [workspaceName, setWorkspaceName] = useState("Gulf trading demo");
  const [workspaceLocation, setWorkspaceLocation] = useState("Dubai, UAE");
  const [workspaceMessage, setWorkspaceMessage] = useState("Sign in to create your first secured workspace.");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [workspaceBundle, setWorkspaceBundle] = useState(null);
  const [bundleMessage, setBundleMessage] = useState("Load a workspace to inspect live Supabase data.");
  const [isLoadingBundle, setIsLoadingBundle] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [markingInvoiceId, setMarkingInvoiceId] = useState("");
  const [isRefreshingPilot, setIsRefreshingPilot] = useState(false);
  const [pilotMessage, setPilotMessage] = useState("Pilot diagnostics are waiting for Supabase credentials.");
  const [selectedAiInvoiceId, setSelectedAiInvoiceId] = useState("");
  const [followupTone, setFollowupTone] = useState("friendly");
  const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
  const [followupMessage, setFollowupMessage] = useState("AI drafts will appear after a live workspace has invoices.");
  const [latestDraft, setLatestDraft] = useState(null);
  const [latestFollowup, setLatestFollowup] = useState(null);
  const [queueChannel, setQueueChannel] = useState("email");
  const [queueRecipient, setQueueRecipient] = useState("");
  const [isQueueingDraft, setIsQueueingDraft] = useState(false);
  const [queueMessage, setQueueMessage] = useState("Approved follow-ups will queue here before any send integration is connected.");
  const [emailFromName, setEmailFromName] = useState("Collectra Finance");
  const [emailFromEmail, setEmailFromEmail] = useState("");
  const [emailReplyTo, setEmailReplyTo] = useState("");
  const [emailStatus, setEmailStatus] = useState("draft");
  const [emailSettingsMessage, setEmailSettingsMessage] = useState("Email provider settings are waiting for a live workspace.");
  const [isSavingEmailSettings, setIsSavingEmailSettings] = useState(false);
  const [whatsappBusinessLabel, setWhatsappBusinessLabel] = useState("Collectra Finance");
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [whatsappDisplayPhone, setWhatsappDisplayPhone] = useState("");
  const [whatsappStatus, setWhatsappStatus] = useState("draft");
  const [whatsappSettingsMessage, setWhatsappSettingsMessage] = useState("WhatsApp provider settings are waiting for a live workspace.");
  const [isSavingWhatsappSettings, setIsSavingWhatsappSettings] = useState(false);
  const [sendingMessageId, setSendingMessageId] = useState("");
  const [trackingActionKey, setTrackingActionKey] = useState("");
  const [updatingActionId, setUpdatingActionId] = useState("");
  const [escalatingActionId, setEscalatingActionId] = useState("");
  const [assigningActionId, setAssigningActionId] = useState("");
  const [ownerDraftByActionId, setOwnerDraftByActionId] = useState({});
  const [actionMessage, setActionMessage] = useState("Track recommended actions, assign an owner, then escalate stale work.");
  const [creatingDigestOwner, setCreatingDigestOwner] = useState("");
  const [digestMessage, setDigestMessage] = useState("Owner digests summarize open cash work without sending messages.");
  const [queueingDigestId, setQueueingDigestId] = useState("");
  const [digestQueueChannel, setDigestQueueChannel] = useState("manual");
  const [digestQueueRecipient, setDigestQueueRecipient] = useState("");
  const [savingDigestScheduleOwner, setSavingDigestScheduleOwner] = useState("");
  const [digestScheduleCadence, setDigestScheduleCadence] = useState("weekly");
  const [digestScheduleChannel, setDigestScheduleChannel] = useState("manual");
  const [digestScheduleRecipient, setDigestScheduleRecipient] = useState("");
  const [approvingMessageId, setApprovingMessageId] = useState("");
  const [rejectingMessageId, setRejectingMessageId] = useState("");
  const [approvingPaymentMatchId, setApprovingPaymentMatchId] = useState("");
  const [reversingAllocationId, setReversingAllocationId] = useState("");
  const [paymentMatchMessage, setPaymentMatchMessage] = useState("Payment matches stay review-first until finance approves allocation.");

  const customerNameById = useMemo(() => {
    return new Map((workspaceBundle?.customers ?? []).map((customer) => [customer.id, customer.name]));
  }, [workspaceBundle]);

  const customerPlaybookByCustomerId = useMemo(() => {
    return new Map((workspaceBundle?.customerPlaybooks ?? [])
      .filter((playbook) => playbook.status !== "disabled")
      .map((playbook) => [playbook.customer_id, playbook]));
  }, [workspaceBundle]);

  const invoiceNumberById = useMemo(() => {
    return new Map((workspaceBundle?.invoices ?? []).map((invoice) => [invoice.id, invoice.invoice_number]));
  }, [workspaceBundle]);

  const invoiceById = useMemo(() => {
    return new Map((workspaceBundle?.invoices ?? []).map((invoice) => [invoice.id, invoice]));
  }, [workspaceBundle]);

  const bankAccountNameById = useMemo(() => {
    return new Map((workspaceBundle?.bankAccounts ?? []).map((account) => [account.id, account.account_name]));
  }, [workspaceBundle]);

  const bankTransactionById = useMemo(() => {
    return new Map((workspaceBundle?.bankTransactions ?? []).map((transaction) => [transaction.id, transaction]));
  }, [workspaceBundle]);

  const paymentMatchSplitLinesByMatchId = useMemo(() => {
    const lineMap = new Map();
    (workspaceBundle?.paymentMatchSplitLines ?? []).forEach((line) => {
      const rows = lineMap.get(line.payment_match_suggestion_id) ?? [];
      rows.push(line);
      lineMap.set(line.payment_match_suggestion_id, rows);
    });
    return lineMap;
  }, [workspaceBundle]);

  const paymentAllocationLinesByAllocationId = useMemo(() => {
    const lineMap = new Map();
    (workspaceBundle?.paymentAllocationLines ?? []).forEach((line) => {
      const rows = lineMap.get(line.payment_allocation_id) ?? [];
      rows.push(line);
      lineMap.set(line.payment_allocation_id, rows);
    });
    return lineMap;
  }, [workspaceBundle]);

  const ownerProfileByLabel = useMemo(() => {
    return new Map((workspaceBundle?.ownerProfiles ?? []).map((profile) => [profile.label, profile]));
  }, [workspaceBundle]);

  const ownerAssignmentOptions = useMemo(() => {
    const profileLabels = (workspaceBundle?.ownerProfiles ?? [])
      .filter((profile) => profile.status === "active")
      .map((profile) => profile.label);
    return profileLabels.length ? profileLabels : defaultActionOwnerOptions;
  }, [workspaceBundle]);

  const auditEvents = useMemo(() => {
    if (!workspaceBundle?.auditLogs?.length) return demoAuditEvents;
    return workspaceBundle.auditLogs.map((event) => ({
      action: event.action,
      actor: event.actor_id ? "Signed-in user" : "System",
      summary: event.summary || "No audit summary saved"
    }));
  }, [workspaceBundle]);

  const aiInvoices = useMemo(() => {
    return (workspaceBundle?.invoices ?? []).filter((invoice) => invoice.status !== "paid");
  }, [workspaceBundle]);

  const selectedAiInvoice = useMemo(() => {
    return (workspaceBundle?.invoices ?? []).find((invoice) => invoice.id === selectedAiInvoiceId) ?? null;
  }, [selectedAiInvoiceId, workspaceBundle]);

  const selectedAiCustomer = useMemo(() => {
    if (!selectedAiInvoice) return null;
    return (workspaceBundle?.customers ?? []).find((customer) => customer.id === selectedAiInvoice.customer_id) ?? null;
  }, [selectedAiInvoice, workspaceBundle]);

  const selectedAiCustomerPlaybook = useMemo(() => {
    if (!selectedAiInvoice) return null;
    return customerPlaybookByCustomerId.get(selectedAiInvoice.customer_id) ?? null;
  }, [customerPlaybookByCustomerId, selectedAiInvoice]);

  const latestAccountingConnection = useMemo(() => {
    return latestByCreatedAt(workspaceBundle?.accountingConnections ?? []);
  }, [workspaceBundle]);

  const latestAccountingSyncRun = useMemo(() => {
    return latestByCreatedAt(workspaceBundle?.accountingSyncRuns ?? []);
  }, [workspaceBundle]);

  const latestProviderOAuthRequest = useMemo(() => {
    return latestByCreatedAt(workspaceBundle?.providerOAuthRequests ?? []);
  }, [workspaceBundle]);

  const latestProviderOAuthCallbackEvent = useMemo(() => {
    return [...(workspaceBundle?.providerOAuthCallbackEvents ?? [])]
      .sort((left, right) => new Date(right.received_at || right.created_at || 0).getTime() - new Date(left.received_at || left.created_at || 0).getTime())[0] ?? null;
  }, [workspaceBundle]);

  const latestProviderCredential = useMemo(() => {
    return latestByCreatedAt(workspaceBundle?.providerCredentialVault ?? []);
  }, [workspaceBundle]);

  const latestProviderTokenExchange = useMemo(() => {
    return latestByCreatedAt(workspaceBundle?.providerTokenExchangeRuns ?? []);
  }, [workspaceBundle]);

  const latestBankAccount = useMemo(() => {
    return latestByCreatedAt(workspaceBundle?.bankAccounts ?? []);
  }, [workspaceBundle]);

  const latestBankTransaction = useMemo(() => {
    return [...(workspaceBundle?.bankTransactions ?? [])]
      .sort((left, right) => new Date(right.posted_at || right.transaction_date || 0).getTime() - new Date(left.posted_at || left.transaction_date || 0).getTime())[0] ?? null;
  }, [workspaceBundle]);

  const latestPaymentMatchSuggestion = useMemo(() => {
    return latestByCreatedAt(workspaceBundle?.paymentMatchSuggestions ?? []);
  }, [workspaceBundle]);

  const latestPaymentAllocation = useMemo(() => {
    return latestByCreatedAt(workspaceBundle?.paymentAllocations ?? []);
  }, [workspaceBundle]);

  const latestCustomerPaymentCredit = useMemo(() => {
    return latestByCreatedAt(workspaceBundle?.customerPaymentCredits ?? []);
  }, [workspaceBundle]);

  const collectionRiskItems = useMemo(() => {
    const outboundMessages = workspaceBundle?.outboundMessages ?? [];
    const followups = workspaceBundle?.followups ?? [];
    return (workspaceBundle?.invoices ?? [])
      .filter((invoice) => invoice.status !== "paid")
      .map((invoice) => scoreCollectionRisk({
        invoice,
        customerName: customerNameById.get(invoice.customer_id) || "No customer",
        outboundMessages,
        followups,
        playbook: customerPlaybookByCustomerId.get(invoice.customer_id) ?? null
      }))
      .sort((left, right) => right.score - left.score || Number(right.invoice.amount || 0) - Number(left.invoice.amount || 0));
  }, [customerNameById, customerPlaybookByCustomerId, workspaceBundle]);

  const trackedOpenActionByKey = useMemo(() => {
    return new Map((workspaceBundle?.collectionActions ?? [])
      .filter((action) => action.status === "open")
      .map((action) => [actionKeyFor(action.invoice_id, action.action_label), action]));
  }, [workspaceBundle]);

  const ownerAlertItems = useMemo(() => {
    return collectionRiskItems
      .filter((item) => item.action.urgency === "Now" || item.action.urgency === "Today" || item.score >= 75)
      .slice(0, 3);
  }, [collectionRiskItems]);

  const openCollectionActions = useMemo(() => {
    return (workspaceBundle?.collectionActions ?? []).filter((action) => action.status === "open");
  }, [workspaceBundle]);

  const escalationItems = useMemo(() => {
    return [...openCollectionActions]
      .sort((left, right) => {
        const leftState = actionEscalationState(left);
        const rightState = actionEscalationState(right);
        const rawLeftDue = left.due_at ? new Date(left.due_at).getTime() : Number.MAX_SAFE_INTEGER;
        const rawRightDue = right.due_at ? new Date(right.due_at).getTime() : Number.MAX_SAFE_INTEGER;
        const leftDue = Number.isNaN(rawLeftDue) ? Number.MAX_SAFE_INTEGER : rawLeftDue;
        const rightDue = Number.isNaN(rawRightDue) ? Number.MAX_SAFE_INTEGER : rawRightDue;
        return rightState.level - leftState.level
          || leftDue - rightDue
          || Number(right.risk_score ?? 0) - Number(left.risk_score ?? 0);
      })
      .slice(0, 4);
  }, [openCollectionActions]);

  const ownerDigestItems = useMemo(() => {
    const ownerMap = new Map();

    openCollectionActions.forEach((action) => {
      const ownerLabel = ownerLabelFor(action);
      const current = ownerMap.get(ownerLabel) ?? {
        ownerLabel,
        actionCount: 0,
        overdueCount: 0,
        escalatedCount: 0,
        totalRiskScore: 0,
        topAction: ""
      };

      current.actionCount += 1;
      current.totalRiskScore += Number(action.risk_score ?? 0);
      if (isActionPastDue(action)) current.overdueCount += 1;
      if (Number(action.escalation_level ?? 0) > 0) current.escalatedCount += 1;
      if (!current.topAction) current.topAction = action.action_label;
      ownerMap.set(ownerLabel, current);
    });

    return [...ownerMap.values()].sort((left, right) => (
      right.overdueCount - left.overdueCount
      || right.escalatedCount - left.escalatedCount
      || right.totalRiskScore - left.totalRiskScore
      || left.ownerLabel.localeCompare(right.ownerLabel)
    ));
  }, [openCollectionActions]);

  const latestDigestByOwner = useMemo(() => {
    const digestMap = new Map();
    (workspaceBundle?.ownerDigests ?? []).forEach((digest) => {
      if (!digestMap.has(digest.owner_label)) {
        digestMap.set(digest.owner_label, digest);
      }
    });
    return digestMap;
  }, [workspaceBundle]);

  const latestOwnerDigest = useMemo(() => {
    return latestByCreatedAt(workspaceBundle?.ownerDigests ?? []);
  }, [workspaceBundle]);

  const scheduleByOwner = useMemo(() => {
    const scheduleMap = new Map();
    (workspaceBundle?.ownerDigestSchedules ?? []).forEach((schedule) => {
      scheduleMap.set(schedule.owner_label, schedule);
    });
    return scheduleMap;
  }, [workspaceBundle]);

  const pilotChecks = useMemo(() => {
    const hasData = Boolean(workspaceBundle?.customers?.length || workspaceBundle?.deals?.length || workspaceBundle?.invoices?.length);
    const hasOpenInvoice = Boolean(workspaceBundle?.invoices?.some((invoice) => invoice.status !== "paid"));
    const hasPaidAudit = Boolean(workspaceBundle?.auditLogs?.some((event) => event.action === "invoice.marked_paid"));
    const hasAccountingBridge = Boolean(workspaceBundle?.accountingConnections?.length);
    const hasProviderOAuth = Boolean(workspaceBundle?.providerOAuthRequests?.length);
    const hasProviderOAuthCallback = Boolean(workspaceBundle?.providerOAuthCallbackEvents?.length);
    const hasProviderCredentialVault = Boolean(workspaceBundle?.providerCredentialVault?.length);
    const hasProviderTokenExchange = Boolean(workspaceBundle?.providerTokenExchangeRuns?.length);
    const hasBankMatch = Boolean(workspaceBundle?.bankAccounts?.length && workspaceBundle?.bankTransactions?.length && workspaceBundle?.paymentMatchSuggestions?.length);
    const hasPaymentApproval = Boolean(workspaceBundle?.paymentAllocations?.length || workspaceBundle?.auditLogs?.some((event) => event.action === "payment_match.approved"));
    const hasPartialPayment = Boolean(workspaceBundle?.invoices?.some((invoice) => invoice.status === "partial") || workspaceBundle?.paymentAllocations?.some((allocation) => allocation.metadata?.partial_payment));
    const hasOverpaymentCredit = Boolean(workspaceBundle?.customerPaymentCredits?.some((credit) => credit.status === "open") || workspaceBundle?.auditLogs?.some((event) => event.action === "customer_payment_credit.created"));
    const hasSplitPayment = Boolean(workspaceBundle?.paymentMatchSplitLines?.length || workspaceBundle?.paymentAllocationLines?.some((line) => line.status === "posted") || workspaceBundle?.paymentAllocations?.some((allocation) => allocation.metadata?.split_payment));
    const hasAllocationReversal = Boolean(workspaceBundle?.auditLogs?.some((event) => event.action === "payment_allocation.reversed") || workspaceBundle?.paymentAllocations?.some((allocation) => allocation.status === "reversed"));

    return [
      {
        label: "Environment",
        status: checkStatus(supabaseStatus.ready),
        detail: supabaseStatus.ready ? "Supabase URL and anon key loaded" : "Add platform/.env.local"
      },
      {
        label: "Session",
        status: checkStatus(Boolean(session)),
        detail: session?.user?.email ?? "Magic-link sign-in required"
      },
      {
        label: "Workspace",
        status: checkStatus(Boolean(workspaces.length)),
        detail: workspaces.length ? `${workspaces.length} workspace${workspaces.length === 1 ? "" : "s"} available` : "Create the first workspace"
      },
      {
        label: "Live data",
        status: checkStatus(hasData),
        detail: hasData ? `${workspaceBundle.customers.length + workspaceBundle.deals.length + workspaceBundle.invoices.length} records loaded` : "Seed a fresh workspace"
      },
      {
        label: "Audit trail",
        status: checkStatus(Boolean(workspaceBundle?.auditLogs?.length)),
        detail: workspaceBundle?.auditLogs?.length ? `${workspaceBundle.auditLogs.length} audit rows visible` : "Awaiting first audited action"
      },
      {
        label: "Payment write",
        status: checkStatus(hasOpenInvoice || hasPaidAudit),
        detail: hasPaidAudit ? "Payment audit confirmed" : hasOpenInvoice ? "Open invoice ready for Mark paid" : "Seed invoices first"
      },
      {
        label: "Accounting bridge",
        status: checkStatus(hasAccountingBridge),
        detail: hasAccountingBridge ? `${workspaceBundle.accountingConnections.length} connection${workspaceBundle.accountingConnections.length === 1 ? "" : "s"} staged` : "Seed accounting sync metadata"
      },
      {
        label: "Provider OAuth",
        status: checkStatus(hasProviderOAuth),
        detail: hasProviderOAuth ? `${workspaceBundle.providerOAuthRequests.length} request${workspaceBundle.providerOAuthRequests.length === 1 ? "" : "s"} staged without browser tokens` : "Seed provider OAuth request metadata"
      },
      {
        label: "OAuth callback",
        status: checkStatus(hasProviderOAuthCallback),
        detail: hasProviderOAuthCallback ? `${workspaceBundle.providerOAuthCallbackEvents.length} callback event${workspaceBundle.providerOAuthCallbackEvents.length === 1 ? "" : "s"} recorded without raw codes` : "Receive provider callback metadata"
      },
      {
        label: "Credential vault",
        status: checkStatus(hasProviderCredentialVault),
        detail: hasProviderCredentialVault ? `${workspaceBundle.providerCredentialVault.length} vault entr${workspaceBundle.providerCredentialVault.length === 1 ? "y" : "ies"} linked without browser tokens` : "Stage credential vault metadata"
      },
      {
        label: "Token exchange",
        status: checkStatus(hasProviderTokenExchange),
        detail: hasProviderTokenExchange ? `${workspaceBundle.providerTokenExchangeRuns.length} exchange run${workspaceBundle.providerTokenExchangeRuns.length === 1 ? "" : "s"} recorded without raw tokens` : "Run server-side provider exchange"
      },
      {
        label: "Bank match",
        status: checkStatus(hasBankMatch),
        detail: hasBankMatch ? `${workspaceBundle.paymentMatchSuggestions.length} match suggestion${workspaceBundle.paymentMatchSuggestions.length === 1 ? "" : "s"} ready for review` : "Seed bank import and matches"
      },
      {
        label: "Payment approval",
        status: checkStatus(hasPaymentApproval),
        detail: hasPaymentApproval ? "Approved allocation audit visible" : "Approve one invoice-linked match"
      },
      {
        label: "Partial payment",
        status: checkStatus(hasPartialPayment),
        detail: hasPartialPayment ? "Partial invoice state visible" : "Approve a short payment match"
      },
      {
        label: "Overpayment credit",
        status: checkStatus(hasOverpaymentCredit),
        detail: hasOverpaymentCredit ? "Customer credit ledger visible" : "Approve an overpaid invoice match"
      },
      {
        label: "Split payment",
        status: checkStatus(hasSplitPayment),
        detail: hasSplitPayment ? "Split lines visible" : "Seed or approve a multi-invoice match"
      },
      {
        label: "Allocation reversal",
        status: checkStatus(hasAllocationReversal),
        detail: hasAllocationReversal ? "Reversal audit visible" : "Reverse one posted allocation"
      }
    ];
  }, [session, supabaseStatus.ready, workspaces.length, workspaceBundle]);

  const readyPilotChecks = pilotChecks.filter((item) => item.status === "ready").length;

  const aiChecks = useMemo(() => {
    const hasInvoice = Boolean(aiInvoices.length);
    const hasDraft = Boolean(workspaceBundle?.followups?.length);
    const hasQueued = Boolean(workspaceBundle?.outboundMessages?.length);
    const hasEmailSettings = workspaceBundle?.emailSettings?.status === "active";
    const hasWhatsAppSettings = workspaceBundle?.whatsappSettings?.status === "active";
    const hasDeliveryEvents = Boolean(workspaceBundle?.deliveryEvents?.length);
    const recoverableFailures = (workspaceBundle?.outboundMessages ?? []).filter((message) => message.status === "failed" && Number(message.retry_count ?? 0) < 3).length;
    const hasRiskScores = Boolean(collectionRiskItems.length);
    const hasNextActions = Boolean(collectionRiskItems.some((item) => item.action));
    const hasTrackedActions = Boolean(workspaceBundle?.collectionActions?.length);
    const hasEscalationQueue = Boolean(escalationItems.length);
    const hasAssignedActions = Boolean((workspaceBundle?.collectionActions ?? []).some((action) => action.owner_label));
    const hasOwnerProfiles = Boolean(workspaceBundle?.ownerProfiles?.length);
    const hasOwnerDigests = Boolean(workspaceBundle?.ownerDigests?.length);
    const hasQueuedDigest = Boolean((workspaceBundle?.ownerDigests ?? []).some((digest) => ["queued", "review_pending"].includes(digest.status)));
    const hasDigestSchedule = Boolean(workspaceBundle?.ownerDigestSchedules?.length);
    const hasCustomerPlaybooks = Boolean(workspaceBundle?.customerPlaybooks?.length);
    const hasAccountingConnections = Boolean(workspaceBundle?.accountingConnections?.length);
    const hasProviderOAuthRequests = Boolean(workspaceBundle?.providerOAuthRequests?.length);
    const hasProviderOAuthCallbacks = Boolean(workspaceBundle?.providerOAuthCallbackEvents?.length);
    const hasProviderCredentialVault = Boolean(workspaceBundle?.providerCredentialVault?.length);
    const hasProviderTokenExchange = Boolean(workspaceBundle?.providerTokenExchangeRuns?.length);
    const hasAccountingReview = Boolean((workspaceBundle?.accountingSyncRuns ?? []).some((run) => run.status === "needs_review"));
    const hasBankTransactions = Boolean(workspaceBundle?.bankTransactions?.length);
    const needsBankReview = (workspaceBundle?.paymentMatchSuggestions ?? []).filter((match) => match.match_status === "needs_review").length;
    const hasPaymentMatches = Boolean(workspaceBundle?.paymentMatchSuggestions?.length);
    const postedAllocations = (workspaceBundle?.paymentAllocations ?? []).filter((allocation) => allocation.status === "posted").length;
    const hasPaymentApprovals = Boolean(postedAllocations || workspaceBundle?.paymentAllocations?.length);
    const partialInvoices = (workspaceBundle?.invoices ?? []).filter((invoice) => invoice.status === "partial").length;
    const openCredits = (workspaceBundle?.customerPaymentCredits ?? []).filter((credit) => credit.status === "open").length;
    const postedSplitLines = (workspaceBundle?.paymentAllocationLines ?? []).filter((line) => line.status === "posted").length;
    const reversedAllocations = (workspaceBundle?.paymentAllocations ?? []).filter((allocation) => allocation.status === "reversed").length;
    const pendingApprovals = (workspaceBundle?.outboundMessages ?? []).filter((message) => message.status === "queued" && messageReviewStatus(message) === "pending").length;

    return [
      {
        label: "Server boundary",
        status: "ready",
        detail: "OpenAI key stays in Supabase Edge Function"
      },
      {
        label: "Workspace context",
        status: checkStatus(Boolean(selectedWorkspaceId && workspaceBundle?.workspace)),
        detail: selectedWorkspaceId ? "Workspace selected" : "Load a workspace"
      },
      {
        label: "Invoice context",
        status: checkStatus(hasInvoice),
        detail: hasInvoice ? `${aiInvoices.length} invoice${aiInvoices.length === 1 ? "" : "s"} ready` : "Seed or create an open invoice"
      },
      {
        label: "Draft history",
        status: checkStatus(hasDraft),
        detail: hasDraft ? `${workspaceBundle.followups.length} AI draft${workspaceBundle.followups.length === 1 ? "" : "s"} saved` : "No AI drafts yet"
      },
      {
        label: "Outbound queue",
        status: checkStatus(hasQueued),
        detail: hasQueued ? `${workspaceBundle.outboundMessages.length} queued message${workspaceBundle.outboundMessages.length === 1 ? "" : "s"}` : "Approve a draft to queue it"
      },
      {
        label: "Email provider",
        status: checkStatus(hasEmailSettings),
        detail: hasEmailSettings ? "Active sender settings saved" : "Save active email settings"
      },
      {
        label: "WhatsApp provider",
        status: checkStatus(hasWhatsAppSettings),
        detail: hasWhatsAppSettings ? "Active phone settings saved" : "Save active WhatsApp settings"
      },
      {
        label: "Delivery history",
        status: checkStatus(hasDeliveryEvents),
        detail: hasDeliveryEvents ? `${workspaceBundle.deliveryEvents.length} delivery event${workspaceBundle.deliveryEvents.length === 1 ? "" : "s"}` : "Send a queued message"
      },
      {
        label: "Retry recovery",
        status: "ready",
        detail: recoverableFailures ? `${recoverableFailures} recoverable failure${recoverableFailures === 1 ? "" : "s"}` : "Protected retry runner ready"
      },
      {
        label: "Risk scoring",
        status: checkStatus(hasRiskScores),
        detail: hasRiskScores ? `${collectionRiskItems.length} invoices ranked` : "Load open invoices"
      },
      {
        label: "Customer playbooks",
        status: checkStatus(hasCustomerPlaybooks),
        detail: hasCustomerPlaybooks ? `${workspaceBundle.customerPlaybooks.length} customer rule${workspaceBundle.customerPlaybooks.length === 1 ? "" : "s"} loaded` : "Seed customer playbooks"
      },
      {
        label: "Accounting sync",
        status: checkStatus(hasAccountingConnections),
        detail: hasAccountingReview ? "Payment import needs review" : hasAccountingConnections ? "Connection metadata loaded" : "Seed accounting connection"
      },
      {
        label: "Provider OAuth",
        status: checkStatus(hasProviderOAuthRequests),
        detail: hasProviderOAuthRequests ? `${workspaceBundle.providerOAuthRequests.length} OAuth request${workspaceBundle.providerOAuthRequests.length === 1 ? "" : "s"} staged` : "Seed OAuth request metadata"
      },
      {
        label: "OAuth callback",
        status: checkStatus(hasProviderOAuthCallbacks),
        detail: hasProviderOAuthCallbacks ? `${workspaceBundle.providerOAuthCallbackEvents.length} callback event${workspaceBundle.providerOAuthCallbackEvents.length === 1 ? "" : "s"} stored as hashes/status only` : "Validate provider callback state"
      },
      {
        label: "Credential vault",
        status: checkStatus(hasProviderCredentialVault),
        detail: hasProviderCredentialVault ? `${workspaceBundle.providerCredentialVault.length} vault entr${workspaceBundle.providerCredentialVault.length === 1 ? "y" : "ies"} exposing metadata only` : "Stage provider credential references"
      },
      {
        label: "Token exchange",
        status: checkStatus(hasProviderTokenExchange),
        detail: hasProviderTokenExchange ? `${workspaceBundle.providerTokenExchangeRuns.length} exchange run${workspaceBundle.providerTokenExchangeRuns.length === 1 ? "" : "s"} with hash-only tracking` : "Deploy server-side exchange function"
      },
      {
        label: "Bank matching",
        status: checkStatus(hasBankTransactions && hasPaymentMatches),
        detail: needsBankReview ? `${needsBankReview} match suggestion${needsBankReview === 1 ? "" : "s"} need review` : hasPaymentMatches ? "Suggested payment matches ready" : "Seed bank transactions"
      },
      {
        label: "Payment approval",
        status: checkStatus(hasPaymentApprovals),
        detail: postedAllocations ? `${postedAllocations} allocation${postedAllocations === 1 ? "" : "s"} posted` : hasPaymentApprovals ? "Approval history visible" : "Approve a bank match suggestion"
      },
      {
        label: "Partial payment",
        status: checkStatus(partialInvoices > 0),
        detail: partialInvoices ? `${partialInvoices} invoice${partialInvoices === 1 ? "" : "s"} partially paid` : "Approve the seeded short payment"
      },
      {
        label: "Customer credits",
        status: checkStatus(openCredits > 0),
        detail: openCredits ? `${openCredits} open credit${openCredits === 1 ? "" : "s"} ready` : "Approve the overpayment match"
      },
      {
        label: "Split payments",
        status: checkStatus(postedSplitLines > 0),
        detail: postedSplitLines ? `${postedSplitLines} split line${postedSplitLines === 1 ? "" : "s"} posted` : "Approve the seeded split match"
      },
      {
        label: "Allocation reversal",
        status: checkStatus(reversedAllocations > 0),
        detail: reversedAllocations ? `${reversedAllocations} reversal${reversedAllocations === 1 ? "" : "s"} audited` : "Reverse a posted allocation if needed"
      },
      {
        label: "Next action",
        status: checkStatus(hasNextActions),
        detail: hasNextActions ? `${collectionRiskItems.length} recommendations ready` : "Awaiting risk scores"
      },
      {
        label: "Action tracking",
        status: checkStatus(hasTrackedActions),
        detail: hasTrackedActions ? `${workspaceBundle.collectionActions?.length ?? 0} tracked action${workspaceBundle.collectionActions?.length === 1 ? "" : "s"}` : "Track the first action"
      },
      {
        label: "Escalation cockpit",
        status: checkStatus(hasEscalationQueue),
        detail: hasEscalationQueue ? `${escalationItems.length} open action${escalationItems.length === 1 ? "" : "s"} monitored` : "Track an open action"
      },
      {
        label: "Team assignment",
        status: checkStatus(hasAssignedActions),
        detail: hasAssignedActions ? "Owner labels attached to actions" : "Assign an owner label"
      },
      {
        label: "Owner directory",
        status: checkStatus(hasOwnerProfiles),
        detail: hasOwnerProfiles ? `${workspaceBundle.ownerProfiles.length} owner profile${workspaceBundle.ownerProfiles.length === 1 ? "" : "s"} available` : "Seed owner profiles"
      },
      {
        label: "Owner digest",
        status: checkStatus(hasOwnerDigests),
        detail: hasOwnerDigests ? `${workspaceBundle.ownerDigests.length} digest draft${workspaceBundle.ownerDigests.length === 1 ? "" : "s"} saved` : "Create an owner digest"
      },
      {
        label: "Digest queue",
        status: checkStatus(hasQueuedDigest),
        detail: hasQueuedDigest ? "Owner digest approved into outbound review" : "Queue a digest for review"
      },
      {
        label: "Digest schedule",
        status: checkStatus(hasDigestSchedule),
        detail: hasDigestSchedule ? `${workspaceBundle.ownerDigestSchedules.length} schedule${workspaceBundle.ownerDigestSchedules.length === 1 ? "" : "s"} saved` : "Save a digest schedule"
      },
      {
        label: "Approval states",
        status: checkStatus(Boolean(workspaceBundle?.outboundMessages?.some((message) => messageReviewStatus(message) !== "pending")) || pendingApprovals > 0),
        detail: pendingApprovals ? `${pendingApprovals} pending approval${pendingApprovals === 1 ? "" : "s"}` : "Review status visible"
      }
    ];
  }, [aiInvoices.length, collectionRiskItems, escalationItems.length, selectedWorkspaceId, workspaceBundle]);

  const readyAiChecks = aiChecks.filter((item) => item.status === "ready").length;

  useEffect(() => {
    let mounted = true;

    async function bootSession() {
      const currentSession = await getSession();
      if (!mounted) return;
      setSession(currentSession);
      if (currentSession) {
        await loadWorkspaces();
      }
    }

    bootSession();
    const unsubscribe = subscribeToAuthChanges(async (nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        setAuthMessage(`Signed in as ${nextSession.user.email}`);
        await loadWorkspaces();
      } else {
        setWorkspaces([]);
        setSelectedWorkspaceId("");
        setWorkspaceBundle(null);
        setAuthMessage(supabaseStatus.ready ? "Signed out." : "Add Supabase credentials to enable live magic-link login.");
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [supabaseStatus.ready]);

  useEffect(() => {
    if (session && selectedWorkspaceId) {
      loadSelectedWorkspace(selectedWorkspaceId);
      return;
    }

    setWorkspaceBundle(null);
  }, [session, selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedAiCustomerPlaybook) return;
    const preferredChannel = selectedAiCustomerPlaybook.preferred_channel === "phone" ? "manual" : selectedAiCustomerPlaybook.preferred_channel;
    if (["email", "whatsapp", "manual"].includes(preferredChannel)) {
      setQueueChannel(preferredChannel);
    }
    if (["friendly", "firm", "urgent"].includes(selectedAiCustomerPlaybook.reminder_tone)) {
      setFollowupTone(selectedAiCustomerPlaybook.reminder_tone);
    }
  }, [selectedAiCustomerPlaybook]);

  useEffect(() => {
    if (queueChannel === "email") {
      setQueueRecipient(selectedAiCustomer?.email ?? "");
      return;
    }

    if (queueChannel === "whatsapp") {
      setQueueRecipient(selectedAiCustomer?.phone ?? "");
      return;
    }

    setQueueRecipient(selectedAiCustomer?.contact ?? "");
  }, [queueChannel, selectedAiCustomer]);

  useEffect(() => {
    if (!workspaceBundle?.emailSettings) {
      setEmailStatus("draft");
      return;
    }

    setEmailFromName(workspaceBundle.emailSettings.from_name ?? "");
    setEmailFromEmail(workspaceBundle.emailSettings.from_email ?? "");
    setEmailReplyTo(workspaceBundle.emailSettings.reply_to ?? "");
    setEmailStatus(workspaceBundle.emailSettings.status ?? "draft");
    setEmailSettingsMessage(`Email settings are ${workspaceBundle.emailSettings.status}.`);
  }, [workspaceBundle?.emailSettings]);

  useEffect(() => {
    if (!workspaceBundle?.whatsappSettings) {
      setWhatsappStatus("draft");
      return;
    }

    setWhatsappBusinessLabel(workspaceBundle.whatsappSettings.business_label ?? "");
    setWhatsappPhoneNumberId(workspaceBundle.whatsappSettings.phone_number_id ?? "");
    setWhatsappDisplayPhone(workspaceBundle.whatsappSettings.display_phone ?? "");
    setWhatsappStatus(workspaceBundle.whatsappSettings.status ?? "draft");
    setWhatsappSettingsMessage(`WhatsApp settings are ${workspaceBundle.whatsappSettings.status}.`);
  }, [workspaceBundle?.whatsappSettings]);

  async function loadWorkspaces() {
    if (!supabaseStatus.ready) return [];
    try {
      const rows = await listWorkspaces();
      setWorkspaces(rows);
      setWorkspaceMessage(rows.length ? `${rows.length} workspace${rows.length === 1 ? "" : "s"} available.` : "No workspace yet. Create one below.");
      setSelectedWorkspaceId((current) => {
        if (current && rows.some((item) => item.workspace.id === current)) return current;
        return rows[0]?.workspace.id ?? "";
      });
      return rows;
    } catch (error) {
      setWorkspaceMessage(error.message);
      return [];
    }
  }

  async function loadSelectedWorkspace(workspaceId) {
    if (!workspaceId) return;
    setIsLoadingBundle(true);
    try {
      const bundle = await fetchWorkspaceBundle(workspaceId);
      setWorkspaceBundle(bundle);
      const dataCount = bundle.customers.length + bundle.deals.length + bundle.invoices.length;
      setBundleMessage(dataCount ? `Loaded ${dataCount} live records from Supabase.` : "Workspace loaded. Seed demo data to test the first migration path.");
      setSelectedAiInvoiceId((current) => {
        if (current && bundle.invoices.some((invoice) => invoice.id === current && invoice.status !== "paid")) return current;
        return bundle.invoices.find((invoice) => invoice.status !== "paid")?.id ?? "";
      });
    } catch (error) {
      setBundleMessage(error.message);
    } finally {
      setIsLoadingBundle(false);
    }
  }

  async function handleMagicLink(event) {
    event.preventDefault();
    if (!email.trim()) {
      setAuthMessage("Enter an email address first.");
      return;
    }

    setIsSending(true);
    const result = await sendMagicLink(email.trim());
    setAuthMessage(result.message);
    setIsSending(false);
  }

  async function handleCreateWorkspace(event) {
    event.preventDefault();
    if (!workspaceName.trim()) {
      setWorkspaceMessage("Workspace name is required.");
      return;
    }

    setIsCreatingWorkspace(true);
    const result = await createWorkspace(workspaceName.trim(), workspaceLocation.trim());
    setWorkspaceMessage(result.message);
    if (result.ok) {
      await loadWorkspaces();
      setSelectedWorkspaceId(result.workspace.id);
    }
    setIsCreatingWorkspace(false);
  }

  async function handleSeedDemoData() {
    if (!selectedWorkspaceId) {
      setBundleMessage("Choose a workspace before seeding demo data.");
      return;
    }

    setIsSeeding(true);
    try {
      const result = await seedDemoWorkspace(selectedWorkspaceId);
      setBundleMessage(result.message);
      if (result.ok) {
        setPilotMessage(result.method === "database_rpc" ? "Transactional database seed completed." : "Browser fallback seed completed.");
        await loadSelectedWorkspace(selectedWorkspaceId);
      } else {
        setPilotMessage(result.message);
      }
    } catch (error) {
      setBundleMessage(error.message);
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleMarkInvoicePaid(invoiceId) {
    if (!selectedWorkspaceId) return;
    setMarkingInvoiceId(invoiceId);
    try {
      const result = await markInvoicePaid(selectedWorkspaceId, invoiceId);
      setBundleMessage(result.message);
      setPilotMessage(result.ok ? "Payment write and audit log completed." : result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setBundleMessage(error.message);
    } finally {
      setMarkingInvoiceId("");
    }
  }

  async function handleApprovePaymentMatch(matchSuggestionId) {
    if (!selectedWorkspaceId) return;
    setApprovingPaymentMatchId(matchSuggestionId);
    try {
      const result = await approvePaymentMatch(selectedWorkspaceId, matchSuggestionId, "Approved from Collectra payment match review.");
      setPaymentMatchMessage(result.message);
      setBundleMessage(result.message);
      setPilotMessage(result.ok ? "Payment match approved and audited." : result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setPaymentMatchMessage(error.message);
      setBundleMessage(error.message);
    } finally {
      setApprovingPaymentMatchId("");
    }
  }

  async function handleReversePaymentAllocation(allocationId) {
    if (!selectedWorkspaceId) return;
    setReversingAllocationId(allocationId);
    try {
      const result = await reversePaymentAllocation(selectedWorkspaceId, allocationId, "Reversed from Collectra allocation review.");
      setPaymentMatchMessage(result.message);
      setBundleMessage(result.message);
      setPilotMessage(result.ok ? "Payment allocation reversed and audited." : result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setPaymentMatchMessage(error.message);
      setBundleMessage(error.message);
    } finally {
      setReversingAllocationId("");
    }
  }

  async function handleRefreshPilot() {
    setIsRefreshingPilot(true);
    try {
      const rows = await loadWorkspaces();
      const workspaceId = selectedWorkspaceId || rows[0]?.workspace.id;
      if (workspaceId) {
        setSelectedWorkspaceId(workspaceId);
        await loadSelectedWorkspace(workspaceId);
      }
      setPilotMessage(workspaceId ? "Pilot diagnostics refreshed." : "Create a workspace to complete the pilot checks.");
    } catch (error) {
      setPilotMessage(error.message);
    } finally {
      setIsRefreshingPilot(false);
    }
  }

  async function handleGenerateFollowup() {
    if (!selectedWorkspaceId || !selectedAiInvoiceId) {
      setFollowupMessage("Choose a workspace and open invoice first.");
      return;
    }

    setIsGeneratingFollowup(true);
    try {
      const result = await generateFollowupDraft({
        workspaceId: selectedWorkspaceId,
        invoiceId: selectedAiInvoiceId,
        tone: followupTone
      });
      setFollowupMessage(result.message);
      if (result.ok) {
        setLatestDraft(result.draft);
        setLatestFollowup(result.followup);
        setQueueMessage("Draft generated. Review it, then queue it for outbound follow-up.");
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setFollowupMessage(error.message);
    } finally {
      setIsGeneratingFollowup(false);
    }
  }

  async function handleQueueDraft() {
    if (!latestDraft || !latestFollowup || !selectedAiInvoice) {
      setQueueMessage("Generate a draft before queueing an outbound message.");
      return;
    }

    setIsQueueingDraft(true);
    try {
      const result = await queueOutboundMessage({
        workspaceId: selectedWorkspaceId,
        followupId: latestFollowup.id,
        invoiceId: selectedAiInvoice.id,
        customerId: selectedAiInvoice.customer_id,
        channel: queueChannel,
        recipient: queueRecipient,
        subject: latestDraft.subject,
        message: latestDraft.message
      });
      setQueueMessage(result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setQueueMessage(error.message);
    } finally {
      setIsQueueingDraft(false);
    }
  }

  async function handleSaveEmailSettings() {
    if (!selectedWorkspaceId) {
      setEmailSettingsMessage("Choose a workspace before saving email settings.");
      return;
    }

    setIsSavingEmailSettings(true);
    try {
      const result = await saveEmailSettings({
        workspaceId: selectedWorkspaceId,
        provider: "resend",
        fromName: emailFromName,
        fromEmail: emailFromEmail,
        replyTo: emailReplyTo,
        status: emailStatus
      });
      setEmailSettingsMessage(result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setEmailSettingsMessage(error.message);
    } finally {
      setIsSavingEmailSettings(false);
    }
  }

  async function handleSendQueuedEmail(outboundMessageId) {
    if (!selectedWorkspaceId || !outboundMessageId) return;

    setSendingMessageId(outboundMessageId);
    try {
      const result = await sendQueuedEmail({
        workspaceId: selectedWorkspaceId,
        outboundMessageId
      });
      setQueueMessage(result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setQueueMessage(error.message);
    } finally {
      setSendingMessageId("");
    }
  }

  async function handleSaveWhatsAppSettings() {
    if (!selectedWorkspaceId) {
      setWhatsappSettingsMessage("Choose a workspace before saving WhatsApp settings.");
      return;
    }

    setIsSavingWhatsappSettings(true);
    try {
      const result = await saveWhatsAppSettings({
        workspaceId: selectedWorkspaceId,
        provider: "whatsapp_cloud",
        businessLabel: whatsappBusinessLabel,
        phoneNumberId: whatsappPhoneNumberId,
        displayPhone: whatsappDisplayPhone,
        status: whatsappStatus
      });
      setWhatsappSettingsMessage(result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setWhatsappSettingsMessage(error.message);
    } finally {
      setIsSavingWhatsappSettings(false);
    }
  }

  async function handleSendQueuedWhatsApp(outboundMessageId) {
    if (!selectedWorkspaceId || !outboundMessageId) return;

    setSendingMessageId(outboundMessageId);
    try {
      const result = await sendQueuedWhatsApp({
        workspaceId: selectedWorkspaceId,
        outboundMessageId
      });
      setQueueMessage(result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setQueueMessage(error.message);
    } finally {
      setSendingMessageId("");
    }
  }

  async function handleApproveOutboundMessage(outboundMessageId) {
    if (!selectedWorkspaceId || !outboundMessageId) return;

    setApprovingMessageId(outboundMessageId);
    try {
      const result = await approveOutboundMessage({
        workspaceId: selectedWorkspaceId,
        outboundMessageId,
        note: "Approved from outbound review."
      });
      setQueueMessage(result.message);
      setDigestMessage(result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setQueueMessage(error.message);
    } finally {
      setApprovingMessageId("");
    }
  }

  async function handleRejectOutboundMessage(outboundMessageId) {
    if (!selectedWorkspaceId || !outboundMessageId) return;

    setRejectingMessageId(outboundMessageId);
    try {
      const result = await rejectOutboundMessage({
        workspaceId: selectedWorkspaceId,
        outboundMessageId,
        note: "Rejected from outbound review."
      });
      setQueueMessage(result.message);
      setDigestMessage(result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setQueueMessage(error.message);
    } finally {
      setRejectingMessageId("");
    }
  }

  async function handleTrackCollectionAction(item) {
    if (!selectedWorkspaceId || !item?.action) return;

    const actionKey = actionKeyFor(item.invoice.id, item.action.label);
    setTrackingActionKey(actionKey);
    try {
      const result = await trackCollectionAction({
        workspaceId: selectedWorkspaceId,
        invoiceId: item.invoice.id,
        customerId: item.invoice.customer_id,
        ownerLabel: "Finance owner",
        actionLabel: item.action.label,
        actionChannel: item.action.channel,
        actionUrgency: item.action.urgency,
        rationale: item.action.rationale,
        riskScore: item.score,
        riskBand: item.band.label,
        dueAt: dueAtForUrgency(item.action.urgency),
        metadata: {
          invoice_number: item.invoice.invoice_number,
          customer_name: item.customerName,
          reasons: item.reasons,
          customer_playbook_id: item.playbook?.id ?? null,
          playbook_name: item.playbook?.playbook_name ?? null,
          payment_behavior: item.playbook?.payment_behavior ?? null,
          preferred_channel: item.playbook?.preferred_channel ?? null,
          escalation_policy: item.playbook?.escalation_policy ?? null,
          playbook_risk_weight: item.playbook?.risk_weight ?? null
        }
      });
      setActionMessage(result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setActionMessage(error.message);
    } finally {
      setTrackingActionKey("");
    }
  }

  async function handleUpdateCollectionActionStatus(actionId, status) {
    if (!selectedWorkspaceId || !actionId) return;

    setUpdatingActionId(`${actionId}:${status}`);
    try {
      const result = await updateCollectionActionStatus({
        workspaceId: selectedWorkspaceId,
        actionId,
        status
      });
      setActionMessage(result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setActionMessage(error.message);
    } finally {
      setUpdatingActionId("");
    }
  }

  async function handleEscalateCollectionAction(action) {
    if (!selectedWorkspaceId || !action?.id) return;

    setEscalatingActionId(action.id);
    try {
      const state = actionEscalationState(action);
      const result = await escalateCollectionAction({
        workspaceId: selectedWorkspaceId,
        actionId: action.id,
        reason: state.className === "overdue"
          ? "Open action is past its due time."
          : `Owner review requested for ${action.action_label}.`
      });
      setActionMessage(result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setActionMessage(error.message);
    } finally {
      setEscalatingActionId("");
    }
  }

  async function handleAssignCollectionAction(action) {
    if (!selectedWorkspaceId || !action?.id) return;

    const ownerLabel = ownerDraftByActionId[action.id] || ownerLabelFor(action);
    setAssigningActionId(action.id);
    try {
      const result = await assignCollectionAction({
        workspaceId: selectedWorkspaceId,
        actionId: action.id,
        ownerLabel,
        note: `Assigned to ${ownerLabel} from the owner work panel.`
      });
      setActionMessage(result.message);
      if (result.ok) {
        setOwnerDraftByActionId((current) => {
          const next = { ...current };
          delete next[action.id];
          return next;
        });
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setActionMessage(error.message);
    } finally {
      setAssigningActionId("");
    }
  }

  async function handleCreateOwnerDigest(ownerLabel) {
    if (!selectedWorkspaceId || !ownerLabel) return;

    setCreatingDigestOwner(ownerLabel);
    try {
      const result = await createOwnerDigest({
        workspaceId: selectedWorkspaceId,
        ownerLabel
      });
      setDigestMessage(result.message);
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setDigestMessage(error.message);
    } finally {
      setCreatingDigestOwner("");
    }
  }

  async function handleQueueOwnerDigest(digest) {
    if (!selectedWorkspaceId || !digest?.id) return;

    setQueueingDigestId(digest.id);
    try {
      const result = await queueOwnerDigest({
        workspaceId: selectedWorkspaceId,
        digestId: digest.id,
        channel: digestQueueChannel,
        recipient: digestQueueRecipient
      });
      setDigestMessage(result.message);
      if (result.ok) {
        setDigestQueueRecipient("");
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setDigestMessage(error.message);
    } finally {
      setQueueingDigestId("");
    }
  }

  async function handleSaveOwnerDigestSchedule(ownerLabel) {
    if (!selectedWorkspaceId || !ownerLabel) return;

    setSavingDigestScheduleOwner(ownerLabel);
    try {
      const result = await saveOwnerDigestSchedule({
        workspaceId: selectedWorkspaceId,
        ownerLabel,
        cadence: digestScheduleCadence,
        channel: digestScheduleChannel,
        recipient: digestScheduleRecipient
      });
      setDigestMessage(result.message);
      if (result.ok) {
        setDigestScheduleRecipient("");
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setDigestMessage(error.message);
    } finally {
      setSavingDigestScheduleOwner("");
    }
  }

  async function handleSignOut() {
    await signOut();
    setSession(null);
    setWorkspaces([]);
    setSelectedWorkspaceId("");
    setWorkspaceBundle(null);
    setSelectedAiInvoiceId("");
    setLatestDraft(null);
    setLatestFollowup(null);
    setQueueRecipient("");
    setEmailFromEmail("");
    setEmailReplyTo("");
    setWhatsappPhoneNumberId("");
    setWhatsappDisplayPhone("");
    setEscalatingActionId("");
    setAssigningActionId("");
    setOwnerDraftByActionId({});
    setActionMessage("Track recommended actions, assign an owner, then escalate stale work.");
    setCreatingDigestOwner("");
    setDigestMessage("Owner digests summarize open cash work without sending messages.");
    setQueueingDigestId("");
    setDigestQueueChannel("manual");
    setDigestQueueRecipient("");
    setSavingDigestScheduleOwner("");
    setDigestScheduleCadence("weekly");
    setDigestScheduleChannel("manual");
    setDigestScheduleRecipient("");
    setApprovingMessageId("");
    setRejectingMessageId("");
    setApprovingPaymentMatchId("");
    setReversingAllocationId("");
    setPaymentMatchMessage("Payment matches stay review-first until finance approves allocation.");
  }

  return (
    <main className="platform-shell">
      <header className="platform-header">
        <div>
          <p className="eyebrow">Collectra Platform</p>
          <h1>Provider token exchange foundation</h1>
        </div>
        <span className="version-pill">{version} - Provider token exchange foundation</span>
      </header>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Next build track</p>
          <h2>Exchange without exposing credentials</h2>
          <p>
            Collectra now records server-side token exchange runs and vault handoffs while keeping raw authorization codes and provider tokens out of browser-readable rows.
          </p>
        </div>
        <div className={`status-card ${supabaseStatus.ready ? "ready" : "pending"}`}>
          <span>Supabase</span>
          <strong>{supabaseStatus.label}</strong>
          <small>{supabaseStatus.detail}</small>
        </div>
      </section>

      <section className="metric-grid">
        {demoMetrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </article>
        ))}
      </section>

      <section className="pilot-grid">
        <section className="panel pilot-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Pilot readiness</p>
              <h2>{readyPilotChecks} of {pilotChecks.length} checks ready</h2>
            </div>
            <button className="subtle-button" type="button" disabled={!supabaseStatus.ready || isRefreshingPilot} onClick={handleRefreshPilot}>
              {isRefreshingPilot ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="diagnostic-list">
            {pilotChecks.map((item) => (
              <article key={item.label}>
                <span className={`check-dot ${item.status}`} />
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel pilot-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Connection diagnostics</p>
              <h2>Live pilot status</h2>
            </div>
          </div>
          <div className="connection-grid">
            <span><strong>{supabaseStatus.ready ? "Configured" : "Pending"}</strong> environment</span>
            <span><strong>{session ? "Active" : "Signed out"}</strong> session</span>
            <span><strong>{selectedWorkspaceId ? "Selected" : "Waiting"}</strong> workspace</span>
            <span><strong>RPC first</strong> seed path</span>
            <span><strong>{latestAccountingConnection ? accountingProviderLabel(latestAccountingConnection.provider) : "Waiting"}</strong> accounting</span>
            <span><strong>{latestProviderOAuthRequest ? accountingProviderLabel(latestProviderOAuthRequest.provider) : "Waiting"}</strong> OAuth</span>
            <span><strong>{latestProviderOAuthCallbackEvent ? latestProviderOAuthCallbackEvent.status : "Waiting"}</strong> callback</span>
            <span><strong>{latestProviderCredential ? latestProviderCredential.status : "Waiting"}</strong> vault</span>
            <span><strong>{latestAccountingSyncRun ? latestAccountingSyncRun.status : "No run"}</strong> sync status</span>
            <span><strong>{latestBankAccount ? latestBankAccount.bank_name || latestBankAccount.account_name : "Waiting"}</strong> bank</span>
            <span><strong>{latestPaymentMatchSuggestion ? `${latestPaymentMatchSuggestion.confidence}%` : "No match"}</strong> confidence</span>
            <span><strong>{latestPaymentAllocation ? latestPaymentAllocation.status : "Waiting"}</strong> allocation</span>
            <span><strong>{latestCustomerPaymentCredit ? latestCustomerPaymentCredit.status : "Waiting"}</strong> credit</span>
            <span><strong>{workspaceBundle?.paymentMatchSplitLines?.length ? `${workspaceBundle.paymentMatchSplitLines.length} planned` : "Waiting"}</strong> split plan</span>
          </div>
          <p className="auth-message">{pilotMessage}</p>
        </section>
      </section>

      <section className="workspace-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Authentication</p>
              <h2>Magic-link login</h2>
            </div>
            {session && <button className="subtle-button" type="button" onClick={handleSignOut}>Sign out</button>}
          </div>
          <form className="auth-form" onSubmit={handleMagicLink}>
            <label>
              Work email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@company.com"
              />
            </label>
            <button type="submit" disabled={isSending || !supabaseStatus.ready}>
              {isSending ? "Sending..." : "Send magic link"}
            </button>
          </form>
          <p className="auth-message">{session ? `Signed in as ${session.user.email}` : authMessage}</p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Workspace bootstrap</p>
              <h2>Create secured workspace</h2>
            </div>
          </div>
          <form className="auth-form" onSubmit={handleCreateWorkspace}>
            <label>
              Workspace name
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Company workspace"
              />
            </label>
            <label>
              Location
              <input
                value={workspaceLocation}
                onChange={(event) => setWorkspaceLocation(event.target.value)}
                placeholder="Dubai, UAE"
              />
            </label>
            <button type="submit" disabled={isCreatingWorkspace || !session}>
              {isCreatingWorkspace ? "Creating..." : "Create workspace"}
            </button>
          </form>
          <p className="auth-message">{workspaceMessage}</p>
        </section>
      </section>

      <section className="workspace-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Workspaces</p>
              <h2>Current access</h2>
            </div>
          </div>
          <div className="workspace-list">
            {workspaces.length ? workspaces.map((item) => (
              <article key={item.workspace.id} className={selectedWorkspaceId === item.workspace.id ? "selected" : ""}>
                <div>
                  <strong>{item.workspace.name}</strong>
                  <span>{item.workspace.location || "No location"} - {item.workspace.currency || "AED"}</span>
                </div>
                <div className="workspace-actions">
                  <span className="role-pill">{item.role}</span>
                  <button className="mini-button" type="button" onClick={() => setSelectedWorkspaceId(item.workspace.id)}>
                    Load
                  </button>
                </div>
              </article>
            )) : (
              <article>
                <div>
                  <strong>No live workspace loaded</strong>
                  <span>The static demo still works while Supabase is being configured.</span>
                </div>
              </article>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Workspace flow</p>
              <h2>How the SaaS version works</h2>
            </div>
          </div>
          <div className="workflow-list">
            {demoWorkflow.map((item) => (
              <article key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="panel live-data-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Live data</p>
            <h2>Workspace bundle</h2>
          </div>
          <button className="subtle-button" type="button" disabled={!selectedWorkspaceId || isSeeding || isLoadingBundle} onClick={handleSeedDemoData}>
            {isSeeding ? "Seeding..." : "Seed demo data"}
          </button>
        </div>
        <p className="auth-message">{isLoadingBundle ? "Loading workspace data..." : bundleMessage}</p>

        {workspaceBundle?.workspace ? (
          <>
            <div className="data-summary">
              <span><strong>{workspaceBundle.customers.length}</strong> customers</span>
              <span><strong>{workspaceBundle.deals.length}</strong> deals</span>
              <span><strong>{workspaceBundle.invoices.length}</strong> invoices</span>
              <span><strong>{workspaceBundle.auditLogs.length}</strong> audit rows</span>
              <span><strong>{workspaceBundle.deliveryEvents.length}</strong> delivery events</span>
              <span><strong>{workspaceBundle.collectionActions?.length ?? 0}</strong> actions</span>
              <span><strong>{workspaceBundle.ownerDigests?.length ?? 0}</strong> digests</span>
              <span><strong>{workspaceBundle.ownerDigestSchedules?.length ?? 0}</strong> schedules</span>
              <span><strong>{workspaceBundle.ownerProfiles?.length ?? 0}</strong> owners</span>
              <span><strong>{workspaceBundle.customerPlaybooks?.length ?? 0}</strong> playbooks</span>
              <span><strong>{workspaceBundle.accountingConnections?.length ?? 0}</strong> accounting</span>
              <span><strong>{workspaceBundle.accountingSyncRuns?.length ?? 0}</strong> sync runs</span>
              <span><strong>{workspaceBundle.providerOAuthRequests?.length ?? 0}</strong> OAuth requests</span>
              <span><strong>{workspaceBundle.providerOAuthCallbackEvents?.length ?? 0}</strong> OAuth callbacks</span>
              <span><strong>{workspaceBundle.providerCredentialVault?.length ?? 0}</strong> credential vault</span>
              <span><strong>{workspaceBundle.providerTokenExchangeRuns?.length ?? 0}</strong> token exchange</span>
              <span><strong>{workspaceBundle.bankAccounts?.length ?? 0}</strong> bank accounts</span>
              <span><strong>{workspaceBundle.bankTransactions?.length ?? 0}</strong> bank txns</span>
              <span><strong>{workspaceBundle.paymentMatchSuggestions?.length ?? 0}</strong> matches</span>
              <span><strong>{workspaceBundle.paymentMatchSplitLines?.length ?? 0}</strong> split plans</span>
              <span><strong>{workspaceBundle.paymentAllocations?.length ?? 0}</strong> allocations</span>
              <span><strong>{workspaceBundle.paymentAllocationLines?.length ?? 0}</strong> split lines</span>
              <span><strong>{workspaceBundle.customerPaymentCredits?.length ?? 0}</strong> credits</span>
              <span><strong>{(workspaceBundle.outboundMessages ?? []).filter((message) => messageReviewStatus(message) === "pending").length}</strong> approvals</span>
            </div>
            <div className="bundle-grid">
              <section>
                <h3>Customers</h3>
                <div className="mini-list">
                  {workspaceBundle.customers.slice(0, 4).map((customer) => {
                    const playbook = customerPlaybookByCustomerId.get(customer.id);
                    return (
                      <article key={customer.id}>
                        <div>
                          <strong>{customer.name}</strong>
                          <span>{customer.segment || "No segment"} - {customer.contact || "No contact"}</span>
                          {playbook && <small className="playbook-mini-note">{titleizeToken(playbook.payment_behavior)} - {playbookChannelLabel(playbook)}</small>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3>Deals</h3>
                <div className="mini-list">
                  {workspaceBundle.deals.slice(0, 4).map((deal) => (
                    <article key={deal.id}>
                      <div>
                        <strong>{deal.title}</strong>
                        <span>{customerNameById.get(deal.customer_id) || "No customer"} - {deal.stage}</span>
                      </div>
                      <strong>{formatCurrency(deal.value)}</strong>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <h3>Invoices</h3>
                <div className="mini-list">
                  {workspaceBundle.invoices.slice(0, 5).map((invoice) => (
                    <article key={invoice.id}>
                      <div>
                        <strong>{invoice.invoice_number}</strong>
                        <span>{customerNameById.get(invoice.customer_id) || "No customer"} - {formatDate(invoice.due_date)}</span>
                      </div>
                      <div className="invoice-actions">
                        <strong>{formatCurrency(invoice.amount)}</strong>
                        <span className={`status-chip ${invoice.status}`}>{invoice.status}</span>
                        {invoice.status !== "paid" && (
                          <button type="button" onClick={() => handleMarkInvoicePaid(invoice.id)} disabled={markingInvoiceId === invoice.id}>
                            {markingInvoiceId === invoice.id ? "Saving..." : "Mark paid"}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <h3>Owner directory</h3>
                <div className="mini-list">
                  {(workspaceBundle.ownerProfiles ?? []).slice(0, 4).map((profile) => (
                    <article key={profile.id}>
                      <div>
                        <strong>{profile.display_name}</strong>
                        <span>{profile.label} - {profile.preferred_channel}</span>
                      </div>
                      <span className={`status-chip ${profile.status}`}>{profile.status}</span>
                    </article>
                  ))}
                  {!(workspaceBundle.ownerProfiles ?? []).length && (
                    <article>
                      <div>
                        <strong>No owner profiles</strong>
                        <span>Seed the demo data to create owner routing records.</span>
                      </div>
                    </article>
                  )}
                </div>
              </section>

              <section>
                <h3>Collection playbooks</h3>
                <div className="mini-list">
                  {(workspaceBundle.customerPlaybooks ?? []).slice(0, 4).map((playbook) => (
                    <article key={playbook.id}>
                      <div>
                        <strong>{playbook.playbook_name}</strong>
                        <span>{customerNameById.get(playbook.customer_id) || "No customer"} - {titleizeToken(playbook.payment_behavior)}</span>
                        <small className="playbook-mini-note">{playbookChannelLabel(playbook)} - {titleizeToken(playbook.escalation_policy)} - {playbook.risk_weight > 0 ? "+" : ""}{playbook.risk_weight} risk</small>
                      </div>
                      <span className={`status-chip ${playbook.status}`}>{playbook.status}</span>
                    </article>
                  ))}
                  {!(workspaceBundle.customerPlaybooks ?? []).length && (
                    <article>
                      <div>
                        <strong>No playbooks</strong>
                        <span>Seed demo data to load customer collection rules.</span>
                      </div>
                    </article>
                  )}
                </div>
              </section>

              <section>
                <h3>Accounting sync</h3>
                <div className="mini-list">
                  {(workspaceBundle.accountingConnections ?? []).slice(0, 2).map((connection) => (
                    <article key={connection.id}>
                      <div>
                        <strong>{connection.connection_name}</strong>
                        <span>{accountingProviderLabel(connection.provider)} - {titleizeToken(connection.sync_direction)}</span>
                        <small className="playbook-mini-note">
                          {connection.last_sync_at ? `Last ${formatTimestamp(connection.last_sync_at)}` : "No sync yet"}
                        </small>
                      </div>
                      <span className={`status-chip ${connection.status}`}>{connection.status}</span>
                    </article>
                  ))}
                  {(workspaceBundle.accountingSyncRuns ?? []).slice(0, 2).map((run) => (
                    <article key={run.id}>
                      <div>
                        <strong>{titleizeToken(run.run_type)} sync</strong>
                        <span>{run.summary || "Accounting sync run"}</span>
                        <small className="playbook-mini-note">
                          {run.records_matched} matched - {run.records_failed} review
                        </small>
                      </div>
                      <span className={`status-chip ${run.status}`}>{run.status}</span>
                    </article>
                  ))}
                  {(workspaceBundle.providerOAuthRequests ?? []).slice(0, 2).map((request) => (
                    <article key={request.id}>
                      <div>
                        <strong>{accountingProviderLabel(request.provider)} OAuth</strong>
                        <span>{titleizeToken(request.integration_type)} - {request.status}</span>
                        <small className="playbook-mini-note">
                          {(request.requested_scopes ?? []).length ? `${request.requested_scopes.length} scopes staged` : "No scopes staged"} - tokens stay server-side
                        </small>
                      </div>
                      <span className={`status-chip ${request.status}`}>{request.status}</span>
                    </article>
                  ))}
                  {(workspaceBundle.providerOAuthCallbackEvents ?? []).slice(0, 2).map((event) => (
                    <article key={event.id}>
                      <div>
                        <strong>{accountingProviderLabel(event.provider)} callback</strong>
                        <span>{titleizeToken(event.integration_type)} - {event.status}</span>
                        <small className="playbook-mini-note">
                          {event.authorization_code_hash ? "Authorization code hash stored" : "No code hash"} - raw codes never stored
                        </small>
                      </div>
                      <span className={`status-chip ${event.status}`}>{event.status}</span>
                    </article>
                  ))}
                  {(workspaceBundle.providerTokenExchangeRuns ?? []).slice(0, 2).map((run) => (
                    <article key={run.id}>
                      <div>
                        <strong>{accountingProviderLabel(run.provider)} token exchange</strong>
                        <span>{titleizeToken(run.exchange_mode)} - {run.status}</span>
                        <small className="playbook-mini-note">
                          {run.token_response_hash ? "Token response hash stored" : "No response hash"} - raw tokens never stored
                        </small>
                      </div>
                      <span className={`status-chip ${run.status}`}>{run.status}</span>
                    </article>
                  ))}
                  {(workspaceBundle.providerCredentialVault ?? []).slice(0, 2).map((credential) => (
                    <article key={credential.id}>
                      <div>
                        <strong>{accountingProviderLabel(credential.provider)} vault</strong>
                        <span>{titleizeToken(credential.integration_type)} - {credential.status}</span>
                        <small className="playbook-mini-note">
                          {credential.encryption_key_version || "Vault key"} - token reference only
                        </small>
                      </div>
                      <span className={`status-chip ${credential.status}`}>{credential.status}</span>
                    </article>
                  ))}
                  {!(workspaceBundle.accountingConnections ?? []).length && !(workspaceBundle.accountingSyncRuns ?? []).length && !(workspaceBundle.providerOAuthRequests ?? []).length && !(workspaceBundle.providerOAuthCallbackEvents ?? []).length && !(workspaceBundle.providerTokenExchangeRuns ?? []).length && !(workspaceBundle.providerCredentialVault ?? []).length && (
                    <article>
                      <div>
                        <strong>No accounting bridge</strong>
                        <span>Seed demo data to stage accounting sync metadata.</span>
                      </div>
                    </article>
                  )}
                </div>
              </section>

              <section>
                <h3>Bank match</h3>
                <div className="mini-list">
                  {(workspaceBundle.bankAccounts ?? []).slice(0, 1).map((account) => (
                    <article key={account.id}>
                      <div>
                        <strong>{account.account_name}</strong>
                        <span>{account.bank_name || "Bank"} - {account.account_mask || account.currency || "AED"}</span>
                        <small className="playbook-mini-note">
                          {account.last_import_at ? `Last import ${formatTimestamp(account.last_import_at)}` : "No import yet"}
                        </small>
                      </div>
                      <span className={`status-chip ${account.status}`}>{account.status}</span>
                    </article>
                  ))}
                  {(workspaceBundle.bankTransactions ?? []).slice(0, 2).map((transaction) => (
                    <article key={transaction.id}>
                      <div>
                        <strong>{transaction.counterparty || transaction.description}</strong>
                        <span>{bankAccountNameById.get(transaction.bank_account_id) || "Bank account"} - {transaction.reference || formatDate(transaction.transaction_date)}</span>
                        <small className="playbook-mini-note">{transaction.description}</small>
                      </div>
                      <div className="invoice-actions">
                        <strong>{formatCurrency(transaction.amount)}</strong>
                        <span className={`status-chip ${transaction.status}`}>{transaction.status}</span>
                      </div>
                    </article>
                  ))}
                  {(workspaceBundle.paymentMatchSuggestions ?? []).slice(0, 3).map((match) => {
                    const transaction = bankTransactionById.get(match.bank_transaction_id);
                    const invoice = invoiceById.get(match.invoice_id);
                    const splitLines = paymentMatchSplitLinesByMatchId.get(match.id) ?? [];
                    const splitCandidate = splitLines.length > 0;
                    const splitTotal = splitLines.reduce((total, line) => total + Number(line.amount || 0), 0);
                    const splitInvoiceLabels = splitLines.map((line) => invoiceNumberById.get(line.invoice_id) || "Invoice").join(", ");
                    const partialCandidate = Boolean(invoice && transaction && Number(transaction.amount || 0) < Number(invoice.amount || 0));
                    const overpaymentCandidate = Boolean(invoice && transaction && Number(transaction.amount || 0) > Number(invoice.amount || 0));
                    const creditAmount = overpaymentCandidate ? Number(transaction.amount || 0) - Number(invoice.amount || 0) : 0;
                    const canApprove = Boolean((match.invoice_id || splitCandidate) && ["suggested", "needs_review"].includes(match.match_status));
                    return (
                      <article key={match.id}>
                        <div>
                          <strong>{match.invoice_id ? invoiceNumberById.get(match.invoice_id) || "Matched invoice" : splitCandidate ? "Split payment plan" : "Unallocated cash"}</strong>
                          <span>{customerNameById.get(match.customer_id) || transaction?.counterparty || "No customer"} - {match.confidence}% confidence{partialCandidate ? " - partial" : ""}{overpaymentCandidate ? " - credit" : ""}{splitCandidate ? " - split" : ""}</span>
                          <small className="playbook-mini-note">
                            {splitCandidate
                              ? `${splitLines.length} invoices: ${splitInvoiceLabels} - ${formatCurrency(splitTotal)} planned`
                              : partialCandidate
                              ? `${formatCurrency(transaction.amount)} received against ${formatCurrency(invoice.amount)}`
                              : overpaymentCandidate
                                ? `${formatCurrency(invoice.amount)} applied, ${formatCurrency(creditAmount)} kept as customer credit`
                                : match.match_reason || "Payment match suggestion"}
                          </small>
                        </div>
                        <div className="invoice-actions">
                          <span className={`status-chip ${match.match_status}`}>{match.match_status}</span>
                          {canApprove && (
                            <button type="button" onClick={() => handleApprovePaymentMatch(match.id)} disabled={approvingPaymentMatchId === match.id}>
                              {approvingPaymentMatchId === match.id ? "Approving..." : "Approve"}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  {(workspaceBundle.paymentAllocations ?? []).slice(0, 2).map((allocation) => {
                    const allocationLines = paymentAllocationLinesByAllocationId.get(allocation.id) ?? [];
                    const splitAllocation = Boolean(allocation.metadata?.split_payment || allocationLines.length);
                    const splitLineCount = allocationLines.length || allocation.metadata?.split_line_count || 0;
                    const splitLineText = allocationLines.map((line) => invoiceNumberById.get(line.invoice_id) || "Invoice").join(", ");
                    return (
                      <article key={allocation.id}>
                        <div>
                          <strong>{splitAllocation ? "Split payment allocation" : invoiceNumberById.get(allocation.invoice_id) || "Payment allocation"}</strong>
                          <span>{customerNameById.get(allocation.customer_id) || "No customer"} - {formatCurrency(allocation.amount)}</span>
                          <small className="playbook-mini-note">
                            {allocation.status === "reversed"
                              ? allocation.reversal_note || "Allocation reversed for review"
                              : splitAllocation
                                ? `${splitLineCount} invoice${splitLineCount === 1 ? "" : "s"} allocated${splitLineText ? `: ${splitLineText}` : ""}`
                                : allocation.metadata?.partial_payment
                                  ? `${allocation.allocation_note || "Partial payment allocated"} - ${formatCurrency(allocation.metadata.remaining_after)} remaining`
                                  : allocation.allocation_note || "Approved payment match"}
                          </small>
                        </div>
                        <div className="invoice-actions">
                          <span className={`status-chip ${allocation.status}`}>{allocation.status}</span>
                          {allocation.status === "posted" && (
                            <button type="button" onClick={() => handleReversePaymentAllocation(allocation.id)} disabled={reversingAllocationId === allocation.id}>
                              {reversingAllocationId === allocation.id ? "Reversing..." : "Reverse"}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  {(workspaceBundle.paymentAllocationLines ?? []).slice(0, 2).map((line) => (
                    <article key={line.id}>
                      <div>
                        <strong>{invoiceNumberById.get(line.invoice_id) || "Split allocation line"}</strong>
                        <span>{customerNameById.get(line.customer_id) || "No customer"} - {formatCurrency(line.amount)}</span>
                        <small className="playbook-mini-note">
                          Remaining after allocation: {formatCurrency(line.remaining_after)}
                        </small>
                      </div>
                      <span className={`status-chip ${line.status}`}>{line.status}</span>
                    </article>
                  ))}
                  {(workspaceBundle.customerPaymentCredits ?? []).slice(0, 2).map((credit) => (
                    <article key={credit.id}>
                      <div>
                        <strong>{invoiceNumberById.get(credit.metadata?.invoice_id) || credit.metadata?.invoice_number || "Customer credit"}</strong>
                        <span>{customerNameById.get(credit.customer_id) || "No customer"} - {formatCurrency(credit.amount)}</span>
                        <small className="playbook-mini-note">{credit.credit_note || "Overpayment credit ready for review"}</small>
                      </div>
                      <span className={`status-chip ${credit.status}`}>{credit.status}</span>
                    </article>
                  ))}
                  {!(workspaceBundle.bankAccounts ?? []).length && !(workspaceBundle.bankTransactions ?? []).length && !(workspaceBundle.paymentMatchSuggestions ?? []).length && !(workspaceBundle.paymentAllocations ?? []).length && !(workspaceBundle.paymentAllocationLines ?? []).length && !(workspaceBundle.customerPaymentCredits ?? []).length && (
                    <article>
                      <div>
                        <strong>No bank match data</strong>
                        <span>Seed demo data to stage bank transactions and payment suggestions.</span>
                      </div>
                    </article>
                  )}
                </div>
                <p className="auth-message">{paymentMatchMessage}</p>
              </section>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <strong>No workspace bundle loaded</strong>
            <span>Sign in, create a workspace, then seed demo data to test the first database migration flow.</span>
          </div>
        )}
      </section>

      <section className="workspace-grid ai-workspace-grid">
        <section className="panel risk-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Collection risk</p>
              <h2>Invoices ranked by urgency</h2>
            </div>
            <span className="role-pill">{collectionRiskItems.length ? `${collectionRiskItems[0].score}/100 top risk` : "Waiting"}</span>
          </div>
          {ownerAlertItems.length > 0 && (
            <div className="owner-alert-list">
              {ownerAlertItems.map((item) => (
                <article key={`alert-${item.id}`}>
                  <span>{item.action.urgency}</span>
                  <strong>{item.action.label}</strong>
                  <p>{item.invoice.invoice_number} - {item.customerName} - {formatCurrency(item.invoice.amount)}</p>
                </article>
              ))}
            </div>
          )}
          <div className="risk-score-grid">
            {collectionRiskItems.length ? collectionRiskItems.slice(0, 4).map((item) => (
              <article key={item.id} className={`risk-score-card ${item.band.className}`}>
                <div className="risk-card-head">
                  <div>
                    <strong>{item.invoice.invoice_number}</strong>
                    <span>{item.customerName}</span>
                    {item.playbook && (
                      <small className="playbook-mini-note">{item.playbook.playbook_name} - {playbookChannelLabel(item.playbook)}</small>
                    )}
                  </div>
                  <span className={`risk-band ${item.band.className}`}>{item.band.label}</span>
                </div>
                <div className="risk-score-number">
                  <strong>{item.score}</strong>
                  <span>/100</span>
                </div>
                <div className="risk-meter" aria-label={`Risk score ${item.score} out of 100`}>
                  <span style={{ width: `${item.score}%` }} />
                </div>
                <ul className="risk-reasons">
                  {item.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <div className="risk-next-action">
                  <span>{formatCurrency(item.invoice.amount)}</span>
                  <strong>{item.action.label}</strong>
                </div>
              </article>
            )) : (
              <div className="empty-state">
                <strong>No open invoice risk yet</strong>
                <span>Load or seed a workspace to rank collection priorities.</span>
              </div>
            )}
          </div>
          {openCollectionActions.length > 0 && (
            <div className="escalation-cockpit">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Escalation cockpit</p>
                  <h3>Owner actions under watch</h3>
                </div>
                <span className="role-pill">{escalationItems.length} watched</span>
              </div>
              <div className="escalation-grid">
                {escalationItems.map((action) => {
                  const escalationState = actionEscalationState(action);
                  return (
                    <article key={`escalation-${action.id}`} className={`escalation-card ${escalationState.className}`}>
                      <div>
                        <span className={`status-chip ${escalationState.className}`}>{escalationState.label}</span>
                        <strong>{action.action_label}</strong>
                        <small>{invoiceNumberById.get(action.invoice_id) || action.metadata?.invoice_number || "No invoice"} - {action.action_channel}</small>
                        <span className="owner-chip">{ownerLabelFor(action)}</span>
                      </div>
                      <p>{action.escalation_reason || action.rationale || "Waiting for owner follow-up."}</p>
                      <div className="action-buttons">
                        <button type="button" disabled={escalatingActionId === action.id || escalationState.level >= 3} onClick={() => handleEscalateCollectionAction(action)}>
                          {escalatingActionId === action.id ? "Escalating..." : escalationState.level >= 3 ? "Max level" : "Escalate"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
          {ownerDigestItems.length > 0 && (
            <div className="owner-digest-desk">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Owner digest</p>
                  <h3>Draft cash briefings</h3>
                </div>
                <span className="role-pill">{ownerDigestItems.length} owner{ownerDigestItems.length === 1 ? "" : "s"}</span>
              </div>
              <div className="owner-digest-grid">
                {ownerDigestItems.map((item) => {
                  const latestDigest = latestDigestByOwner.get(item.ownerLabel);
                  const schedule = scheduleByOwner.get(item.ownerLabel);
                  const ownerProfile = ownerProfileByLabel.get(item.ownerLabel);
                  return (
                    <article key={item.ownerLabel} className="owner-digest-card">
                      <div>
                        <span className="owner-chip">{item.ownerLabel}</span>
                        <strong>{item.actionCount} open action{item.actionCount === 1 ? "" : "s"}</strong>
                        <p>{item.topAction || "No top action yet"}</p>
                      </div>
                      {ownerProfile && (
                        <small>{ownerProfile.display_name} - {ownerProfile.preferred_channel}</small>
                      )}
                      <div className="digest-stat-row">
                        <span>{item.overdueCount} overdue</span>
                        <span>{item.escalatedCount} escalated</span>
                        <span>{item.totalRiskScore} risk</span>
                      </div>
                      <small>{latestDigest ? `Latest ${latestDigest.status} ${formatTimestamp(latestDigest.created_at)}` : "No digest draft yet"}</small>
                      {schedule && <small>{schedule.cadence} - {schedule.channel} - {schedule.status}</small>}
                      <button type="button" disabled={!session || creatingDigestOwner === item.ownerLabel} onClick={() => handleCreateOwnerDigest(item.ownerLabel)}>
                        {creatingDigestOwner === item.ownerLabel ? "Creating..." : "Create digest"}
                      </button>
                    </article>
                  );
                })}
              </div>
              {latestOwnerDigest && (
                <div className="digest-preview">
                  <div>
                    <span className="owner-chip">{latestOwnerDigest.owner_label}</span>
                    <strong>{latestOwnerDigest.subject}</strong>
                    <small>{formatTimestamp(latestOwnerDigest.created_at)} - {latestOwnerDigest.status}</small>
                    {ownerProfileByLabel.get(latestOwnerDigest.owner_label) && (
                      <small>
                        {ownerProfileByLabel.get(latestOwnerDigest.owner_label).display_name} - {ownerProfileByLabel.get(latestOwnerDigest.owner_label).preferred_channel}
                      </small>
                    )}
                  </div>
                  <div>
                    {digestPreviewLines(latestOwnerDigest.body).map((line, index) => (
                      <span key={`${line}-${index}`}>{line}</span>
                    ))}
                    <div className="digest-queue-controls">
                      <select value={digestQueueChannel} onChange={(event) => setDigestQueueChannel(event.target.value)}>
                        <option value="manual">Manual</option>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                      <input
                        type="text"
                        value={digestQueueRecipient}
                        onChange={(event) => setDigestQueueRecipient(event.target.value)}
                        placeholder={`Recipient, default ${latestOwnerDigest.owner_label}`}
                      />
                      <button
                        type="button"
                        disabled={!session || latestOwnerDigest.status !== "draft" || queueingDigestId === latestOwnerDigest.id}
                        onClick={() => handleQueueOwnerDigest(latestOwnerDigest)}
                      >
                        {latestOwnerDigest.status === "review_pending" ? "Review pending" : latestOwnerDigest.status === "queued" ? "Approved" : latestOwnerDigest.status === "rejected" ? "Rejected" : queueingDigestId === latestOwnerDigest.id ? "Queueing..." : "Queue digest"}
                      </button>
                    </div>
                    <div className="digest-schedule-controls">
                      <select value={digestScheduleCadence} onChange={(event) => setDigestScheduleCadence(event.target.value)}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                      <select value={digestScheduleChannel} onChange={(event) => setDigestScheduleChannel(event.target.value)}>
                        <option value="manual">Manual</option>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                      <input
                        type="text"
                        value={digestScheduleRecipient}
                        onChange={(event) => setDigestScheduleRecipient(event.target.value)}
                        placeholder={`Schedule recipient, default ${latestOwnerDigest.owner_label}`}
                      />
                      <button
                        type="button"
                        disabled={!session || savingDigestScheduleOwner === latestOwnerDigest.owner_label}
                        onClick={() => handleSaveOwnerDigestSchedule(latestOwnerDigest.owner_label)}
                      >
                        {savingDigestScheduleOwner === latestOwnerDigest.owner_label ? "Saving..." : "Save schedule"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <p className="auth-message">{digestMessage}</p>
            </div>
          )}
          {collectionRiskItems.length > 0 && (
            <div className="action-queue">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Next-best actions</p>
                  <h3>Action queue</h3>
                </div>
              </div>
              {collectionRiskItems.slice(0, 5).map((item) => (
                (() => {
                  const actionKey = actionKeyFor(item.invoice.id, item.action.label);
                  const trackedAction = trackedOpenActionByKey.get(actionKey);
                  return (
                    <article key={`${item.id}-${item.action.label}`} className={`action-card ${item.action.className}`}>
                      <div>
                        <strong>{item.action.label}</strong>
                        <span>{item.invoice.invoice_number} - {item.customerName}</span>
                      </div>
                      <p>{item.action.rationale}</p>
                      <div className="action-meta">
                        <span>{item.action.channel}</span>
                        <span>{item.action.urgency}</span>
                        <span>{item.score}/100</span>
                        {item.playbook && <span>{titleizeToken(item.playbook.payment_behavior)}</span>}
                      </div>
                      <div className="action-buttons">
                        <button type="button" disabled={!session || Boolean(trackedAction) || trackingActionKey === actionKey} onClick={() => handleTrackCollectionAction(item)}>
                          {trackedAction ? "Tracked" : trackingActionKey === actionKey ? "Tracking..." : "Track"}
                        </button>
                      </div>
                    </article>
                  );
                })()
              ))}
              <p className="auth-message">{actionMessage}</p>
              {(workspaceBundle?.collectionActions ?? []).length > 0 && (
                <div className="tracked-actions">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Owner work</p>
                      <h3>Tracked actions</h3>
                    </div>
                  </div>
                  {(workspaceBundle?.collectionActions ?? []).slice(0, 6).map((action) => (
                    (() => {
                      const escalationState = actionEscalationState(action);
                      return (
                        <article key={action.id} className={`tracked-action ${action.status} ${escalationState.className}`}>
                          <div>
                            <strong>{action.action_label}</strong>
                            <span>{action.action_channel} - {action.action_urgency}</span>
                          </div>
                          <p>{action.escalation_reason || action.rationale || "No rationale saved"}</p>
                          <div className="action-meta">
                            <span>{action.status}</span>
                            <span>{ownerLabelFor(action)}</span>
                            <span>{escalationState.label}</span>
                            <span>{action.risk_score}/100</span>
                            {action.due_at && <span>{formatTimestamp(action.due_at)}</span>}
                          </div>
                          {action.status === "open" && (
                            <div className="action-buttons">
                              <div className="assignment-control">
                                <select
                                  value={ownerDraftByActionId[action.id] || ownerLabelFor(action)}
                                  onChange={(event) => setOwnerDraftByActionId((current) => ({ ...current, [action.id]: event.target.value }))}
                                >
                                  {ownerAssignmentOptions.map((owner) => (
                                    <option key={owner} value={owner}>{owner}</option>
                                  ))}
                                </select>
                                <button type="button" disabled={assigningActionId === action.id} onClick={() => handleAssignCollectionAction(action)}>
                                  {assigningActionId === action.id ? "Assigning..." : "Assign"}
                                </button>
                              </div>
                              <button type="button" disabled={updatingActionId === `${action.id}:completed`} onClick={() => handleUpdateCollectionActionStatus(action.id, "completed")}>
                                {updatingActionId === `${action.id}:completed` ? "Saving..." : "Complete"}
                              </button>
                              <button type="button" disabled={updatingActionId === `${action.id}:dismissed`} onClick={() => handleUpdateCollectionActionStatus(action.id, "dismissed")}>
                                {updatingActionId === `${action.id}:dismissed` ? "Saving..." : "Dismiss"}
                              </button>
                              <button type="button" disabled={escalatingActionId === action.id || escalationState.level >= 3} onClick={() => handleEscalateCollectionAction(action)}>
                                {escalatingActionId === action.id ? "Escalating..." : escalationState.level >= 3 ? "Max level" : "Escalate"}
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })()
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">AI Desk</p>
              <h2>Follow-up generator</h2>
            </div>
            <span className="role-pill">{readyAiChecks} of {aiChecks.length} ready</span>
          </div>
          <div className="ai-controls">
            <label>
              Invoice
              <select value={selectedAiInvoiceId} onChange={(event) => setSelectedAiInvoiceId(event.target.value)} disabled={!aiInvoices.length}>
                {aiInvoices.length ? aiInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>{invoiceLabel(invoice, customerNameById)}</option>
                )) : (
                  <option value="">No open invoice</option>
                )}
              </select>
            </label>
            <label>
              Tone
              <select value={followupTone} onChange={(event) => setFollowupTone(event.target.value)}>
                <option value="friendly">Friendly</option>
                <option value="firm">Firm</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <button type="button" disabled={!selectedAiInvoiceId || isGeneratingFollowup || !session} onClick={handleGenerateFollowup}>
              {isGeneratingFollowup ? "Generating..." : "Generate draft"}
            </button>
          </div>
          {selectedAiCustomerPlaybook && (
            <div className="playbook-context-card">
              <span>{selectedAiCustomerPlaybook.playbook_name}</span>
              <strong>{titleizeToken(selectedAiCustomerPlaybook.payment_behavior)} via {playbookChannelLabel(selectedAiCustomerPlaybook)}</strong>
              <small>{titleizeToken(selectedAiCustomerPlaybook.escalation_policy)} escalation - {selectedAiCustomerPlaybook.risk_weight > 0 ? "+" : ""}{selectedAiCustomerPlaybook.risk_weight} risk - {selectedAiCustomerPlaybook.days_before_due} days before due</small>
            </div>
          )}
          <div className="diagnostic-list compact">
            {aiChecks.map((item) => (
              <article key={item.label}>
                <span className={`check-dot ${item.status}`} />
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </div>
              </article>
            ))}
          </div>
          <p className="auth-message">{followupMessage}</p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Draft preview</p>
              <h2>Human approval queue</h2>
            </div>
          </div>
          {latestDraft ? (
            <article className="draft-preview">
              <span>{latestDraft.subject}</span>
              <p>{latestDraft.message}</p>
              <strong>{latestDraft.next_action}</strong>
              <small>{latestDraft.risk_note}</small>
            </article>
          ) : (
            <div className="empty-state">
              <strong>No AI draft loaded</strong>
              <span>Generate a follow-up from an open invoice after the Edge Function is deployed.</span>
            </div>
          )}
          <div className="queue-controls">
            <label>
              Channel
              <select value={queueChannel} onChange={(event) => setQueueChannel(event.target.value)}>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <label>
              Recipient
              <input
                value={queueRecipient}
                onChange={(event) => setQueueRecipient(event.target.value)}
                placeholder="Customer contact"
              />
            </label>
            <button type="button" disabled={!latestDraft || !latestFollowup || isQueueingDraft || !session} onClick={handleQueueDraft}>
              {isQueueingDraft ? "Queueing..." : "Queue approved draft"}
            </button>
          </div>
          <p className="auth-message">{queueMessage}</p>
          <div className="followup-list">
            {(workspaceBundle?.followups ?? []).slice(0, 3).map((followup) => (
              <article key={followup.id}>
                <div>
                  <strong>{followup.tone}</strong>
                  <span>{followup.metadata?.subject || "Saved AI follow-up"}</span>
                </div>
                <p>{followup.message}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="workspace-grid provider-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Email provider</p>
              <h2>Sender settings</h2>
            </div>
            <span className="role-pill">{emailStatus}</span>
          </div>
          <div className="email-settings-grid">
            <label>
              From name
              <input
                value={emailFromName}
                onChange={(event) => setEmailFromName(event.target.value)}
                placeholder="Collectra Finance"
              />
            </label>
            <label>
              From email
              <input
                type="email"
                value={emailFromEmail}
                onChange={(event) => setEmailFromEmail(event.target.value)}
                placeholder="finance@company.com"
              />
            </label>
            <label>
              Reply-to
              <input
                type="email"
                value={emailReplyTo}
                onChange={(event) => setEmailReplyTo(event.target.value)}
                placeholder="owner@company.com"
              />
            </label>
            <label>
              Status
              <select value={emailStatus} onChange={(event) => setEmailStatus(event.target.value)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
            <button type="button" disabled={!selectedWorkspaceId || !emailFromEmail || isSavingEmailSettings || !session} onClick={handleSaveEmailSettings}>
              {isSavingEmailSettings ? "Saving..." : "Save email settings"}
            </button>
          </div>
          <p className="auth-message">{emailSettingsMessage}</p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">WhatsApp provider</p>
              <h2>Business phone settings</h2>
            </div>
            <span className="role-pill">{whatsappStatus}</span>
          </div>
          <div className="email-settings-grid">
            <label>
              Business label
              <input
                value={whatsappBusinessLabel}
                onChange={(event) => setWhatsappBusinessLabel(event.target.value)}
                placeholder="Collectra Finance"
              />
            </label>
            <label>
              Phone number ID
              <input
                value={whatsappPhoneNumberId}
                onChange={(event) => setWhatsappPhoneNumberId(event.target.value)}
                placeholder="Meta phone number ID"
              />
            </label>
            <label>
              Display phone
              <input
                value={whatsappDisplayPhone}
                onChange={(event) => setWhatsappDisplayPhone(event.target.value)}
                placeholder="+971 50 000 1204"
              />
            </label>
            <label>
              Status
              <select value={whatsappStatus} onChange={(event) => setWhatsappStatus(event.target.value)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
            <button type="button" disabled={!selectedWorkspaceId || !whatsappPhoneNumberId || isSavingWhatsappSettings || !session} onClick={handleSaveWhatsAppSettings}>
              {isSavingWhatsappSettings ? "Saving..." : "Save WhatsApp settings"}
            </button>
          </div>
          <p className="auth-message">{whatsappSettingsMessage}</p>
        </section>
      </section>

      <section className="panel outbound-review-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Outbound review</p>
            <h2>Queued messages</h2>
          </div>
        </div>
        <div className="outbound-list review-list">
          {(workspaceBundle?.outboundMessages ?? []).length ? (workspaceBundle?.outboundMessages ?? []).slice(0, 8).map((message) => {
            const reviewStatus = messageReviewStatus(message);
            const canApprove = message.status === "queued" && reviewStatus === "pending";
            const canReject = message.status === "queued" && reviewStatus !== "rejected";
            const canSend = message.status === "queued" && reviewStatus === "approved";
            return (
              <article key={message.id} className={`review-${reviewStatus}`}>
                <div>
                  <strong>{message.channel}</strong>
                  <span>{message.subject || "Outbound follow-up"} - {message.status}</span>
                </div>
                <div className="delivery-row">
                  <span className={`status-chip ${reviewStatus}`}>{reviewStatus}</span>
                  <span className={`status-chip ${message.delivery_status || "not_sent"}`}>{message.delivery_status || "not_sent"}</span>
                  <small>{message.review_note || message.delivery_detail || "Waiting for review before provider delivery"}</small>
                </div>
                <p>{message.recipient || "No recipient saved"}</p>
                <div className="action-buttons review-actions">
                  {canApprove && (
                    <button type="button" disabled={approvingMessageId === message.id || !session} onClick={() => handleApproveOutboundMessage(message.id)}>
                      {approvingMessageId === message.id ? "Approving..." : "Approve"}
                    </button>
                  )}
                  {canReject && (
                    <button type="button" disabled={rejectingMessageId === message.id || !session} onClick={() => handleRejectOutboundMessage(message.id)}>
                      {rejectingMessageId === message.id ? "Rejecting..." : "Reject"}
                    </button>
                  )}
                  {message.channel === "email" && canSend && (
                    <button type="button" disabled={sendingMessageId === message.id || !session} onClick={() => handleSendQueuedEmail(message.id)}>
                      {sendingMessageId === message.id ? "Sending..." : "Send email"}
                    </button>
                  )}
                  {message.channel === "whatsapp" && canSend && (
                    <button type="button" disabled={sendingMessageId === message.id || !session} onClick={() => handleSendQueuedWhatsApp(message.id)}>
                      {sendingMessageId === message.id ? "Sending..." : "Send WhatsApp"}
                    </button>
                  )}
                </div>
              </article>
            );
          }) : (
            <div className="empty-state">
              <strong>No queued messages</strong>
              <span>Approve an AI draft to create the first outbound work item.</span>
            </div>
          )}
        </div>
      </section>

      <section className="panel delivery-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Delivery status</p>
            <h2>Provider event history</h2>
          </div>
        </div>
        <div className="delivery-event-list">
          {(workspaceBundle?.deliveryEvents ?? []).length ? (workspaceBundle?.deliveryEvents ?? []).slice(0, 8).map((event) => (
            <article key={event.id}>
              <div>
                <strong>{event.delivery_status}</strong>
                <span>{event.provider} - {event.event_type}</span>
              </div>
              <p>{event.summary || "Provider event recorded"}</p>
              <small>{formatTimestamp(event.occurred_at)}{event.provider_message_id ? ` - ${event.provider_message_id}` : ""}</small>
            </article>
          )) : (
            <div className="empty-state">
              <strong>No provider events yet</strong>
              <span>Send a queued email or WhatsApp message to create the first delivery event.</span>
            </div>
          )}
        </div>
      </section>

      <section className="workspace-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Data preview</p>
              <h2>Secured customer records</h2>
            </div>
          </div>
          <div className="customer-list">
            {demoCustomers.map((customer) => (
              <article key={customer.id}>
                <div>
                  <strong>{customer.name}</strong>
                  <span>{customer.segment} - {customer.contact}</span>
                </div>
                <strong>{customer.balance}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Database</p>
              <h2>Schema checklist</h2>
            </div>
          </div>
          <div className="check-grid">
            {schemaChecklist.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Audit trail</p>
            <h2>Finance actions become traceable</h2>
          </div>
        </div>
        <div className="audit-list">
          {auditEvents.map((event) => (
            <article key={`${event.action}-${event.summary}`}>
              <span>{event.action}</span>
              <strong>{event.actor}</strong>
              <p>{event.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Build plan</p>
            <h2>Platform roadmap</h2>
          </div>
        </div>
        <div className="roadmap">
          {roadmap.map((item) => (
            <article key={item.title}>
              <span>{item.status}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
