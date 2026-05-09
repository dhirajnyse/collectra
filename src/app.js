(() => {
  const { cloneInitialState, stages, titleMap, appVersion } = window.CollectraData;
  const storage = window.CollectraStorage;
  const pdf = window.CollectraPdf;

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
    next.quoteDraft.lineItems = Array.isArray(input?.quoteDraft?.lineItems)
      ? input.quoteDraft.lineItems
      : fallback.quoteDraft.lineItems;
    return next;
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
    if (invoice.status === "overdue" || daysUntil(invoice.due) < 0) return { label: "Overdue", className: "badge red" };
    if (invoice.status === "due" || daysUntil(invoice.due) <= 7) return { label: "Due soon", className: "badge gold" };
    return { label: "Open", className: "badge violet" };
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
        badge: "Overdue",
        badgeClass: "badge red"
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
      .slice(0, 3);
    document.getElementById("risk-strip").innerHTML = riskInvoices.map((invoice) => {
      const status = invoiceStatus(invoice);
      return `
        <article class="risk-card">
          <span class="${status.className}">${status.label}</span>
          <div>
            <strong>${customerById(invoice.customerId).name}</strong>
            <span>${invoice.id} due ${invoice.due}</span>
          </div>
          <strong>${money(invoice.amount)}</strong>
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
    const insights = [
      {
        title: "Late payment pattern",
        body: `${overdueCount} invoice${overdueCount === 1 ? "" : "s"} need follow-up before the week closes.`
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
    const days = daysUntil(invoice.due);
    const greeting = `Hi ${customer.contact},`;
    const amount = money(invoice.amount);
    const dueLine = days < 0
      ? `invoice ${invoice.id} for ${amount} is now ${Math.abs(days)} days overdue`
      : `invoice ${invoice.id} for ${amount} is due on ${invoice.due}`;
    const close = {
      polite: "Could you please confirm the expected payment date when you have a moment?",
      firm: "Please arrange payment or share a confirmed payment date today so we can keep the account current.",
      friendly: "Can you help me close the loop on this today?"
    }[tone];

    if (invoiceStatus(invoice).label === "Paid") {
      return `${greeting}\n\nThank you for settling ${invoice.id}. We have marked the payment as received on our side.\n\nRegards,\nCollectra Finance`;
    }
    return `${greeting}\n\nI hope you are well. A quick note that ${dueLine}.\n\n${close}\n\nRegards,\nCollectra Finance`;
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
