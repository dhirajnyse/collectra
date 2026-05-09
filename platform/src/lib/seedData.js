export const demoSeedBundle = {
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
    }
  ]
};
