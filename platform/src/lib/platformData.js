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
  },
  {
    title: "9. Retry recovery",
    detail: "A protected automation function requeues recoverable failed messages with retry limits and event history."
  },
  {
    title: "10. Score collection risk",
    detail: "Open invoices are ranked by due date, amount, send status, retries, and follow-up history."
  },
  {
    title: "11. Recommend next action",
    detail: "Risk signals become call, email, review, retry, draft, or watchlist recommendations."
  },
  {
    title: "12. Draft owner digest",
    detail: "Open actions are grouped by owner into audited briefing drafts before any notification is sent."
  },
  {
    title: "13. Queue digest",
    detail: "Approved owner digests enter outbound review before scheduled delivery is connected."
  },
  {
    title: "14. Schedule digest",
    detail: "Owner cadence and recipient rules are saved before any background runner is enabled."
  },
  {
    title: "15. Run schedules",
    detail: "A protected automation function turns due schedules into queued digest review items."
  },
  {
    title: "16. Approve delivery",
    detail: "Owner directory profiles route digest recipients while review states gate provider delivery."
  },
  {
    title: "17. Apply playbooks",
    detail: "Customer collection playbooks shape AI draft tone, preferred channels, risk weights, and owner review paths."
  },
  {
    title: "18. Stage accounting sync",
    detail: "Accounting connection metadata and sync-run reviews prepare payment imports without exposing provider secrets."
  },
  {
    title: "19. Review bank matches",
    detail: "Imported bank transactions produce payment match suggestions before any invoice is marked paid."
  },
  {
    title: "20. Approve payment allocation",
    detail: "Finance accepts a match, posts an allocation, updates the invoice, and writes an audit record."
  },
  {
    title: "21. Preserve customer credits",
    detail: "Overpaid invoice matches create open customer credits that stay linked to the source allocation."
  },
  {
    title: "22. Split multi-invoice receipts",
    detail: "One bank receipt can be approved into separate invoice allocation lines with one reversible audit trail."
  },
  {
    title: "23. Prepare provider OAuth",
    detail: "Accounting and bank connection requests store scopes, callback paths, and PKCE/state hashes without browser-visible tokens."
  },
  {
    title: "24. Receive OAuth callback",
    detail: "Provider redirects land in an Edge Function that validates state and records only hashes/status events before token exchange."
  },
  {
    title: "25. Stage credential vault",
    detail: "Provider credential rows keep server vault references, token-family hashes, key versions, expiry, and rotation timing without browser-visible tokens."
  },
  {
    title: "26. Exchange provider token",
    detail: "A server-only Edge Function records token exchange attempts and writes provider tokens only to a managed credential vault."
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
  "outbound_message_events",
  "collection_risk_scores view",
  "next-best-action rules",
  "audit_logs",
  "generate-followup edge function",
  "send-queued-email edge function",
  "send-queued-whatsapp edge function",
  "receive-resend-webhook edge function",
  "receive-whatsapp-webhook edge function",
  "run-message-retries edge function",
  "run-owner-digest-schedules edge function",
  "workspace_owner_profiles",
  "customer_collection_playbooks",
  "workspace_accounting_connections",
  "accounting_sync_runs",
  "provider_oauth_requests",
  "provider_oauth_callback_events",
  "provider_credential_vault",
  "provider_token_exchange_runs",
  "receive-provider-oauth-callback edge function",
  "exchange-provider-token edge function",
  "workspace_bank_accounts",
  "bank_transactions",
  "payment_match_suggestions",
  "payment_match_split_lines",
  "payment_allocations",
  "payment_allocation_lines",
  "customer_payment_credits",
  "outbound review status",
  "send queue RLS policies",
  "workspace_email_settings",
  "workspace_whatsapp_settings",
  "delivery status columns",
  "owner_digest_runs",
  "digest approval queue",
  "owner_digest_schedules",
  "workspace bootstrap",
  "demo seed migration",
  "transactional seed RPC",
  "CRUD service helpers",
  "updated_at triggers",
  "performance indexes",
  "row level security policies"
];
