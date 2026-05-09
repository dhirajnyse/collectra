export const demoCustomers = [
  {
    id: "cus_alnoor",
    name: "Al Noor Components LLC",
    contact: "Faisal",
    balance: "AED 182,000",
    segment: "Industrial trading"
  },
  {
    id: "cus_meridian",
    name: "Meridian Food Packaging",
    contact: "Rami",
    balance: "AED 54,000",
    segment: "Packaging"
  },
  {
    id: "cus_gulfpack",
    name: "GulfPack Materials",
    contact: "Nadia",
    balance: "AED 76,000",
    segment: "Distribution"
  }
];

export const demoWorkflow = [
  {
    title: "1. Login",
    detail: "User signs in with Supabase magic link and lands in their workspace."
  },
  {
    title: "2. Load workspace",
    detail: "Workspace membership, customers, deals, invoices, and audit history load from secured tables."
  },
  {
    title: "3. Seed demo data",
    detail: "A fresh workspace can import the first demo customer, deal, and invoice bundle."
  },
  {
    title: "4. Collect cash",
    detail: "Finance marks payments, audit logs track changes, and the owner sees risk."
  }
];

export const demoAuditEvents = [
  {
    action: "invoice.marked_paid",
    actor: "Finance user",
    summary: "INV-1048 marked paid after customer confirmation"
  },
  {
    action: "customer.updated",
    actor: "Workspace admin",
    summary: "Payment terms changed for Meridian Food Packaging"
  },
  {
    action: "ai_followup.generated",
    actor: "Sales user",
    summary: "Draft collection reminder generated for overdue invoice"
  }
];

export const schemaChecklist = [
  "workspaces",
  "workspace_members",
  "customers",
  "deals",
  "invoices",
  "ai_followups",
  "audit_logs",
  "workspace bootstrap",
  "demo seed migration",
  "CRUD service helpers",
  "updated_at triggers",
  "performance indexes",
  "row level security policies"
];
