window.CollectraData = (() => {
  const today = "2026-05-08";
  const appVersion = {
    version: "v3.9.0",
    label: "Provider token exchange foundation"
  };

  const initialState = {
    meta: {
      workspace: "Gulf trading demo",
      location: "Dubai, UAE",
      today,
      owner: "Dhiraj",
      industry: "B2B trading and import/export",
      currency: "AED",
      note: "Collectra helps quote-driven B2B teams turn commercial follow-up into collected cash.",
      updatedAt: ""
    },
    ownerProfiles: [
      {
        id: "owner_finance",
        label: "Finance owner",
        displayName: "Finance Control Desk",
        email: "finance@gulf-demo.example",
        phone: "+971 50 000 4401",
        role: "Collections lead",
        preferredChannel: "email",
        status: "active"
      },
      {
        id: "owner_sales",
        label: "Sales owner",
        displayName: "Sales Account Desk",
        email: "sales@gulf-demo.example",
        phone: "+971 50 000 4402",
        role: "Commercial follow-up",
        preferredChannel: "whatsapp",
        status: "active"
      },
      {
        id: "owner_ops",
        label: "Ops owner",
        displayName: "Operations Desk",
        email: "ops@gulf-demo.example",
        phone: "+971 50 000 4403",
        role: "Delivery coordination",
        preferredChannel: "manual",
        status: "active"
      },
      {
        id: "owner_dhiraj",
        label: "Dhiraj",
        displayName: "Dhiraj",
        email: "dhiraj@gulf-demo.example",
        phone: "+971 50 000 4404",
        role: "Workspace owner",
        preferredChannel: "email",
        status: "active"
      }
    ],
    customers: [
      {
        id: "cus_alnoor",
        name: "Al Noor Components LLC",
        contact: "Faisal",
        email: "faisal@alnoor.example",
        phone: "+971 50 000 1204",
        segment: "Industrial trading",
        terms: "50% advance, 50% before delivery",
        notes: "Sensitive to landed cost changes."
      },
      {
        id: "cus_meridian",
        name: "Meridian Food Packaging",
        contact: "Rami",
        email: "rami@meridian.example",
        phone: "+971 55 000 8421",
        segment: "Packaging",
        terms: "Net 15",
        notes: "Good account, but payments drift after month end."
      },
      {
        id: "cus_crescent",
        name: "Crescent Marine Services",
        contact: "Sana",
        email: "sana@crescent.example",
        phone: "+971 52 000 3391",
        segment: "Marine services",
        terms: "Net 30",
        notes: "Often asks for spare parts bundles and tender pricing."
      },
      {
        id: "cus_gulfpack",
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
        id: "playbook_alnoor",
        customerId: "cus_alnoor",
        name: "Advance payment follow-up",
        paymentBehavior: "reliable",
        preferredChannel: "email",
        reminderTone: "friendly",
        escalationPolicy: "standard",
        riskWeight: -4,
        daysBeforeDue: 5,
        notes: "Confirm landed cost and payment split before due date.",
        status: "active"
      },
      {
        id: "playbook_meridian",
        customerId: "cus_meridian",
        name: "Month-end drift recovery",
        paymentBehavior: "slow_payer",
        preferredChannel: "phone",
        reminderTone: "firm",
        escalationPolicy: "owner_review",
        riskWeight: 14,
        daysBeforeDue: 2,
        notes: "Call before month-end and ask for exact payment date.",
        status: "active"
      },
      {
        id: "playbook_crescent",
        customerId: "cus_crescent",
        name: "Tender documentation path",
        paymentBehavior: "dispute_prone",
        preferredChannel: "email",
        reminderTone: "firm",
        escalationPolicy: "high_touch",
        riskWeight: 10,
        daysBeforeDue: 4,
        notes: "Attach delivery and tender references before asking for payment.",
        status: "active"
      },
      {
        id: "playbook_gulfpack",
        customerId: "cus_gulfpack",
        name: "Fast approval path",
        paymentBehavior: "reliable",
        preferredChannel: "whatsapp",
        reminderTone: "friendly",
        escalationPolicy: "standard",
        riskWeight: -2,
        daysBeforeDue: 3,
        notes: "Use concise WhatsApp reminder with delivery date.",
        status: "active"
      }
    ],
    accountingConnections: [
      {
        id: "acct_zoho",
        provider: "zoho_books",
        name: "Zoho Books sandbox",
        status: "sandbox",
        syncDirection: "import_payments",
        defaultCurrency: "AED",
        lastSyncAt: "2026-05-08T08:00:00.000Z",
        nextSyncAt: "2026-05-10T08:00:00.000Z",
        objects: ["customers", "invoices", "payments"]
      }
    ],
    accountingSyncRuns: [
      {
        id: "sync_1001",
        connectionId: "acct_zoho",
        runType: "dry_run",
        status: "completed",
        startedAt: "2026-05-08T08:00:00.000Z",
        completedAt: "2026-05-08T08:02:00.000Z",
        recordsExamined: 5,
        recordsMatched: 4,
        recordsCreated: 0,
        recordsFailed: 1,
        summary: "Demo dry run matched four invoices and flagged one payment for review."
      },
      {
        id: "sync_1002",
        connectionId: "acct_zoho",
        runType: "manual",
        status: "needs_review",
        startedAt: "2026-05-09T10:00:00.000Z",
        completedAt: "2026-05-09T10:02:00.000Z",
        recordsExamined: 3,
        recordsMatched: 2,
        recordsCreated: 0,
        recordsFailed: 1,
        summary: "One incoming payment needs finance review before invoice status changes."
      }
    ],
    providerOAuthRequests: [
      {
        id: "oauth_zoho_ready",
        integrationType: "accounting",
        provider: "zoho_books",
        accountingConnectionId: "acct_zoho",
        status: "authorized",
        requestedScopes: ["contacts.read", "invoices.read", "payments.read"],
        redirectUri: "https://collectra.example/oauth/callback/accounting/zoho_books",
        stateNonceHash: "demo_state_hash_zoho_books_20260509",
        codeChallengeMethod: "S256",
        codeChallengeHash: "demo_pkce_hash_zoho_books_20260509",
        expiresAt: "2026-05-09T12:15:00.000Z",
        authorizedAt: "2026-05-09T12:06:00.000Z",
        tokenStorage: "server_only",
        callbackStatus: "authorized",
        credentialVault: "active"
      },
      {
        id: "oauth_lean_draft",
        integrationType: "bank",
        provider: "lean",
        bankAccountId: "bank_operating_aed",
        status: "draft",
        requestedScopes: ["accounts.read", "transactions.read"],
        redirectUri: "https://collectra.example/oauth/callback/bank/lean",
        stateNonceHash: "demo_state_hash_lean_20260509",
        codeChallengeMethod: "S256",
        codeChallengeHash: "demo_pkce_hash_lean_20260509",
        expiresAt: "2026-05-09T12:15:00.000Z",
        tokenStorage: "server_only"
      }
    ],
    providerOAuthCallbackEvents: [
      {
        id: "oauth_callback_zoho_authorized",
        providerOAuthRequestId: "oauth_zoho_ready",
        integrationType: "accounting",
        provider: "zoho_books",
        status: "authorized",
        stateNonceHash: "demo_state_hash_zoho_books_20260509",
        authorizationCodeHash: "demo_authorization_code_hash_zoho_books_20260509",
        receivedAt: "2026-05-09T12:05:00.000Z",
        rawAuthorizationCodeStored: false,
        rawTokensStored: false,
        tokenExchange: "vaulted"
      }
    ],
    providerCredentialVault: [
      {
        id: "credential_vault_zoho_active",
        providerOAuthRequestId: "oauth_zoho_ready",
        providerOAuthCallbackEventId: "oauth_callback_zoho_authorized",
        accountingConnectionId: "acct_zoho",
        integrationType: "accounting",
        provider: "zoho_books",
        status: "active",
        credentialRef: "vault://collectra/demo/zoho_books/gulf_trading",
        tokenFamilyHash: "demo_token_family_hash_zoho_books_20260509",
        encryptionKeyVersion: "edge-vault-demo-v1",
        scopes: ["contacts.read", "invoices.read", "payments.read"],
        tokenExpiresAt: "2026-05-09T13:01:00.000Z",
        lastRefreshedAt: "2026-05-09T12:06:00.000Z",
        rotationDueAt: "2026-05-09T12:51:00.000Z",
        rawTokensStoredInWorkspaceRows: false,
        ciphertextExposedToBrowser: false
      }
    ],
    providerTokenExchangeRuns: [
      {
        id: "token_exchange_zoho_vaulted",
        providerOAuthRequestId: "oauth_zoho_ready",
        providerOAuthCallbackEventId: "oauth_callback_zoho_authorized",
        providerCredentialVaultId: "credential_vault_zoho_active",
        integrationType: "accounting",
        provider: "zoho_books",
        exchangeMode: "authorization_code",
        status: "vaulted",
        authorizationCodeHash: "demo_authorization_code_hash_zoho_books_20260509",
        codeVerifierHash: "demo_code_verifier_hash_zoho_books_20260509",
        tokenResponseHash: "demo_token_response_hash_zoho_books_20260509",
        tokenExpiresAt: "2026-05-09T13:01:00.000Z",
        startedAt: "2026-05-09T12:06:00.000Z",
        completedAt: "2026-05-09T12:07:00.000Z",
        rawAuthorizationCodeStored: false,
        rawTokensStored: false,
        vaultWriteRequiredBeforeProviderExchange: true
      }
    ],
    bankAccounts: [
      {
        id: "bank_operating_aed",
        name: "AED operating account",
        bankName: "Emirates NBD",
        accountMask: "**** 4821",
        currency: "AED",
        status: "active",
        lastImportAt: "2026-05-09T11:00:00.000Z"
      }
    ],
    bankTransactions: [
      {
        id: "txn_meridian_1048",
        bankAccountId: "bank_operating_aed",
        date: "2026-05-09",
        postedAt: "2026-05-09T10:05:00.000Z",
        description: "Incoming transfer INV-1048 Meridian",
        counterparty: "Meridian Food Packaging",
        reference: "BNK-2026-0509-001",
        direction: "credit",
        amount: 54000,
        currency: "AED",
        status: "needs_review"
      },
      {
        id: "txn_gulfpack_1052",
        bankAccountId: "bank_operating_aed",
        date: "2026-05-10",
        postedAt: "2026-05-09T10:18:00.000Z",
        description: "Partial incoming transfer GulfPack INV-1052",
        counterparty: "GulfPack Materials",
        reference: "BNK-2026-0509-002",
        direction: "credit",
        amount: 30000,
        currency: "AED",
        status: "imported"
      },
      {
        id: "txn_alnoor_overpay",
        bankAccountId: "bank_operating_aed",
        date: "2026-05-10",
        postedAt: "2026-05-09T10:22:00.000Z",
        description: "Overpayment Al Noor INV-1057",
        counterparty: "Al Noor Components LLC",
        reference: "BNK-2026-0509-003",
        direction: "credit",
        amount: 72000,
        currency: "AED",
        status: "imported"
      },
      {
        id: "txn_crescent_split",
        bankAccountId: "bank_operating_aed",
        date: "2026-05-10",
        postedAt: "2026-05-09T10:22:30.000Z",
        description: "Combined payment Crescent INV-1064 INV-1065",
        counterparty: "Crescent Marine Services",
        reference: "BNK-2026-0509-004",
        direction: "credit",
        amount: 70000,
        currency: "AED",
        status: "needs_review"
      },
      {
        id: "txn_alnoor_advance",
        bankAccountId: "bank_operating_aed",
        date: "2026-05-10",
        postedAt: "2026-05-09T10:25:00.000Z",
        description: "Advance payment Al Noor project",
        counterparty: "Al Noor Components LLC",
        reference: "BNK-2026-0509-005",
        direction: "credit",
        amount: 128000,
        currency: "AED",
        status: "needs_review"
      }
    ],
    paymentMatchSuggestions: [
      {
        id: "match_meridian_1048",
        bankTransactionId: "txn_meridian_1048",
        invoiceId: "INV-1048",
        customerId: "cus_meridian",
        confidence: 94,
        status: "suggested",
        reason: "Exact amount and invoice number found in bank description.",
        reviewNote: "Finance should approve before marking INV-1048 paid."
      },
      {
        id: "match_gulfpack_1052",
        bankTransactionId: "txn_gulfpack_1052",
        invoiceId: "INV-1052",
        customerId: "cus_gulfpack",
        confidence: 88,
        status: "suggested",
        reason: "Invoice reference and customer name match, but amount is a partial remittance.",
        reviewNote: "Approve as partial payment and keep the remaining balance open."
      },
      {
        id: "match_alnoor_1057_overpay",
        bankTransactionId: "txn_alnoor_overpay",
        invoiceId: "INV-1057",
        customerId: "cus_alnoor",
        confidence: 83,
        status: "suggested",
        reason: "Invoice reference and customer match, with extra cash above the open balance.",
        reviewNote: "Approve the invoice amount and keep the excess as customer credit."
      },
      {
        id: "match_crescent_split",
        bankTransactionId: "txn_crescent_split",
        invoiceId: null,
        customerId: "cus_crescent",
        confidence: 91,
        status: "suggested",
        reason: "Combined customer remittance maps cleanly to INV-1064 and INV-1065.",
        reviewNote: "Approve as a split payment across both Crescent invoices."
      },
      {
        id: "match_alnoor_advance",
        bankTransactionId: "txn_alnoor_advance",
        invoiceId: null,
        customerId: "cus_alnoor",
        confidence: 62,
        status: "needs_review",
        reason: "Amount matches open deal value but no invoice exists yet.",
        reviewNote: "Review as possible advance payment before creating allocation."
      }
    ],
    paymentMatchSplitLines: [
      {
        id: "split_crescent_1064",
        matchId: "match_crescent_split",
        invoiceId: "INV-1064",
        customerId: "cus_crescent",
        lineOrder: 1,
        amount: 32000,
        status: "suggested"
      },
      {
        id: "split_crescent_1065",
        matchId: "match_crescent_split",
        invoiceId: "INV-1065",
        customerId: "cus_crescent",
        lineOrder: 2,
        amount: 38000,
        status: "suggested"
      }
    ],
    paymentAllocations: [],
    paymentAllocationLines: [],
    customerPaymentCredits: [],
    deals: [
      {
        id: "deal_1001",
        customerId: "cus_alnoor",
        title: "Industrial valve supply",
        value: 128000,
        stage: "quoted",
        owner: "Dhiraj",
        next: "Follow up on revised landed cost"
      },
      {
        id: "deal_1002",
        customerId: "cus_meridian",
        title: "Monthly packaging contract",
        value: 94000,
        stage: "negotiation",
        owner: "Sales",
        next: "Send final payment terms"
      },
      {
        id: "deal_1003",
        customerId: "cus_crescent",
        title: "Spare parts tender",
        value: 216000,
        stage: "lead",
        owner: "Ops",
        next: "Prepare first quote"
      },
      {
        id: "deal_1004",
        customerId: "cus_gulfpack",
        title: "Warehouse replenishment",
        value: 76000,
        stage: "won",
        owner: "Finance",
        next: "Raise invoice"
      }
    ],
    invoices: [
      {
        id: "INV-1048",
        customerId: "cus_meridian",
        amount: 54000,
        due: "2026-05-02",
        status: "overdue"
      },
      {
        id: "INV-1052",
        customerId: "cus_gulfpack",
        amount: 76000,
        due: "2026-05-14",
        status: "due"
      },
      {
        id: "INV-1057",
        customerId: "cus_alnoor",
        amount: 64000,
        due: "2026-05-24",
        status: "open"
      },
      {
        id: "INV-1033",
        customerId: "cus_crescent",
        amount: 42000,
        due: "2026-04-21",
        status: "paid"
      },
      {
        id: "INV-1061",
        customerId: "cus_alnoor",
        amount: 118000,
        due: "2026-05-29",
        status: "open"
      },
      {
        id: "INV-1064",
        customerId: "cus_crescent",
        amount: 32000,
        due: "2026-05-18",
        status: "due"
      },
      {
        id: "INV-1065",
        customerId: "cus_crescent",
        amount: 38000,
        due: "2026-05-27",
        status: "open"
      }
    ],
    quoteDraft: {
      customerId: "cus_alnoor",
      title: "Industrial valve supply",
      terms: "50% advance, 50% before delivery",
      lineItems: [
        { name: "Industrial valve set", qty: 10, price: 8400 },
        { name: "Inspection and packing", qty: 1, price: 6500 },
        { name: "Local delivery", qty: 1, price: 3500 }
      ]
    },
    collectionActions: [],
    ownerDigests: [],
    ownerDigestSchedules: []
  };

  const stages = [
    { id: "lead", label: "New lead" },
    { id: "quoted", label: "Quoted" },
    { id: "negotiation", label: "Negotiation" },
    { id: "won", label: "Won" }
  ];

  const titleMap = {
    dashboard: "Cash command center",
    customers: "Customer database",
    deals: "Deal pipeline",
    quotes: "Quote builder",
    invoices: "Invoice control board",
    desk: "AI follow-up desk",
    settings: "Workspace settings"
  };

  function cloneInitialState() {
    return JSON.parse(JSON.stringify(initialState));
  }

  return {
    cloneInitialState,
    stages,
    titleMap,
    appVersion
  };
})();
