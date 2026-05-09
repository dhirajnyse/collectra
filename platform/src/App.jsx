import { useEffect, useMemo, useState } from "react";
import { demoMetrics, roadmap, version } from "./lib/demoData.js";
import { demoAuditEvents, demoCustomers, demoWorkflow, schemaChecklist } from "./lib/platformData.js";
import { getSupabaseStatus } from "./lib/supabaseClient.js";
import {
  createWorkspace,
  fetchWorkspaceBundle,
  generateFollowupDraft,
  getSession,
  listWorkspaces,
  markInvoicePaid,
  queueOutboundMessage,
  saveEmailSettings,
  seedDemoWorkspace,
  sendMagicLink,
  sendQueuedEmail,
  signOut,
  subscribeToAuthChanges
} from "./lib/collectraService.js";

function formatCurrency(value) {
  return `AED ${Number(value || 0).toLocaleString("en-US")}`;
}

function formatDate(value) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function checkStatus(isReady) {
  return isReady ? "ready" : "pending";
}

function invoiceLabel(invoice, customerNameById) {
  if (!invoice) return "No invoice";
  const customerName = customerNameById.get(invoice.customer_id) || "No customer";
  return `${invoice.invoice_number} - ${customerName} - ${formatCurrency(invoice.amount)}`;
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
  const [sendingMessageId, setSendingMessageId] = useState("");

  const customerNameById = useMemo(() => {
    return new Map((workspaceBundle?.customers ?? []).map((customer) => [customer.id, customer.name]));
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

  const pilotChecks = useMemo(() => {
    const hasData = Boolean(workspaceBundle?.customers?.length || workspaceBundle?.deals?.length || workspaceBundle?.invoices?.length);
    const hasOpenInvoice = Boolean(workspaceBundle?.invoices?.some((invoice) => invoice.status !== "paid"));
    const hasPaidAudit = Boolean(workspaceBundle?.auditLogs?.some((event) => event.action === "invoice.marked_paid"));

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
      }
    ];
  }, [session, supabaseStatus.ready, workspaces.length, workspaceBundle]);

  const readyPilotChecks = pilotChecks.filter((item) => item.status === "ready").length;

  const aiChecks = useMemo(() => {
    const hasInvoice = Boolean(aiInvoices.length);
    const hasDraft = Boolean(workspaceBundle?.followups?.length);
    const hasQueued = Boolean(workspaceBundle?.outboundMessages?.length);
    const hasEmailSettings = workspaceBundle?.emailSettings?.status === "active";

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
      }
    ];
  }, [aiInvoices.length, selectedWorkspaceId, workspaceBundle]);

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
  }

  return (
    <main className="platform-shell">
      <header className="platform-header">
        <div>
          <p className="eyebrow">Collectra Platform</p>
          <h1>Email provider foundation</h1>
        </div>
        <span className="version-pill">{version} - Email provider foundation</span>
      </header>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Next build track</p>
          <h2>Send approved queued emails through a server boundary</h2>
          <p>
            Collectra now has workspace sender settings and a server-side email send function, so approved queued emails can move through a provider without exposing secrets in the browser.
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
            </div>
            <div className="bundle-grid">
              <section>
                <h3>Customers</h3>
                <div className="mini-list">
                  {workspaceBundle.customers.slice(0, 4).map((customer) => (
                    <article key={customer.id}>
                      <div>
                        <strong>{customer.name}</strong>
                        <span>{customer.segment || "No segment"} - {customer.contact || "No contact"}</span>
                      </div>
                    </article>
                  ))}
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
              <p className="eyebrow">Outbound review</p>
              <h2>Queued messages</h2>
            </div>
          </div>
          <div className="outbound-list review-list">
            {(workspaceBundle?.outboundMessages ?? []).length ? (workspaceBundle?.outboundMessages ?? []).slice(0, 6).map((message) => (
              <article key={message.id}>
                <div>
                  <strong>{message.channel}</strong>
                  <span>{message.subject || "Outbound follow-up"} - {message.status}</span>
                </div>
                <p>{message.recipient || "No recipient saved"}</p>
                {message.channel === "email" && message.status === "queued" && (
                  <button type="button" disabled={sendingMessageId === message.id || !session} onClick={() => handleSendQueuedEmail(message.id)}>
                    {sendingMessageId === message.id ? "Sending..." : "Send email"}
                  </button>
                )}
              </article>
            )) : (
              <div className="empty-state">
                <strong>No queued messages</strong>
                <span>Approve an AI draft to create the first outbound work item.</span>
              </div>
            )}
          </div>
        </section>
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
