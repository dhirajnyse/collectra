export const version = import.meta.env.VITE_COLLECTRA_VERSION || "v0.9.0";

export const demoMetrics = [
  {
    label: "Platform",
    value: "React",
    note: "Workspace UI ready"
  },
  {
    label: "Database",
    value: "Supabase",
    note: "CRUD and seed helpers"
  },
  {
    label: "Auth",
    value: "Magic link",
    note: "Session detection ready"
  },
  {
    label: "AI",
    value: "Queued",
    note: "Follow-up agent next"
  }
];

export const roadmap = [
  {
    status: "Live",
    title: "Static demo stays live",
    detail: "Keep the GitHub Pages demo stable for testing while the platform layer is built."
  },
  {
    status: "Ready",
    title: "Supabase connection",
    detail: "Create the project, add credentials, run the schema, and load the first workspace bundle."
  },
  {
    status: "Now",
    title: "Data migration foundation",
    detail: "Seed demo customers, deals, and invoices into Supabase, then audit payment updates."
  },
  {
    status: "After",
    title: "AI money operations",
    detail: "Generate follow-ups, summarize collection risk, and recommend the owner's next best action."
  }
];
