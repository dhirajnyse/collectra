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
    detail: "A fresh workspace can import the first demo customer, deal, and invoice bundle through the database RPC."
  },
  {
    title: "4. Collect cash",
    detail: "Finance marks payments, audit logs track changes, and the owner sees risk."
  },
  {
    title: "5. Draft follow-up",
    detail: "The Edge Function validates workspace access before generating and saving an AI draft."
  },
  {
    title: "6. Queue send",
    detail: "Approved drafts enter an outbound queue for email, WhatsApp, or manual follow-up."
  },
  {
    title: "7. Send email",
    detail: "The send Edge Function validates membership and provider settings before calling Resend."
  },
  {
    title: "8. Send WhatsApp",
    detail: "The send Edge Function validates membership and business phone settings before calling WhatsApp Cloud API."
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
  "outbound_messages",
  "audit_logs",
  "generate-followup edge function",
  "send-queued-email edge function",
  "send-queued-whatsapp edge function",
  "send queue RLS policies",
  "workspace_email_settings",
  "workspace_whatsapp_settings",
  "workspace bootstrap",
  "demo seed migration",
  "transactional seed RPC",
  "CRUD service helpers",
  "updated_at triggers",
  "performance indexes",
  "row level security policies"
];
