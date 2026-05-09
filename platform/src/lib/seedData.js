export const demoSeedBundle = {
  ownerProfiles: [
    {
      label: "Finance owner",
      display_name: "Finance Control Desk",
      work_email: "finance@gulf-demo.example",
      phone: "+971 50 000 4401",
      role_title: "Collections lead",
      preferred_channel: "email",
      status: "active",
      metadata: { seeded: true }
    },
    {
      label: "Sales owner",
      display_name: "Sales Account Desk",
      work_email: "sales@gulf-demo.example",
      phone: "+971 50 000 4402",
      role_title: "Commercial follow-up",
      preferred_channel: "whatsapp",
      status: "active",
      metadata: { seeded: true }
    },
    {
      label: "Ops owner",
      display_name: "Operations Desk",
      work_email: "ops@gulf-demo.example",
      phone: "+971 50 000 4403",
      role_title: "Delivery coordination",
      preferred_channel: "manual",
      status: "active",
      metadata: { seeded: true }
    },
    {
      label: "Dhiraj",
      display_name: "Dhiraj",
      work_email: "dhiraj@gulf-demo.example",
      phone: "+971 50 000 4404",
      role_title: "Workspace owner",
      preferred_channel: "email",
      status: "active",
      metadata: { seeded: true }
    }
  ],
  accountingConnections: [
    {
      key: "acct_zoho",
      provider: "zoho_books",
      connection_name: "Zoho Books sandbox",
      status: "sandbox",
      sync_direction: "import_payments",
      default_currency: "AED",
      last_sync_at: "2026-05-08T08:00:00.000Z",
      next_sync_at: "2026-05-10T08:00:00.000Z",
      metadata: {
        seeded: true,
        mode: "demo",
        supported_objects: ["customers", "invoices", "payments"]
      }
    }
  ],
  accountingSyncRuns: [
    {
      connectionKey: "acct_zoho",
      run_type: "dry_run",
      status: "completed",
      started_at: "2026-05-08T08:00:00.000Z",
      completed_at: "2026-05-08T08:02:00.000Z",
      records_examined: 5,
      records_matched: 4,
      records_created: 0,
      records_failed: 1,
      summary: "Demo dry run matched four invoices and flagged one payment for review.",
      metadata: { seeded: true, provider: "zoho_books" }
    },
    {
      connectionKey: "acct_zoho",
      run_type: "manual",
      status: "needs_review",
      started_at: "2026-05-09T10:00:00.000Z",
      completed_at: "2026-05-09T10:02:00.000Z",
      records_examined: 3,
      records_matched: 2,
      records_created: 0,
      records_failed: 1,
      summary: "One incoming payment needs finance review before invoice status changes.",
      metadata: { seeded: true, provider: "zoho_books" }
    }
  ],
  providerOAuthRequests: [
    {
      key: "oauth_zoho_ready",
      integration_type: "accounting",
      provider: "zoho_books",
      accountingConnectionKey: "acct_zoho",
      status: "authorized",
      requested_scopes: ["contacts.read", "invoices.read", "payments.read"],
      redirect_uri: "https://collectra.example/oauth/callback/accounting/zoho_books",
      state_nonce_hash: "demo_state_hash_zoho_books_20260509",
      code_challenge_method: "S256",
      code_challenge_hash: "demo_pkce_hash_zoho_books_20260509",
      expires_at: "2026-05-09T12:15:00.000Z",
      authorized_at: "2026-05-09T12:06:00.000Z",
      metadata: { seeded: true, token_storage: "server_only", mode: "demo_oauth_request", callback_status: "authorized", credential_vault: "active" }
    },
    {
      key: "oauth_lean_draft",
      integration_type: "bank",
      provider: "lean",
      bankAccountKey: "bank_operating_aed",
      status: "draft",
      requested_scopes: ["accounts.read", "transactions.read"],
      redirect_uri: "https://collectra.example/oauth/callback/bank/lean",
      state_nonce_hash: "demo_state_hash_lean_20260509",
      code_challenge_method: "S256",
      code_challenge_hash: "demo_pkce_hash_lean_20260509",
      expires_at: "2026-05-09T12:15:00.000Z",
      metadata: { seeded: true, token_storage: "server_only", mode: "demo_oauth_request" }
    }
  ],
  providerOAuthCallbackEvents: [
    {
      key: "oauth_callback_zoho_authorized",
      providerOAuthRequestKey: "oauth_zoho_ready",
      integration_type: "accounting",
      provider: "zoho_books",
      status: "authorized",
      state_nonce_hash: "demo_state_hash_zoho_books_20260509",
      authorization_code_hash: "demo_authorization_code_hash_zoho_books_20260509",
      received_at: "2026-05-09T12:05:00.000Z",
      metadata: {
        seeded: true,
        raw_authorization_code_stored: false,
        raw_tokens_stored: false,
        token_exchange: "vaulted",
        token_storage: "server_only"
      }
    }
  ],
  providerCredentialVault: [
    {
      key: "credential_vault_zoho_active",
      providerOAuthRequestKey: "oauth_zoho_ready",
      providerOAuthCallbackKey: "oauth_callback_zoho_authorized",
      accountingConnectionKey: "acct_zoho",
      integration_type: "accounting",
      provider: "zoho_books",
      status: "active",
      credential_ref: "vault://collectra/demo/zoho_books/gulf_trading",
      token_family_hash: "demo_token_family_hash_zoho_books_20260509",
      encryption_key_version: "edge-vault-demo-v1",
      scopes: ["contacts.read", "invoices.read", "payments.read"],
      token_expires_at: "2026-05-09T13:01:00.000Z",
      last_refreshed_at: "2026-05-09T12:06:00.000Z",
      rotation_due_at: "2026-05-09T12:51:00.000Z",
      metadata: {
        seeded: true,
        storage_mode: "server_vault_reference",
        raw_tokens_stored_in_workspace_rows: false,
        ciphertext_exposed_to_browser: false
      }
    }
  ],
  providerTokenExchangeRuns: [
    {
      providerOAuthRequestKey: "oauth_zoho_ready",
      providerOAuthCallbackKey: "oauth_callback_zoho_authorized",
      providerCredentialKey: "credential_vault_zoho_active",
      integration_type: "accounting",
      provider: "zoho_books",
      exchange_mode: "authorization_code",
      status: "vaulted",
      authorization_code_hash: "demo_authorization_code_hash_zoho_books_20260509",
      code_verifier_hash: "demo_code_verifier_hash_zoho_books_20260509",
      token_response_hash: "demo_token_response_hash_zoho_books_20260509",
      token_expires_at: "2026-05-09T13:01:00.000Z",
      started_at: "2026-05-09T12:06:00.000Z",
      completed_at: "2026-05-09T12:07:00.000Z",
      metadata: {
        seeded: true,
        edge_function: "exchange-provider-token",
        raw_authorization_code_stored: false,
        raw_tokens_stored: false,
        vault_write_required_before_provider_exchange: true
      }
    }
  ],
  bankAccounts: [
    {
      key: "bank_operating_aed",
      account_name: "AED operating account",
      bank_name: "Emirates NBD",
      account_mask: "**** 4821",
      currency: "AED",
      status: "active",
      last_import_at: "2026-05-09T11:00:00.000Z",
      metadata: {
        seeded: true,
        mode: "demo",
        import_source: "bank_csv"
      }
    }
  ],
  bankTransactions: [
    {
      key: "txn_meridian_1048",
      bankAccountKey: "bank_operating_aed",
      transaction_date: "2026-05-09",
      posted_at: "2026-05-09T10:05:00.000Z",
      description: "Incoming transfer INV-1048 Meridian",
      counterparty: "Meridian Food Packaging",
      reference: "BNK-2026-0509-001",
      direction: "credit",
      amount: 54000,
      currency: "AED",
      status: "needs_review",
      raw_payload: { seeded: true, source: "bank_csv" }
    },
    {
      key: "txn_gulfpack_1052",
      bankAccountKey: "bank_operating_aed",
      transaction_date: "2026-05-10",
      posted_at: "2026-05-09T10:18:00.000Z",
      description: "Partial incoming transfer GulfPack INV-1052",
      counterparty: "GulfPack Materials",
      reference: "BNK-2026-0509-002",
      direction: "credit",
      amount: 30000,
      currency: "AED",
      status: "imported",
      raw_payload: { seeded: true, source: "bank_csv" }
    },
    {
      key: "txn_alnoor_overpay",
      bankAccountKey: "bank_operating_aed",
      transaction_date: "2026-05-10",
      posted_at: "2026-05-09T10:22:00.000Z",
      description: "Overpayment Al Noor INV-1057",
      counterparty: "Al Noor Components LLC",
      reference: "BNK-2026-0509-003",
      direction: "credit",
      amount: 72000,
      currency: "AED",
      status: "imported",
      raw_payload: { seeded: true, source: "bank_csv" }
    },
    {
      key: "txn_crescent_split",
      bankAccountKey: "bank_operating_aed",
      transaction_date: "2026-05-10",
      posted_at: "2026-05-09T10:22:30.000Z",
      description: "Combined payment Crescent INV-1064 INV-1065",
      counterparty: "Crescent Marine Services",
      reference: "BNK-2026-0509-004",
      direction: "credit",
      amount: 70000,
      currency: "AED",
      status: "needs_review",
      raw_payload: { seeded: true, source: "bank_csv", split_payment_candidate: true }
    },
    {
      key: "txn_alnoor_advance",
      bankAccountKey: "bank_operating_aed",
      transaction_date: "2026-05-10",
      posted_at: "2026-05-09T10:25:00.000Z",
      description: "Advance payment Al Noor project",
      counterparty: "Al Noor Components LLC",
      reference: "BNK-2026-0509-005",
      direction: "credit",
      amount: 128000,
      currency: "AED",
      status: "needs_review",
      raw_payload: { seeded: true, source: "bank_csv" }
    }
  ],
  paymentMatchSuggestions: [
    {
      bankTransactionKey: "txn_meridian_1048",
      invoiceNumber: "INV-1048",
      customerKey: "cus_meridian",
      confidence: 94,
      match_status: "suggested",
      match_reason: "Exact amount and invoice number found in bank description.",
      review_note: "Finance should approve before marking INV-1048 paid.",
      metadata: { seeded: true, signals: ["invoice_number", "amount", "customer_name"] }
    },
    {
      bankTransactionKey: "txn_gulfpack_1052",
      invoiceNumber: "INV-1052",
      customerKey: "cus_gulfpack",
      confidence: 88,
      match_status: "suggested",
      match_reason: "Invoice reference and customer name match, but amount is a partial remittance.",
      review_note: "Approve as partial payment and keep the remaining balance open.",
      metadata: { seeded: true, signals: ["invoice_number", "customer_name", "partial_amount"], partial_payment_candidate: true }
    },
    {
      bankTransactionKey: "txn_alnoor_overpay",
      invoiceNumber: "INV-1057",
      customerKey: "cus_alnoor",
      confidence: 83,
      match_status: "suggested",
      match_reason: "Invoice reference and customer match, with extra cash above the open balance.",
      review_note: "Approve the invoice amount and keep the excess as customer credit.",
      metadata: { seeded: true, signals: ["invoice_number", "customer_name", "overpayment_amount"], overpayment_candidate: true }
    },
    {
      key: "match_crescent_split",
      bankTransactionKey: "txn_crescent_split",
      invoiceNumber: null,
      customerKey: "cus_crescent",
      confidence: 91,
      match_status: "suggested",
      match_reason: "Combined customer remittance maps cleanly to INV-1064 and INV-1065.",
      review_note: "Approve as a split payment across both Crescent invoices.",
      metadata: { seeded: true, signals: ["customer_name", "two_invoice_total"], split_payment_candidate: true }
    },
    {
      bankTransactionKey: "txn_alnoor_advance",
      invoiceNumber: null,
      customerKey: "cus_alnoor",
      confidence: 62,
      match_status: "needs_review",
      match_reason: "Amount matches open deal value but no invoice exists yet.",
      review_note: "Review as possible advance payment before creating allocation.",
      metadata: { seeded: true, signals: ["customer_name", "deal_value"] }
    }
  ],
  paymentMatchSplitLines: [
    {
      matchKey: "match_crescent_split",
      invoiceNumber: "INV-1064",
      customerKey: "cus_crescent",
      line_order: 1,
      amount: 32000,
      status: "suggested",
      metadata: { seeded: true, invoice_number: "INV-1064" }
    },
    {
      matchKey: "match_crescent_split",
      invoiceNumber: "INV-1065",
      customerKey: "cus_crescent",
      line_order: 2,
      amount: 38000,
      status: "suggested",
      metadata: { seeded: true, invoice_number: "INV-1065" }
    }
  ],
  customers: [
    {
      key: "cus_alnoor",
      name: "Al Noor Components LLC",
      contact: "Faisal",
      email: "faisal@alnoor.example",
      phone: "+971 50 000 1204",
      segment: "Industrial trading",
      terms: "50% advance, 50% before delivery",
      notes: "Sensitive to landed cost changes."
    },
    {
      key: "cus_meridian",
      name: "Meridian Food Packaging",
      contact: "Rami",
      email: "rami@meridian.example",
      phone: "+971 55 000 8421",
      segment: "Packaging",
      terms: "Net 15",
      notes: "Good account, but payments drift after month end."
    },
    {
      key: "cus_crescent",
      name: "Crescent Marine Services",
      contact: "Sana",
      email: "sana@crescent.example",
      phone: "+971 52 000 3391",
      segment: "Marine services",
      terms: "Net 30",
      notes: "Often asks for spare parts bundles and tender pricing."
    },
    {
      key: "cus_gulfpack",
      name: "GulfPack Materials",
      contact: "Nadia",
      email: "nadia@gulfpack.example",
      phone: "+971 56 000 7730",
      segment: "Distribution",
      terms: "Due on receipt",
      notes: "Fast approval if quote has delivery dates."
    }
  ],
  customerPlaybooks: [
    {
      customerKey: "cus_alnoor",
      playbook_name: "Advance payment follow-up",
      payment_behavior: "reliable",
      preferred_channel: "email",
      reminder_tone: "friendly",
      escalation_policy: "standard",
      risk_weight: -4,
      days_before_due: 5,
      notes: "Confirm landed cost and payment split before due date.",
      metadata: { seeded: true }
    },
    {
      customerKey: "cus_meridian",
      playbook_name: "Month-end drift recovery",
      payment_behavior: "slow_payer",
      preferred_channel: "phone",
      reminder_tone: "firm",
      escalation_policy: "owner_review",
      risk_weight: 14,
      days_before_due: 2,
      notes: "Call before month-end and ask for exact payment date.",
      metadata: { seeded: true }
    },
    {
      customerKey: "cus_crescent",
      playbook_name: "Tender documentation path",
      payment_behavior: "dispute_prone",
      preferred_channel: "email",
      reminder_tone: "firm",
      escalation_policy: "high_touch",
      risk_weight: 10,
      days_before_due: 4,
      notes: "Attach delivery and tender references before asking for payment.",
      metadata: { seeded: true }
    },
    {
      customerKey: "cus_gulfpack",
      playbook_name: "Fast approval path",
      payment_behavior: "reliable",
      preferred_channel: "whatsapp",
      reminder_tone: "friendly",
      escalation_policy: "standard",
      risk_weight: -2,
      days_before_due: 3,
      notes: "Use concise WhatsApp reminder with delivery date.",
      metadata: { seeded: true }
    }
  ],
  deals: [
    {
      customerKey: "cus_alnoor",
      title: "Industrial valve supply",
      value: 128000,
      stage: "quoted",
      owner: "Dhiraj",
      next_action: "Follow up on revised landed cost"
    },
    {
      customerKey: "cus_meridian",
      title: "Monthly packaging contract",
      value: 94000,
      stage: "negotiation",
      owner: "Sales",
      next_action: "Send final payment terms"
    },
    {
      customerKey: "cus_crescent",
      title: "Spare parts tender",
      value: 216000,
      stage: "lead",
      owner: "Ops",
      next_action: "Prepare first quote"
    },
    {
      customerKey: "cus_gulfpack",
      title: "Warehouse replenishment",
      value: 76000,
      stage: "won",
      owner: "Finance",
      next_action: "Raise invoice"
    }
  ],
  invoices: [
    {
      customerKey: "cus_meridian",
      invoice_number: "INV-1048",
      amount: 54000,
      due_date: "2026-05-02",
      status: "overdue"
    },
    {
      customerKey: "cus_gulfpack",
      invoice_number: "INV-1052",
      amount: 76000,
      due_date: "2026-05-14",
      status: "due"
    },
    {
      customerKey: "cus_alnoor",
      invoice_number: "INV-1057",
      amount: 64000,
      due_date: "2026-05-24",
      status: "open"
    },
    {
      customerKey: "cus_crescent",
      invoice_number: "INV-1033",
      amount: 42000,
      due_date: "2026-04-21",
      status: "paid"
    },
    {
      customerKey: "cus_alnoor",
      invoice_number: "INV-1061",
      amount: 118000,
      due_date: "2026-05-29",
      status: "open"
    },
    {
      customerKey: "cus_crescent",
      invoice_number: "INV-1064",
      amount: 32000,
      due_date: "2026-05-18",
      status: "due"
    },
    {
      customerKey: "cus_crescent",
      invoice_number: "INV-1065",
      amount: 38000,
      due_date: "2026-05-27",
      status: "open"
    }
  ]
};
