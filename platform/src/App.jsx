import { useState } from "react";
import { demoMetrics, roadmap, version } from "./lib/demoData.js";
import { demoAuditEvents, demoCustomers, demoWorkflow, schemaChecklist } from "./lib/platformData.js";
import { getSupabaseStatus } from "./lib/supabaseClient.js";
import { sendMagicLink } from "./lib/collectraService.js";

export default function App() {
  const supabaseStatus = getSupabaseStatus();
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("Add Supabase credentials to enable live magic-link login.");
  const [isSending, setIsSending] = useState(false);

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

  return (
    <main className="platform-shell">
      <header className="platform-header">
        <div>
          <p className="eyebrow">Collectra Platform</p>
          <h1>Auth-ready SaaS foundation</h1>
        </div>
        <span className="version-pill">{version} - Audit foundation</span>
      </header>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Next build track</p>
          <h2>React, Supabase, workspaces, and secured money data</h2>
          <p>
            This platform layer is where Collectra becomes a real multi-user product. The public static demo stays live while auth, database persistence, and AI workflows come online here.
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
            <button type="submit" disabled={isSending}>
              {isSending ? "Sending..." : "Send magic link"}
            </button>
          </form>
          <p className="auth-message">{authMessage}</p>
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
          {demoAuditEvents.map((event) => (
            <article key={event.action}>
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
