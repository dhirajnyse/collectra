window.CollectraData = (() => {
  const today = "2026-05-08";

  const initialState = {
    meta: {
      workspace: "Gulf trading demo",
      location: "Dubai, UAE",
      today
    },
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
    }
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
    desk: "AI follow-up desk"
  };

  function cloneInitialState() {
    return JSON.parse(JSON.stringify(initialState));
  }

  return {
    cloneInitialState,
    stages,
    titleMap
  };
})();
