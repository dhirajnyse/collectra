(() => {
  const { cloneInitialState, stages, titleMap, appVersion } = window.CollectraData;
  const storage = window.CollectraStorage;
  const pdf = window.CollectraPdf;
  const defaultOwnerLabels = ["Finance owner", "Sales owner", "Ops owner", "Dhiraj"];

  let state = storage.load(cloneInitialState());
  let invoiceFilter = "all";

  function money(value) {
    const code = state.meta.currency || "AED";
    try {
      return new Intl.NumberFormat("en-AE", {
        style: "currency",
        currency: code,
        maximumFractionDigits: 0
      }).format(value).replace(code, `${code} `);
    } catch (error) {
      return `AED ${Number(value || 0).toLocaleString("en-AE", { maximumFractionDigits: 0 })}`;
    }
  }

  function todayDate() {
    return new Date(`${state.meta.today}T12:00:00+04:00`);
  }

  function daysUntil(dateString) {
    const due = new Date(`${dateString}T12:00:00+04:00`);
    return Math.round((due - todayDate()) / 86400000);
  }

  function customerById(id) {
    return state.customers.find((customer) => customer.id === id) || {
      name: "Unknown customer",
      contact: "Team",
      email: "",
      phone: "",
      terms: "Due on receipt"
    };
  }

  function field(id) {
    return document.getElementById(id);
  }

  function setField(id, value) {
    field(id).value = value ?? "";
  }

  function makeId(prefix) {
    return `${prefix}_${Date.now()}`;
  }

  function nextInvoiceId() {
    const maxNumber = state.invoices.reduce((max, invoice) => {
      const number = Number(String(invoice.id).replace(/\D/g, ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 1061);
    return `INV-${maxNumber + 1}`;
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function safeArray(value, maxItems, name) {
    if (!Array.isArray(value)) return [];
    if (value.length > maxItems) {
      throw new Error(`${name} has too many records`);
    }
    return value.filter(isPlainObject);
  }

  function validateWorkspacePayload(input) {
    if (!isPlainObject(input)) {
      throw new Error("Workspace import must be a JSON object");
    }
    safeArray(input.customers, 5000, "customers");
    safeArray(input.deals, 5000, "deals");
    safeArray(input.invoices, 5000, "invoices");
    safeArray(input.collectionActions, 5000, "collection actions");
    safeArray(input.ownerDigests, 5000, "owner digests");
    safeArray(input.ownerDigestSchedules, 5000, "owner digest schedules");
    safeArray(input.ownerProfiles, 5000, "owner profiles");
    safeArray(input.customerPlaybooks, 5000, "customer playbooks");
    safeArray(input.accountingConnections, 5000, "accounting connections");
    safeArray(input.accountingSyncRuns, 5000, "accounting sync runs");
    safeArray(input.providerOAuthRequests, 5000, "provider OAuth requests");
    safeArray(input.providerOAuthCallbackEvents, 5000, "provider OAuth callback events");
    safeArray(input.providerCredentialVault, 5000, "provider credential vault");
    safeArray(input.providerTokenExchangeRuns, 5000, "provider token exchange runs");
    safeArray(input.bankAccounts, 5000, "bank accounts");
    safeArray(input.bankTransactions, 5000, "bank transactions");
    safeArray(input.paymentMatchSuggestions, 5000, "payment match suggestions");
    safeArray(input.paymentMatchSplitLines, 5000, "payment match split lines");
    safeArray(input.paymentAllocations, 5000, "payment allocations");
    safeArray(input.paymentAllocationLines, 5000, "payment allocation lines");
    safeArray(input.customerPaymentCredits, 5000, "customer payment credits");
    if (input.quoteDraft?.lineItems) {
      safeArray(input.quoteDraft.lineItems, 250, "quote line items");
    }
  }

  function normalizeWorkspace(input) {
    validateWorkspacePayload(input);
    const fallback = cloneInitialState();
    const next = {
      ...fallback,
      ...input,
      meta: { ...fallback.meta, ...(input?.meta || {}) },
      quoteDraft: { ...fallback.quoteDraft, ...(input?.quoteDraft || {}) }
    };
    next.customers = Array.isArray(input?.customers) ? input.customers : fallback.customers;
    next.deals = Array.isArray(input?.deals) ? input.deals : fallback.deals;
    next.invoices = Array.isArray(input?.invoices) ? input.invoices : fallback.invoices;
    next.collectionActions = Array.isArray(input?.collectionActions) ? input.collectionActions : fallback.collectionActions;
    next.ownerDigests = Array.isArray(input?.ownerDigests) ? input.ownerDigests : fallback.ownerDigests;
    next.ownerDigestSchedules = Array.isArray(input?.ownerDigestSchedules) ? input.ownerDigestSchedules : fallback.ownerDigestSchedules;
    next.ownerProfiles = Array.isArray(input?.ownerProfiles) ? input.ownerProfiles : fallback.ownerProfiles;
    next.customerPlaybooks = Array.isArray(input?.customerPlaybooks) ? input.customerPlaybooks : fallback.customerPlaybooks;
    next.accountingConnections = Array.isArray(input?.accountingConnections) ? input.accountingConnections : fallback.accountingConnections;
    next.accountingSyncRuns = Array.isArray(input?.accountingSyncRuns) ? input.accountingSyncRuns : fallback.accountingSyncRuns;
    next.providerOAuthRequests = Array.isArray(input?.providerOAuthRequests) ? input.providerOAuthRequests : fallback.providerOAuthRequests;
    next.providerOAuthCallbackEvents = Array.isArray(input?.providerOAuthCallbackEvents) ? input.providerOAuthCallbackEvents : fallback.providerOAuthCallbackEvents;
    next.providerCredentialVault = Array.isArray(input?.providerCredentialVault) ? input.providerCredentialVault : fallback.providerCredentialVault;
    next.providerTokenExchangeRuns = Array.isArray(input?.providerTokenExchangeRuns) ? input.providerTokenExchangeRuns : fallback.providerTokenExchangeRuns;
    next.bankAccounts = Array.isArray(input?.bankAccounts) ? input.bankAccounts : fallback.bankAccounts;
    next.bankTransactions = Array.isArray(input?.bankTransactions) ? input.bankTransactions : fallback.bankTransactions;
    next.paymentMatchSuggestions = Array.isArray(input?.paymentMatchSuggestions) ? input.paymentMatchSuggestions : fallback.paymentMatchSuggestions;
    next.paymentMatchSplitLines = Array.isArray(input?.paymentMatchSplitLines) ? input.paymentMatchSplitLines : fallback.paymentMatchSplitLines;
    next.paymentAllocations = Array.isArray(input?.paymentAllocations) ? input.paymentAllocations : fallback.paymentAllocations;
    next.paymentAllocationLines = Array.isArray(input?.paymentAllocationLines) ? input.paymentAllocationLines : fallback.paymentAllocationLines;
    next.customerPaymentCredits = Array.isArray(input?.customerPaymentCredits) ? input.customerPaymentCredits : fallback.customerPaymentCredits;
    next.quoteDraft.lineItems = Array.isArray(input?.quoteDraft?.lineItems)
      ? input.quoteDraft.lineItems
      : fallback.quoteDraft.lineItems;
    return next;
  }

  function ownerProfileByLabel(ownerLabel) {
    return (state.ownerProfiles || []).find((profile) => profile.label === ownerLabel) || null;
  }

  function ownerLabelOptions() {
    const labels = (state.ownerProfiles || [])
      .filter((profile) => profile.status === "active")
      .map((profile) => profile.label);
    return labels.length ? labels : defaultOwnerLabels;
  }

  function titleizeToken(value) {
    return String(value || "standard").replace(/_/g, " ");
  }

  function playbookByCustomerId(customerId) {
    return (state.customerPlaybooks || []).find((playbook) => (
      playbook.customerId === customerId && playbook.status !== "disabled"
    )) || null;
  }

  function playbookChannelLabel(playbook, fallback = "Email") {
    const channel = String(playbook?.preferredChannel || "").toLowerCase();
    if (channel === "whatsapp") return "WhatsApp";
    if (channel === "phone") return "Phone";
    if (channel === "manual") return "Manual";
    if (channel === "email") return "Email";
    return fallback;
  }

  function playbookActionLabel(playbook, fallback) {
    const channel = String(playbook?.preferredChannel || "").toLowerCase();
    if (channel === "whatsapp") return "Send WhatsApp nudge";
    if (channel === "phone") return "Call finance today";
    if (channel === "manual") return "Manual owner follow-up";
    return fallback;
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

  function downloadText(filename, content, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(value) {
    const raw = String(value ?? "");
    const neutralized = /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${neutralized.replace(/"/g, '""')}"`;
  }

  function downloadCsv(filename, headers, rows) {
    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
    ].join("\n");
    downloadText(filename, csv, "text/csv");
  }

  function quoteTotal() {
    return state.quoteDraft.lineItems.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0);
  }

  function invoiceStatus(invoice) {
    if (invoice.status === "paid") return { label: "Paid", className: "badge" };
    if (invoice.status === "partial") return { label: "Partial", className: "badge gold" };
    if (invoice.status === "overdue" || daysUntil(invoice.due) < 0) return { label: "Overdue", className: "badge red" };
    if (invoice.status === "due" || daysUntil(invoice.due) <= 7) return { label: "Due soon", className: "badge gold" };
    return { label: "Open", className: "badge violet" };
  }

  function invoiceRisk(invoice) {
    if (invoice.status === "paid") return { score: 0, label: "Settled", className: "badge" };
    const days = -daysUntil(invoice.due);
    const playbook = playbookByCustomerId(invoice.customerId);
    let score = 0;
    if (invoice.status === "partial") score += 12;
    if (days > 30) score += 45;
    else if (days > 14) score += 35;
    else if (days > 0) score += 28;
    else if (days >= -3) score += 18;
    else if (days >= -10) score += 10;

    if (invoice.status === "overdue") score += 20;
    else if (invoice.status === "due") score += 8;

    if (invoice.amount >= 100000) score += 20;
    else if (invoice.amount >= 75000) score += 14;
    else if (invoice.amount >= 50000) score += 10;

    score += Number(playbook?.riskWeight || 0);

    const clamped = Math.max(0, Math.min(100, score));
    if (clamped >= 75) return { score: clamped, label: "Critical", className: "badge red" };
    if (clamped >= 55) return { score: clamped, label: "High risk", className: "badge gold" };
    if (clamped >= 35) return { score: clamped, label: "Watch", className: "badge violet" };
    return { score: clamped, label: "Steady", className: "badge" };
  }

  function invoiceNextAction(invoice, risk) {
    const days = -daysUntil(invoice.due);
    const playbook = playbookByCustomerId(invoice.customerId);
    if (playbook?.escalationPolicy === "hold") return { label: "Review playbook hold", className: "badge violet" };
    if (playbook?.escalationPolicy === "owner_review" && risk.score >= 35) return { label: "Owner review", className: "badge violet" };
    if (risk.score >= 75) return { label: playbookActionLabel(playbook, "Call finance today"), className: "badge red" };
    if (risk.score >= 55) return { label: playbookActionLabel(playbook, "Send firm follow-up"), className: "badge gold" };
    if (days >= -3 && risk.score >= 35) return { label: playbookActionLabel(playbook, "Draft reminder"), className: "badge violet" };
    return { label: "Monitor", className: "badge" };
  }

  function actionKey(invoiceId, actionLabel) {
    return `${invoiceId || "none"}:${actionLabel || "action"}`;
  }

  function openTrackedAction(invoiceId, actionLabel) {
    const actions = Array.isArray(state.collectionActions) ? state.collectionActions : [];
    return actions.find((action) => (
      action.status === "open" && action.key === actionKey(invoiceId, actionLabel)
    ));
  }

  function persist(message) {
    state.meta.updatedAt = new Date().toISOString();
    storage.save(state);
    if (message) showToast(message);
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function setTab(tabId) {
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tabId);
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === tabId);
    });
    document.getElementById("page-title").textContent = titleMap[tabId];
  }

  function renderDashboard() {
    const openInvoices = state.invoices.filter((invoice) => invoice.status !== "paid");
    const expected = openInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const overdue = openInvoices
      .filter((invoice) => invoiceStatus(invoice).label === "Overdue")
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const pipeline = state.deals
      .filter((deal) => deal.stage !== "won")
      .reduce((sum, deal) => sum + deal.value, 0);

    document.getElementById("metric-expected").textContent = money(expected);
    document.getElementById("metric-expected-sub").textContent = `${openInvoices.length} open invoices`;
    document.getElementById("metric-overdue").textContent = money(overdue);
    document.getElementById("metric-overdue-sub").textContent = overdue > 0 ? "Needs follow-up today" : "All current";
    document.getElementById("metric-pipeline").textContent = money(pipeline);
    document.getElementById("metric-pipeline-sub").textContent = `${state.deals.filter((deal) => deal.stage !== "won").length} open opportunities`;
    document.getElementById("metric-customers").textContent = String(state.customers.length);

    const overdueInvoices = openInvoices.filter((invoice) => invoiceStatus(invoice).label === "Overdue");
    const staleDeals = state.deals.filter((deal) => deal.stage === "quoted" || deal.stage === "negotiation");
    const workItems = [
      ...overdueInvoices.map((invoice) => ({
        title: `Collect ${invoice.id}`,
        detail: `${customerById(invoice.customerId).name} owes ${money(invoice.amount)}`,
        badge: invoiceNextAction(invoice, invoiceRisk(invoice)).label,
        badgeClass: invoiceNextAction(invoice, invoiceRisk(invoice)).className
      })),
      ...(state.accountingSyncRuns || [])
        .filter((run) => run.status === "needs_review")
        .slice(0, 1)
        .map((run) => ({
          title: "Review accounting match",
          detail: run.summary,
          badge: `${run.recordsFailed} review`,
          badgeClass: "badge gold"
      })),
      ...(state.paymentMatchSuggestions || [])
        .filter((match) => ["needs_review", "suggested"].includes(match.status))
        .slice(0, 1)
        .map((match) => ({
          title: "Review bank match",
          detail: match.reason,
          badge: `${match.confidence}%`,
          badgeClass: "badge gold"
        })),
      ...staleDeals.slice(0, 2).map((deal) => ({
        title: customerById(deal.customerId).name,
        detail: deal.next,
        badge: money(deal.value),
        badgeClass: "badge"
      }))
    ];

    document.getElementById("work-list").innerHTML = workItems.map((item) => `
      <article class="work-item">
        <div>
          <strong>${item.title}</strong>
          <span>${item.detail}</span>
        </div>
        <span class="${item.badgeClass}">${item.badge}</span>
      </article>
    `).join("");

    const weekly = [
      { label: "This week", amount: 0 },
      { label: "May 13", amount: 0 },
      { label: "May 20", amount: 0 },
      { label: "May 27", amount: 0 }
    ];
    openInvoices.forEach((invoice) => {
      const days = daysUntil(invoice.due);
      if (days <= 7) weekly[0].amount += invoice.amount;
      else if (days <= 14) weekly[1].amount += invoice.amount;
      else if (days <= 21) weekly[2].amount += invoice.amount;
      else weekly[3].amount += invoice.amount;
    });
    const maxWeek = Math.max(1, ...weekly.map((week) => week.amount));
    document.getElementById("cash-chart").innerHTML = weekly.map((week) => `
      <div class="bar-row">
        <span>${week.label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(10, Math.round((week.amount / maxWeek) * 100))}%"></div></div>
        <strong>${money(week.amount)}</strong>
      </div>
    `).join("");

    const riskInvoices = openInvoices
      .filter((invoice) => invoiceStatus(invoice).label !== "Open")
      .sort((left, right) => invoiceRisk(right).score - invoiceRisk(left).score)
      .slice(0, 3);
    document.getElementById("risk-strip").innerHTML = riskInvoices.map((invoice) => {
      const status = invoiceStatus(invoice);
      const risk = invoiceRisk(invoice);
      const action = invoiceNextAction(invoice, risk);
      const tracked = openTrackedAction(invoice.id, action.label);
      const escalationLevel = Number(tracked?.escalationLevel || 0);
      const ownerLabel = tracked?.ownerLabel || "Finance owner";
      const ownerDigestCount = Array.isArray(state.ownerDigests)
        ? state.ownerDigests.filter((digest) => digest.ownerLabel === ownerLabel).length
        : 0;
      const latestOwnerDigest = Array.isArray(state.ownerDigests)
        ? state.ownerDigests.find((digest) => digest.ownerLabel === ownerLabel)
        : null;
      const latestSchedule = Array.isArray(state.ownerDigestSchedules)
        ? state.ownerDigestSchedules.find((schedule) => schedule.ownerLabel === ownerLabel)
        : null;
      const canQueueDigest = latestOwnerDigest?.status === "draft";
      const canApproveDigest = latestOwnerDigest?.status === "review_pending";
      const ownerProfile = ownerProfileByLabel(ownerLabel);
      const playbook = playbookByCustomerId(invoice.customerId);
      return `
        <article class="risk-card">
          <div class="risk-card-top">
            <span class="${status.className}">${status.label}</span>
            <span class="${risk.className}">${risk.label}</span>
          </div>
          <div>
            <strong>${customerById(invoice.customerId).name}</strong>
            <span>${invoice.id} due ${invoice.due}</span>
          </div>
          ${playbook ? `<small class="tracked-note">${playbook.name} - ${titleizeToken(playbook.paymentBehavior)} - ${playbookChannelLabel(playbook)} - ${Number(playbook.riskWeight || 0) > 0 ? "+" : ""}${playbook.riskWeight} risk</small>` : ""}
          <div class="risk-score-row">
            <strong>${money(invoice.amount)}</strong>
            <span>${risk.score}/100 risk</span>
          </div>
          <div class="risk-action-row">
            <span class="${action.className}">${action.label}</span>
            ${tracked
              ? `<button class="tiny-button" type="button" data-escalate-action="${tracked.id}" ${escalationLevel >= 3 ? "disabled" : ""}>${escalationLevel >= 3 ? "Max level" : "Escalate"}</button>`
              : `<button class="tiny-button" type="button" data-track-action="${invoice.id}">Track</button>`}
            ${tracked ? `<button class="tiny-button" type="button" data-assign-action="${tracked.id}">Assign</button>` : ""}
            ${tracked ? `<button class="tiny-button" type="button" data-digest-owner="${ownerLabel}">Digest</button>` : ""}
            ${canQueueDigest ? `<button class="tiny-button" type="button" data-queue-digest-owner="${ownerLabel}">Review</button>` : ""}
            ${canApproveDigest ? `<button class="tiny-button" type="button" data-approve-digest-owner="${ownerLabel}">Approve</button><button class="tiny-button" type="button" data-reject-digest-owner="${ownerLabel}">Reject</button>` : ""}
            ${tracked ? `<button class="tiny-button" type="button" data-schedule-digest-owner="${ownerLabel}">Schedule</button>` : ""}
            ${latestSchedule ? `<button class="tiny-button" type="button" data-run-digest-schedule-owner="${ownerLabel}">Run</button>` : ""}
          </div>
          ${tracked ? `<small class="tracked-note">${ownerLabel}${ownerProfile ? ` - ${ownerProfile.displayName} / ${ownerProfile.preferredChannel}` : ""} - Level ${escalationLevel}${ownerDigestCount ? ` - ${ownerDigestCount} digest${ownerDigestCount === 1 ? "" : "s"}` : ""}${latestOwnerDigest ? ` - ${latestOwnerDigest.status}` : ""}${latestSchedule ? ` - ${latestSchedule.cadence} schedule` : ""}</small>` : ""}
          <div class="risk-meter"><span style="width:${risk.score}%"></span></div>
        </article>
      `;
    }).join("");
  }

  function renderCustomers() {
    document.getElementById("customer-grid").innerHTML = state.customers.map((customer) => {
      const customerInvoices = state.invoices.filter((invoice) => invoice.customerId === customer.id);
      const openAmount = customerInvoices
        .filter((invoice) => invoice.status !== "paid")
        .reduce((sum, invoice) => sum + invoice.amount, 0);
      const customerDeals = state.deals.filter((deal) => deal.customerId === customer.id);
      const playbook = playbookByCustomerId(customer.id);
      return `
        <article class="customer-card">
          <div class="customer-head">
            <div>
              <strong>${customer.name}</strong>
              <span>${customer.segment}</span>
            </div>
            <span class="badge">${customerDeals.length} deals</span>
          </div>
          <div class="customer-contact">
            <span>${customer.contact}</span>
            <span>${customer.email}</span>
            <span>${customer.phone}</span>
          </div>
          <div class="customer-stats">
            <div>
              <small>Open balance</small>
              <strong>${money(openAmount)}</strong>
            </div>
            <div>
              <small>Terms</small>
              <strong>${customer.terms}</strong>
            </div>
          </div>
          <p>${customer.notes}</p>
          ${playbook ? `<small class="tracked-note">${playbook.name} - ${titleizeToken(playbook.paymentBehavior)} - ${playbookChannelLabel(playbook)} - ${titleizeToken(playbook.escalationPolicy)}</small>` : ""}
          <div class="row-actions">
            <button class="tiny-button" type="button" data-customer-edit="${customer.id}">Edit</button>
            <button class="tiny-button" type="button" data-customer-quote="${customer.id}">Start quote</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderPipeline() {
    document.getElementById("pipeline").innerHTML = stages.map((stage) => {
      const stageDeals = state.deals.filter((deal) => deal.stage === stage.id);
      return `
        <section class="stage">
          <h3>${stage.label}<span class="badge">${stageDeals.length}</span></h3>
          ${stageDeals.map((deal) => `
            <article class="deal-card">
              <div>
                <strong>${customerById(deal.customerId).name}</strong>
                <span>${deal.title}</span>
              </div>
              <footer>
                <strong>${money(deal.value)}</strong>
                <span>${deal.owner}</span>
              </footer>
              <span>${deal.next}</span>
              <div class="row-actions">
                <button class="tiny-button" type="button" data-deal-edit="${deal.id}">Edit</button>
              </div>
            </article>
          `).join("")}
        </section>
      `;
    }).join("");
  }

  function renderCustomerOptions() {
    const selectedCustomer = state.quoteDraft.customerId;
    document.getElementById("quote-customer").innerHTML = state.customers.map((customer) => `
      <option value="${customer.id}" ${customer.id === selectedCustomer ? "selected" : ""}>${customer.name}</option>
    `).join("");
  }

  function fillCustomerSelect(selectId, selectedId) {
    const select = field(selectId);
    const current = selectedId || select.value || state.customers[0]?.id || "";
    select.innerHTML = state.customers.map((customer) => `
      <option value="${customer.id}" ${customer.id === current ? "selected" : ""}>${customer.name}</option>
    `).join("");
  }

  function renderRecordSelects() {
    fillCustomerSelect("deal-customer");
    fillCustomerSelect("invoice-customer");
  }

  function renderQuoteLines() {
    document.getElementById("line-items").innerHTML = state.quoteDraft.lineItems.map((item, index) => `
      <div class="line-item">
        <label>
          Item
          <input type="text" value="${item.name}" data-line="${index}" data-field="name">
        </label>
        <label>
          Qty
          <input type="number" min="1" value="${item.qty}" data-line="${index}" data-field="qty">
        </label>
        <label>
          Unit price
          <input type="number" min="0" value="${item.price}" data-line="${index}" data-field="price">
        </label>
        <button type="button" aria-label="Remove line item" data-remove-line="${index}">X</button>
      </div>
    `).join("");
  }

  function renderQuotePreview() {
    const customer = customerById(state.quoteDraft.customerId);
    const total = quoteTotal();
    document.getElementById("quote-title").value = state.quoteDraft.title;
    document.getElementById("quote-terms").value = state.quoteDraft.terms;
    document.getElementById("preview-customer").textContent = customer.name;
    document.getElementById("preview-title").textContent = state.quoteDraft.title || "Commercial offer";
    document.getElementById("preview-total").textContent = money(total);
    document.getElementById("preview-grand-total").textContent = money(total);
    document.getElementById("preview-terms").textContent = state.quoteDraft.terms;
    document.getElementById("preview-lines").innerHTML = state.quoteDraft.lineItems.map((item) => `
      <div class="preview-row">
        <span>${item.qty} x ${item.name}</span>
        <strong>${money(Number(item.qty) * Number(item.price))}</strong>
      </div>
    `).join("");
  }

  function renderQuote() {
    renderCustomerOptions();
    renderQuoteLines();
    renderQuotePreview();
  }

  function renderInvoices() {
    const rows = state.invoices.filter((invoice) => {
      const status = invoiceStatus(invoice).label.toLowerCase().replace(" ", "");
      if (invoiceFilter === "all") return true;
      if (invoiceFilter === "due") return status === "duesoon";
      return status === invoiceFilter;
    });

    document.getElementById("invoice-table").innerHTML = rows.map((invoice) => {
      const status = invoiceStatus(invoice);
      const days = daysUntil(invoice.due);
      const dueText = days < 0 ? `${Math.abs(days)} days late` : days === 0 ? "Today" : `${days} days`;
      return `
        <tr>
          <td><strong>${invoice.id}</strong></td>
          <td>${customerById(invoice.customerId).name}</td>
          <td><strong>${money(invoice.amount)}</strong></td>
          <td>${invoice.due}<br><span class="muted">${dueText}</span></td>
          <td><span class="${status.className}">${status.label}</span></td>
          <td>
            <div class="row-actions">
              <button class="tiny-button" type="button" data-edit-invoice="${invoice.id}">Edit</button>
              <button class="tiny-button" type="button" data-follow="${invoice.id}">Follow up</button>
              <button class="tiny-button" type="button" data-export-invoice="${invoice.id}">PDF</button>
              ${status.label !== "Paid" ? `<button class="tiny-button" type="button" data-paid="${invoice.id}">Mark paid</button>` : ""}
            </div>
          </td>
        </tr>
      `;
    }).join("");
    renderAiInvoiceOptions();
  }

  function renderAiInvoiceOptions() {
    document.getElementById("ai-invoice").innerHTML = state.invoices.map((invoice) => `
      <option value="${invoice.id}">${invoice.id} - ${customerById(invoice.customerId).name} - ${money(invoice.amount)}</option>
    `).join("");
  }

  function renderInsights() {
    const overdueCount = state.invoices.filter((invoice) => invoiceStatus(invoice).label === "Overdue").length;
    const quotedValue = state.deals
      .filter((deal) => deal.stage === "quoted" || deal.stage === "negotiation")
      .reduce((sum, deal) => sum + deal.value, 0);
    const openCash = state.invoices
      .filter((invoice) => invoice.status !== "paid")
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const latestConnection = (state.accountingConnections || [])[0];
    const oauthReadyCount = (state.providerOAuthRequests || []).filter((request) => ["ready", "redirect_pending", "exchange_pending", "authorized"].includes(request.status)).length;
    const oauthCallbackCount = Array.isArray(state.providerOAuthCallbackEvents) ? state.providerOAuthCallbackEvents.length : 0;
    const credentialVaultCount = Array.isArray(state.providerCredentialVault) ? state.providerCredentialVault.length : 0;
    const tokenExchangeCount = Array.isArray(state.providerTokenExchangeRuns) ? state.providerTokenExchangeRuns.length : 0;
    const reviewSyncCount = (state.accountingSyncRuns || []).filter((run) => run.status === "needs_review").length;
    const bankTransactionTotal = (state.bankTransactions || [])
      .filter((transaction) => transaction.direction === "credit")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const bankReviewCount = (state.paymentMatchSuggestions || []).filter((match) => ["needs_review", "suggested"].includes(match.status)).length;
    const splitLineCount = Array.isArray(state.paymentMatchSplitLines) ? state.paymentMatchSplitLines.length : 0;
    const allocationCount = Array.isArray(state.paymentAllocations) ? state.paymentAllocations.length : 0;
    const openCreditCount = Array.isArray(state.customerPaymentCredits)
      ? state.customerPaymentCredits.filter((credit) => credit.status === "open").length
      : 0;
    const insights = [
      {
        title: "Late payment pattern",
        body: `${overdueCount} invoice${overdueCount === 1 ? "" : "s"} need follow-up before the week closes.`
      },
      {
        title: "Accounting bridge",
        body: `${latestConnection ? accountingProviderLabel(latestConnection.provider) : "No provider"} staged, ${oauthReadyCount} OAuth request${oauthReadyCount === 1 ? "" : "s"} ready, ${oauthCallbackCount} callback event${oauthCallbackCount === 1 ? "" : "s"} validated, ${tokenExchangeCount} exchange run${tokenExchangeCount === 1 ? "" : "s"} recorded, ${credentialVaultCount} vault entr${credentialVaultCount === 1 ? "y" : "ies"} active, and ${reviewSyncCount} sync run${reviewSyncCount === 1 ? "" : "s"} need review.`
      },
      {
        title: "Bank match queue",
        body: `${money(bankTransactionTotal)} in imported credits, ${bankReviewCount} suggestion${bankReviewCount === 1 ? "" : "s"} needing review, ${splitLineCount} split line${splitLineCount === 1 ? "" : "s"}, ${allocationCount} allocation${allocationCount === 1 ? "" : "s"}, and ${openCreditCount} open credit${openCreditCount === 1 ? "" : "s"}.`
      },
      {
        title: "Quote gap",
        body: `${money(quotedValue)} is sitting between quote and negotiation.`
      },
      {
        title: "Cash timing",
        body: `${money(openCash)} is expected across current open invoices.`
      }
    ];
    document.getElementById("insight-list").innerHTML = insights.map((insight) => `
      <article>
        <strong>${insight.title}</strong>
        <span>${insight.body}</span>
      </article>
    `).join("");
  }

  function renderWorkspaceInfo() {
    document.getElementById("sidebar-workspace").textContent = state.meta.workspace;
    document.getElementById("sidebar-location").textContent = state.meta.location;
    document.getElementById("version-badge").textContent = `${appVersion.version} - ${appVersion.label}`;
  }

  function renderSettings() {
    setField("workspace-name", state.meta.workspace);
    setField("workspace-location", state.meta.location);
    setField("workspace-owner", state.meta.owner);
    setField("workspace-industry", state.meta.industry);
    setField("workspace-currency", state.meta.currency);
    setField("workspace-date", state.meta.today);
    setField("workspace-note", state.meta.note);

    const updated = state.meta.updatedAt
      ? new Date(state.meta.updatedAt).toLocaleString()
      : "Not saved in this browser yet";
    document.getElementById("data-health").innerHTML = [
      { label: "Customers", value: state.customers.length },
      { label: "Deals", value: state.deals.length },
      { label: "Invoices", value: state.invoices.length },
      { label: "Actions", value: Array.isArray(state.collectionActions) ? state.collectionActions.length : 0 },
      { label: "Digests", value: Array.isArray(state.ownerDigests) ? state.ownerDigests.length : 0 },
      { label: "Owners", value: Array.isArray(state.ownerProfiles) ? state.ownerProfiles.length : 0 },
      { label: "Playbooks", value: Array.isArray(state.customerPlaybooks) ? state.customerPlaybooks.length : 0 },
      { label: "Accounting", value: Array.isArray(state.accountingConnections) ? state.accountingConnections.length : 0 },
      { label: "Sync runs", value: Array.isArray(state.accountingSyncRuns) ? state.accountingSyncRuns.length : 0 },
      { label: "OAuth requests", value: Array.isArray(state.providerOAuthRequests) ? state.providerOAuthRequests.length : 0 },
      { label: "OAuth callbacks", value: Array.isArray(state.providerOAuthCallbackEvents) ? state.providerOAuthCallbackEvents.length : 0 },
      { label: "Credential vault", value: Array.isArray(state.providerCredentialVault) ? state.providerCredentialVault.length : 0 },
      { label: "Token exchange", value: Array.isArray(state.providerTokenExchangeRuns) ? state.providerTokenExchangeRuns.length : 0 },
      { label: "Bank accounts", value: Array.isArray(state.bankAccounts) ? state.bankAccounts.length : 0 },
      { label: "Bank txns", value: Array.isArray(state.bankTransactions) ? state.bankTransactions.length : 0 },
      { label: "Payment matches", value: Array.isArray(state.paymentMatchSuggestions) ? state.paymentMatchSuggestions.length : 0 },
      { label: "Split lines", value: Array.isArray(state.paymentMatchSplitLines) ? state.paymentMatchSplitLines.length : 0 },
      { label: "Allocations", value: Array.isArray(state.paymentAllocations) ? state.paymentAllocations.length : 0 },
      { label: "Allocation lines", value: Array.isArray(state.paymentAllocationLines) ? state.paymentAllocationLines.length : 0 },
      { label: "Credits", value: Array.isArray(state.customerPaymentCredits) ? state.customerPaymentCredits.length : 0 },
      { label: "Pending approvals", value: Array.isArray(state.ownerDigests) ? state.ownerDigests.filter((digest) => digest.status === "review_pending").length : 0 },
      { label: "Queued digests", value: Array.isArray(state.ownerDigests) ? state.ownerDigests.filter((digest) => digest.status === "queued").length : 0 },
      { label: "Schedules", value: Array.isArray(state.ownerDigestSchedules) ? state.ownerDigestSchedules.length : 0 },
      { label: "Last saved", value: updated }
    ].map((item) => `
      <article>
        <span>${item.label}</span>
        <strong>${item.value}</strong>
      </article>
    `).join("");
  }

  function saveWorkspace(event) {
    event.preventDefault();
    state.meta = {
      ...state.meta,
      workspace: field("workspace-name").value.trim() || "Collectra workspace",
      location: field("workspace-location").value.trim() || "Not set",
      owner: field("workspace-owner").value.trim() || "Owner",
      industry: field("workspace-industry").value.trim() || "B2B company",
      currency: field("workspace-currency").value,
      today: field("workspace-date").value || state.meta.today,
      note: field("workspace-note").value.trim()
    };
    persist("Workspace settings saved");
    renderAll();
  }

  function exportWorkspace() {
    const filename = `${state.meta.workspace.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "collectra"}-workspace.json`;
    downloadText(filename, JSON.stringify(state, null, 2), "application/json");
    showToast("Workspace backup exported");
  }

  function importWorkspace(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const imported = JSON.parse(String(reader.result));
        state = normalizeWorkspace(imported);
        persist("Workspace imported");
        renderAll();
        generateFollowup(state.invoices[0]?.id);
        setTab("dashboard");
      } catch (error) {
        console.error(error);
        showToast("Could not import that JSON file");
      }
    });
    reader.readAsText(file);
  }

  function exportCustomersCsv() {
    downloadCsv("collectra-customers.csv", ["name", "contact", "email", "phone", "segment", "terms", "notes"], state.customers);
    showToast("Customers CSV exported");
  }

  function exportDealsCsv() {
    const rows = state.deals.map((deal) => ({
      customer: customerById(deal.customerId).name,
      title: deal.title,
      value: deal.value,
      stage: deal.stage,
      owner: deal.owner,
      next: deal.next
    }));
    downloadCsv("collectra-deals.csv", ["customer", "title", "value", "stage", "owner", "next"], rows);
    showToast("Deals CSV exported");
  }

  function exportInvoicesCsv() {
    const rows = state.invoices.map((invoice) => ({
      invoice: invoice.id,
      customer: customerById(invoice.customerId).name,
      amount: invoice.amount,
      due: invoice.due,
      status: invoiceStatus(invoice).label
    }));
    downloadCsv("collectra-invoices.csv", ["invoice", "customer", "amount", "due", "status"], rows);
    showToast("Invoices CSV exported");
  }

  function buildFollowup(invoice, tone) {
    const customer = customerById(invoice.customerId);
    const playbook = playbookByCustomerId(invoice.customerId);
    const effectiveTone = playbook?.reminderTone || tone;
    const days = daysUntil(invoice.due);
    const greeting = `Hi ${customer.contact},`;
    const amount = money(invoice.amount);
    const dueLine = days < 0
      ? `invoice ${invoice.id} for ${amount} is now ${Math.abs(days)} days overdue`
      : `invoice ${invoice.id} for ${amount} is due on ${invoice.due}`;
    const close = {
      polite: "Could you please confirm the expected payment date when you have a moment?",
      firm: "Please arrange payment or share a confirmed payment date today so we can keep the account current.",
      friendly: "Can you help me close the loop on this today?",
      urgent: "Please confirm the payment plan today so we can avoid further escalation."
    }[effectiveTone] || "Can you help me close the loop on this today?";
    const channelLine = playbook?.preferredChannel === "phone"
      ? "\n\nIf it is easier, I can also close this quickly by phone."
      : "";

    if (invoiceStatus(invoice).label === "Paid") {
      return `${greeting}\n\nThank you for settling ${invoice.id}. We have marked the payment as received on our side.\n\nRegards,\nCollectra Finance`;
    }
    return `${greeting}\n\nI hope you are well. A quick note that ${dueLine}.\n\n${close}${channelLine}\n\nRegards,\nCollectra Finance`;
  }

  function generateFollowup(invoiceId) {
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    document.getElementById("ai-output").value = buildFollowup(invoice, document.getElementById("ai-tone").value);
    setTab("desk");
  }

  function markInvoicePaid(invoiceId) {
    state.invoices = state.invoices.map((invoice) => invoice.id === invoiceId ? { ...invoice, status: "paid" } : invoice);
    persist(`${invoiceId} marked paid`);
    renderAll();
  }

  function trackCollectionAction(invoiceId) {
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    const risk = invoiceRisk(invoice);
    const action = invoiceNextAction(invoice, risk);
    const playbook = playbookByCustomerId(invoice.customerId);
    if (openTrackedAction(invoice.id, action.label)) {
      showToast(`${invoice.id} action is already tracked`);
      return;
    }
    state.collectionActions = Array.isArray(state.collectionActions) ? state.collectionActions : [];
    state.collectionActions.unshift({
      id: makeId("action"),
      key: actionKey(invoice.id, action.label),
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      label: action.label,
      status: "open",
      riskScore: risk.score,
      ownerProfileId: ownerProfileByLabel("Finance owner")?.id || "",
      ownerLabel: "Finance owner",
      assignmentNote: "Assigned when action was tracked.",
      assignedAt: new Date().toISOString(),
      escalationLevel: 0,
      escalationReason: "",
      escalatedAt: "",
      playbookId: playbook?.id || "",
      playbookName: playbook?.name || "",
      paymentBehavior: playbook?.paymentBehavior || "",
      preferredChannel: playbook?.preferredChannel || "",
      createdAt: new Date().toISOString()
    });
    persist(`${invoice.id} owner action tracked`);
    renderAll();
  }

  function assignCollectionAction(actionId) {
    state.collectionActions = Array.isArray(state.collectionActions) ? state.collectionActions : [];
    const action = state.collectionActions.find((item) => item.id === actionId);
    if (!action || action.status !== "open") return;
    const labels = ownerLabelOptions();
    const currentIndex = Math.max(0, labels.indexOf(action.ownerLabel || "Finance owner"));
    action.ownerLabel = labels[(currentIndex + 1) % labels.length];
    action.ownerProfileId = ownerProfileByLabel(action.ownerLabel)?.id || "";
    action.assignmentNote = `Assigned to ${action.ownerLabel}`;
    action.assignedAt = new Date().toISOString();
    persist(`${action.invoiceId} assigned to ${action.ownerLabel}`);
    renderAll();
  }

  function createOwnerDigest(ownerLabel) {
    state.collectionActions = Array.isArray(state.collectionActions) ? state.collectionActions : [];
    state.ownerDigests = Array.isArray(state.ownerDigests) ? state.ownerDigests : [];
    const openActions = state.collectionActions.filter((action) => action.status === "open" && action.ownerLabel === ownerLabel);
    if (!openActions.length) {
      showToast(`No open actions found for ${ownerLabel}`);
      return false;
    }

    const overdueCount = openActions.filter((action) => {
      const invoice = state.invoices.find((item) => item.id === action.invoiceId);
      return invoice ? invoiceStatus(invoice).label === "Overdue" : false;
    }).length;
    const escalatedCount = openActions.filter((action) => Number(action.escalationLevel || 0) > 0).length;
    const totalRiskScore = openActions.reduce((sum, action) => sum + Number(action.riskScore || 0), 0);
    const ownerProfile = ownerProfileByLabel(ownerLabel);
    const actionLines = openActions.slice(0, 6).map((action, index) => {
      const customer = customerById(action.customerId);
      return `${index + 1}. ${action.label} - ${action.invoiceId} - ${customer.name} - ${action.riskScore}/100`;
    });

    state.ownerDigests.unshift({
      id: makeId("digest"),
      ownerProfileId: ownerProfile?.id || "",
      ownerLabel,
      subject: `${ownerLabel} cash digest: ${openActions.length} open action${openActions.length === 1 ? "" : "s"}`,
      body: [
        `Owner: ${ownerLabel}`,
        `Open actions: ${openActions.length}`,
        `Overdue: ${overdueCount}`,
        `Escalated: ${escalatedCount}`,
        `Total risk score: ${totalRiskScore}`,
        "",
        "Priority actions:",
        ...actionLines
      ].join("\n"),
      actionCount: openActions.length,
      overdueCount,
      escalatedCount,
      totalRiskScore,
      status: "draft",
      reviewStatus: "draft",
      recipient: ownerProfile?.preferredChannel === "email" ? ownerProfile.email : ownerProfile?.preferredChannel === "whatsapp" ? ownerProfile.phone : ownerLabel,
      ownerProfile: ownerProfile ? {
        displayName: ownerProfile.displayName,
        preferredChannel: ownerProfile.preferredChannel
      } : null,
      createdAt: new Date().toISOString()
    });
    persist(`${ownerLabel} digest created`);
    renderAll();
    return true;
  }

  function queueOwnerDigest(ownerLabel) {
    state.ownerDigests = Array.isArray(state.ownerDigests) ? state.ownerDigests : [];
    const digest = state.ownerDigests.find((item) => item.ownerLabel === ownerLabel && item.status === "draft");
    if (!digest) {
      showToast(`No draft digest found for ${ownerLabel}`);
      return;
    }

    digest.status = "review_pending";
    digest.reviewStatus = "pending";
    digest.reviewRequestedAt = new Date().toISOString();
    digest.queuedChannel = "manual";
    digest.queuedRecipient = digest.recipient || ownerLabel;
    persist(`${ownerLabel} digest waiting for approval`);
    renderAll();
  }

  function approveOwnerDigest(ownerLabel) {
    state.ownerDigests = Array.isArray(state.ownerDigests) ? state.ownerDigests : [];
    const digest = state.ownerDigests.find((item) => item.ownerLabel === ownerLabel && item.status === "review_pending");
    if (!digest) {
      showToast(`No pending digest found for ${ownerLabel}`);
      return;
    }

    digest.status = "queued";
    digest.reviewStatus = "approved";
    digest.approvedAt = new Date().toISOString();
    digest.queuedAt = digest.approvedAt;
    persist(`${ownerLabel} digest approved for delivery review`);
    renderAll();
  }

  function rejectOwnerDigest(ownerLabel) {
    state.ownerDigests = Array.isArray(state.ownerDigests) ? state.ownerDigests : [];
    const digest = state.ownerDigests.find((item) => item.ownerLabel === ownerLabel && item.status === "review_pending");
    if (!digest) {
      showToast(`No pending digest found for ${ownerLabel}`);
      return;
    }

    digest.status = "rejected";
    digest.reviewStatus = "rejected";
    digest.rejectedAt = new Date().toISOString();
    persist(`${ownerLabel} digest rejected before delivery`);
    renderAll();
  }

  function saveOwnerDigestSchedule(ownerLabel) {
    state.ownerDigestSchedules = Array.isArray(state.ownerDigestSchedules) ? state.ownerDigestSchedules : [];
    const existing = state.ownerDigestSchedules.find((item) => item.ownerLabel === ownerLabel);
    const cadence = existing?.cadence === "daily" ? "weekly" : existing?.cadence === "weekly" ? "monthly" : "daily";
    const cadenceDays = cadence === "daily" ? 1 : cadence === "monthly" ? 30 : 7;
    const ownerProfile = ownerProfileByLabel(ownerLabel);
    const nextSchedule = {
      id: existing?.id || makeId("schedule"),
      ownerProfileId: ownerProfile?.id || "",
      ownerLabel,
      cadence,
      channel: existing?.channel || ownerProfile?.preferredChannel || "manual",
      recipient: existing?.recipient || (ownerProfile?.preferredChannel === "email" ? ownerProfile.email : ownerProfile?.preferredChannel === "whatsapp" ? ownerProfile.phone : ownerLabel),
      status: "active",
      nextRunAt: new Date(Date.now() + cadenceDays * 86400000).toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existing) {
      Object.assign(existing, nextSchedule);
    } else {
      state.ownerDigestSchedules.unshift(nextSchedule);
    }
    persist(`${ownerLabel} digest schedule saved`);
    renderAll();
  }

  function runOwnerDigestSchedule(ownerLabel) {
    state.ownerDigestSchedules = Array.isArray(state.ownerDigestSchedules) ? state.ownerDigestSchedules : [];
    const schedule = state.ownerDigestSchedules.find((item) => item.ownerLabel === ownerLabel && item.status === "active");
    if (!schedule) {
      showToast(`No active schedule found for ${ownerLabel}`);
      return;
    }

    if (!createOwnerDigest(ownerLabel)) return;
    queueOwnerDigest(ownerLabel);
    const cadenceDays = schedule.cadence === "daily" ? 1 : schedule.cadence === "monthly" ? 30 : 7;
    schedule.lastQueuedAt = new Date().toISOString();
    schedule.nextRunAt = new Date(Date.now() + cadenceDays * 86400000).toISOString();
    schedule.updatedAt = new Date().toISOString();
    persist(`${ownerLabel} schedule ran and created an approval item`);
    renderAll();
  }

  function escalateCollectionAction(actionId) {
    state.collectionActions = Array.isArray(state.collectionActions) ? state.collectionActions : [];
    const action = state.collectionActions.find((item) => item.id === actionId);
    if (!action || action.status !== "open") return;
    action.escalationLevel = Math.min(3, Number(action.escalationLevel || 0) + 1);
    action.escalationReason = action.escalationLevel > 1 ? "Owner review escalated again" : "Owner review requested";
    action.escalatedAt = new Date().toISOString();
    persist(`${action.invoiceId} escalated to level ${action.escalationLevel}`);
    renderAll();
  }

  function clearCustomerForm() {
    setField("customer-id", "");
    setField("customer-name", "");
    setField("customer-contact", "");
    setField("customer-email", "");
    setField("customer-phone", "");
    setField("customer-segment", "");
    setField("customer-terms", "Net 15");
    setField("customer-notes", "");
    document.getElementById("customer-form-title").textContent = "Add customer";
  }

  function editCustomer(customerId) {
    const customer = state.customers.find((item) => item.id === customerId);
    if (!customer) return;
    setField("customer-id", customer.id);
    setField("customer-name", customer.name);
    setField("customer-contact", customer.contact);
    setField("customer-email", customer.email);
    setField("customer-phone", customer.phone);
    setField("customer-segment", customer.segment);
    setField("customer-terms", customer.terms);
    setField("customer-notes", customer.notes);
    document.getElementById("customer-form-title").textContent = "Edit customer";
    setTab("customers");
  }

  function saveCustomer(event) {
    event.preventDefault();
    const id = field("customer-id").value || makeId("cus");
    const record = {
      id,
      name: field("customer-name").value.trim(),
      contact: field("customer-contact").value.trim(),
      email: field("customer-email").value.trim(),
      phone: field("customer-phone").value.trim(),
      segment: field("customer-segment").value.trim() || "B2B account",
      terms: field("customer-terms").value,
      notes: field("customer-notes").value.trim()
    };
    if (!record.name || !record.contact) {
      showToast("Customer name and contact are required");
      return;
    }
    const existingIndex = state.customers.findIndex((customer) => customer.id === id);
    if (existingIndex >= 0) state.customers[existingIndex] = record;
    else state.customers.unshift(record);
    persist(existingIndex >= 0 ? "Customer updated" : "Customer added");
    renderAll();
    clearCustomerForm();
  }

  function clearDealForm() {
    setField("deal-id", "");
    fillCustomerSelect("deal-customer", state.customers[0]?.id);
    setField("deal-title", "");
    setField("deal-value", "");
    setField("deal-stage", "lead");
    setField("deal-owner", "Dhiraj");
    setField("deal-next", "");
    document.getElementById("deal-form-title").textContent = "Add deal";
  }

  function editDeal(dealId) {
    const deal = state.deals.find((item) => item.id === dealId);
    if (!deal) return;
    setField("deal-id", deal.id);
    fillCustomerSelect("deal-customer", deal.customerId);
    setField("deal-title", deal.title);
    setField("deal-value", deal.value);
    setField("deal-stage", deal.stage);
    setField("deal-owner", deal.owner);
    setField("deal-next", deal.next);
    document.getElementById("deal-form-title").textContent = "Edit deal";
    setTab("deals");
  }

  function saveDeal(event) {
    event.preventDefault();
    const id = field("deal-id").value || makeId("deal");
    const record = {
      id,
      customerId: field("deal-customer").value,
      title: field("deal-title").value.trim(),
      value: Number(field("deal-value").value || 0),
      stage: field("deal-stage").value,
      owner: field("deal-owner").value.trim() || "Dhiraj",
      next: field("deal-next").value.trim() || "Follow up"
    };
    if (!record.customerId || !record.title) {
      showToast("Deal customer and title are required");
      return;
    }
    const existingIndex = state.deals.findIndex((deal) => deal.id === id);
    if (existingIndex >= 0) state.deals[existingIndex] = record;
    else state.deals.unshift(record);
    persist(existingIndex >= 0 ? "Deal updated" : "Deal added");
    renderAll();
    clearDealForm();
  }

  function clearInvoiceForm() {
    setField("invoice-edit-id", "");
    fillCustomerSelect("invoice-customer", state.customers[0]?.id);
    setField("invoice-amount", "");
    setField("invoice-due", state.meta.today);
    setField("invoice-status", "open");
    document.getElementById("invoice-form-title").textContent = "Add invoice";
  }

  function editInvoice(invoiceId) {
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    setField("invoice-edit-id", invoice.id);
    fillCustomerSelect("invoice-customer", invoice.customerId);
    setField("invoice-amount", invoice.amount);
    setField("invoice-due", invoice.due);
    setField("invoice-status", invoice.status);
    document.getElementById("invoice-form-title").textContent = "Edit invoice";
    setTab("invoices");
  }

  function saveInvoice(event) {
    event.preventDefault();
    const id = field("invoice-edit-id").value || nextInvoiceId();
    const record = {
      id,
      customerId: field("invoice-customer").value,
      amount: Number(field("invoice-amount").value || 0),
      due: field("invoice-due").value || state.meta.today,
      status: field("invoice-status").value
    };
    if (!record.customerId || record.amount <= 0) {
      showToast("Invoice customer and amount are required");
      return;
    }
    const existingIndex = state.invoices.findIndex((invoice) => invoice.id === id);
    if (existingIndex >= 0) state.invoices[existingIndex] = record;
    else state.invoices.unshift(record);
    persist(existingIndex >= 0 ? "Invoice updated" : "Invoice added");
    renderAll();
    clearInvoiceForm();
  }

  function exportQuotePdf() {
    const customer = customerById(state.quoteDraft.customerId);
    const total = quoteTotal();
    pdf.download("collectra-quote.pdf", "Collectra Quote", [
      {
        heading: "Customer",
        lines: [
          customer.name,
          `Contact: ${customer.contact}`,
          `Email: ${customer.email}`,
          `Payment terms: ${state.quoteDraft.terms}`
        ]
      },
      {
        heading: state.quoteDraft.title,
        lines: state.quoteDraft.lineItems.map((item) => `${item.qty} x ${item.name} - ${money(Number(item.qty) * Number(item.price))}`)
      },
      {
        heading: "Total",
        lines: [`Grand total: ${money(total)}`]
      }
    ]);
    showToast("Quote PDF exported");
  }

  function exportInvoicePdf(invoiceId) {
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    const customer = customerById(invoice.customerId);
    pdf.download(`${invoice.id}.pdf`, `Invoice ${invoice.id}`, [
      {
        heading: "Customer",
        lines: [
          customer.name,
          `Contact: ${customer.contact}`,
          `Email: ${customer.email}`,
          `Phone: ${customer.phone}`
        ]
      },
      {
        heading: "Invoice",
        lines: [
          `Amount: ${money(invoice.amount)}`,
          `Due date: ${invoice.due}`,
          `Status: ${invoiceStatus(invoice).label}`
        ]
      }
    ]);
    showToast(`${invoice.id} PDF exported`);
  }

  function convertQuoteToInvoice() {
    const invoice = {
      id: nextInvoiceId(),
      customerId: state.quoteDraft.customerId,
      amount: quoteTotal(),
      due: "2026-06-07",
      status: "open"
    };
    state.invoices.unshift(invoice);
    persist("Quote converted to invoice");
    renderAll();
    setTab("invoices");
  }

  function resetQuote() {
    state.quoteDraft = cloneInitialState().quoteDraft;
    persist("Quote reset");
    renderQuote();
  }

  function addDemoCustomer() {
    const id = `cus_atlas_${Date.now()}`;
    state.customers.unshift({
      id,
      name: "Atlas Energy Supplies",
      contact: "Leena",
      email: "leena@atlas.example",
      phone: "+971 54 000 9110",
      segment: "Energy supplies",
      terms: "Net 15",
      notes: "New lead with recurring spare parts demand."
    });
    persist("Demo customer added");
    renderAll();
  }

  function addDemoDeal() {
    state.deals.unshift({
      id: `deal_${Date.now()}`,
      customerId: state.customers[0].id,
      title: "Generator parts replenishment",
      value: 88500,
      stage: "lead",
      owner: "Dhiraj",
      next: "Validate supplier cost"
    });
    persist("Demo deal added");
    renderAll();
  }

  function resetDemoData() {
    storage.clear();
    state = cloneInitialState();
    storage.save(state);
    renderAll();
    clearCustomerForm();
    clearDealForm();
    clearInvoiceForm();
    generateFollowup("INV-1048");
    showToast("Demo data reset");
  }

  function renderAll() {
    renderWorkspaceInfo();
    renderDashboard();
    renderCustomers();
    renderPipeline();
    renderQuote();
    renderRecordSelects();
    renderInvoices();
    renderInsights();
    renderSettings();
  }

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });

  document.querySelectorAll("[data-tab-shortcut]").forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tabShortcut));
  });

  document.getElementById("save-state").addEventListener("click", () => persist("Workspace saved"));
  document.getElementById("refresh-work").addEventListener("click", () => {
    renderDashboard();
    showToast("Money moves refreshed");
  });

  document.getElementById("record-payment").addEventListener("click", () => {
    const openInvoice = state.invoices.find((invoice) => invoice.status !== "paid");
    if (openInvoice) markInvoicePaid(openInvoice.id);
  });

  document.getElementById("risk-strip").addEventListener("click", (event) => {
    const invoiceId = event.target.dataset.trackAction;
    if (invoiceId) trackCollectionAction(invoiceId);
    const actionId = event.target.dataset.escalateAction;
    if (actionId) escalateCollectionAction(actionId);
    const assignActionId = event.target.dataset.assignAction;
    if (assignActionId) assignCollectionAction(assignActionId);
    const digestOwner = event.target.dataset.digestOwner;
    if (digestOwner) createOwnerDigest(digestOwner);
    const queueDigestOwner = event.target.dataset.queueDigestOwner;
    if (queueDigestOwner) queueOwnerDigest(queueDigestOwner);
    const approveDigestOwner = event.target.dataset.approveDigestOwner;
    if (approveDigestOwner) approveOwnerDigest(approveDigestOwner);
    const rejectDigestOwner = event.target.dataset.rejectDigestOwner;
    if (rejectDigestOwner) rejectOwnerDigest(rejectDigestOwner);
    const scheduleDigestOwner = event.target.dataset.scheduleDigestOwner;
    if (scheduleDigestOwner) saveOwnerDigestSchedule(scheduleDigestOwner);
    const runDigestScheduleOwner = event.target.dataset.runDigestScheduleOwner;
    if (runDigestScheduleOwner) runOwnerDigestSchedule(runDigestScheduleOwner);
  });

  document.getElementById("add-customer").addEventListener("click", addDemoCustomer);
  document.getElementById("add-deal").addEventListener("click", addDemoDeal);
  document.getElementById("customer-form").addEventListener("submit", saveCustomer);
  document.getElementById("deal-form").addEventListener("submit", saveDeal);
  document.getElementById("invoice-form").addEventListener("submit", saveInvoice);
  document.getElementById("workspace-form").addEventListener("submit", saveWorkspace);
  document.getElementById("clear-customer-form").addEventListener("click", clearCustomerForm);
  document.getElementById("clear-deal-form").addEventListener("click", clearDealForm);
  document.getElementById("clear-invoice-form").addEventListener("click", clearInvoiceForm);
  document.getElementById("export-workspace").addEventListener("click", exportWorkspace);
  document.getElementById("import-workspace").addEventListener("click", () => {
    document.getElementById("workspace-import-file").click();
  });
  document.getElementById("workspace-import-file").addEventListener("change", (event) => {
    importWorkspace(event.target.files[0]);
    event.target.value = "";
  });
  document.getElementById("export-customers").addEventListener("click", exportCustomersCsv);
  document.getElementById("export-deals").addEventListener("click", exportDealsCsv);
  document.getElementById("export-invoices").addEventListener("click", exportInvoicesCsv);
  document.getElementById("open-github-pages").addEventListener("click", () => {
    window.open("https://dhirajnyse.github.io/Collectra/", "_blank", "noopener");
  });
  document.getElementById("reset-demo-settings").addEventListener("click", resetDemoData);

  document.getElementById("customer-grid").addEventListener("click", (event) => {
    if (event.target.dataset.customerEdit) {
      editCustomer(event.target.dataset.customerEdit);
      return;
    }
    const customerId = event.target.dataset.customerQuote;
    if (!customerId) return;
    const customer = customerById(customerId);
    state.quoteDraft.customerId = customerId;
    state.quoteDraft.terms = customer.terms;
    persist();
    renderQuote();
    setTab("quotes");
  });

  document.getElementById("line-items").addEventListener("input", (event) => {
    const index = Number(event.target.dataset.line);
    const field = event.target.dataset.field;
    if (!Number.isInteger(index) || !field) return;
    state.quoteDraft.lineItems[index][field] = field === "name" ? event.target.value : Number(event.target.value);
    persist();
    renderQuotePreview();
  });

  document.getElementById("line-items").addEventListener("click", (event) => {
    const index = Number(event.target.dataset.removeLine);
    if (!Number.isInteger(index)) return;
    state.quoteDraft.lineItems.splice(index, 1);
    persist("Line item removed");
    renderQuote();
  });

  document.getElementById("add-line").addEventListener("click", () => {
    state.quoteDraft.lineItems.push({ name: "New line item", qty: 1, price: 0 });
    persist("Line item added");
    renderQuote();
  });

  document.getElementById("quote-form").addEventListener("input", (event) => {
    if (event.target.id === "quote-title") state.quoteDraft.title = event.target.value;
    persist();
    renderQuotePreview();
  });

  document.getElementById("quote-form").addEventListener("change", (event) => {
    if (event.target.id === "quote-customer") {
      state.quoteDraft.customerId = event.target.value;
      state.quoteDraft.terms = customerById(event.target.value).terms;
    }
    if (event.target.id === "quote-terms") state.quoteDraft.terms = event.target.value;
    persist();
    renderQuote();
  });

  document.getElementById("reset-quote").addEventListener("click", resetQuote);
  document.getElementById("export-quote").addEventListener("click", exportQuotePdf);
  document.getElementById("convert-invoice").addEventListener("click", convertQuoteToInvoice);

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".segment").forEach((segment) => segment.classList.remove("active"));
      button.classList.add("active");
      invoiceFilter = button.dataset.filter;
      renderInvoices();
    });
  });

  document.getElementById("invoice-table").addEventListener("click", (event) => {
    if (event.target.dataset.editInvoice) editInvoice(event.target.dataset.editInvoice);
    if (event.target.dataset.follow) generateFollowup(event.target.dataset.follow);
    if (event.target.dataset.paid) markInvoicePaid(event.target.dataset.paid);
    if (event.target.dataset.exportInvoice) exportInvoicePdf(event.target.dataset.exportInvoice);
  });

  document.getElementById("pipeline").addEventListener("click", (event) => {
    if (event.target.dataset.dealEdit) editDeal(event.target.dataset.dealEdit);
  });

  document.getElementById("generate-followup").addEventListener("click", () => {
    generateFollowup(document.getElementById("ai-invoice").value);
  });

  document.getElementById("reset-demo").addEventListener("click", resetDemoData);

  document.getElementById("global-search").addEventListener("input", (event) => {
    const value = event.target.value.trim().toLowerCase();
    if (!value) return;
    const invoice = state.invoices.find((item) => `${item.id} ${customerById(item.customerId).name}`.toLowerCase().includes(value));
    const deal = state.deals.find((item) => `${customerById(item.customerId).name} ${item.title}`.toLowerCase().includes(value));
    const customer = state.customers.find((item) => `${item.name} ${item.contact}`.toLowerCase().includes(value));
    if (invoice) setTab("invoices");
    else if (deal) setTab("deals");
    else if (customer) setTab("customers");
  });

  renderAll();
  clearCustomerForm();
  clearDealForm();
  clearInvoiceForm();
  generateFollowup("INV-1048");
  setTab("dashboard");
})();
