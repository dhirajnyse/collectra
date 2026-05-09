import { useEffect, useMemo, useState } from "react";
import { demoMetrics, roadmap, version } from "./lib/demoData.js";
import { demoAuditEvents, demoCustomers, demoWorkflow, schemaChecklist } from "./lib/platformData.js";
import { getSupabaseStatus } from "./lib/supabaseClient.js";
import {
  createWorkspace,
  fetchWorkspaceBundle,
  getSession,
  listWorkspaces,
  markInvoicePaid,
  seedDemoWorkspace,
  sendMagicLink,
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
        await loadSelectedWorkspace(selectedWorkspaceId);
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
      if (result.ok) {
        await loadSelectedWorkspace(selectedWorkspaceId);
      }
    } catch (error) {
      setBundleMessage(error.message);
    } finally {
      setMarkingInvoiceId("");
    }
  }

  async function handleSignOut() {
    await signOut();
    setSession(null);
    setWorkspaces([]);
    setSelectedWorkspaceId("");
    setWorkspaceBundle(null);
  }

  return (
    <main className="platform-shell">
      <header className="platform-header">
        <div>
          <p className="eyebrow">Collectra Platform</p>
          <h1>Data migration foundation</h1>
        </div>
        <span className="version-pill">{version} - Data migration foundation</span>
      </header>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Next build track</p>
          <h2>Seed, load, and audit real workspace records</h2>
          <p>
            The platform can now create a secured workspace, seed the first customer/deal/invoice bundle into Supabase, load live records back into the UI, and audit finance actions.
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
