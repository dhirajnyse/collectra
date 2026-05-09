export const version = import.meta.env.VITE_COLLECTRA_VERSION || "v0.7.0";

export const demoMetrics = [
  {
    label: "Platform",
    value: "React",
    note: "Vite build ready"
  },
  {
    label: "Database",
    value: "Supabase",
    note: "RLS policies drafted"
  },
  {
    label: "Auth",
    value: "Magic link",
    note: "Service helpers ready"
  },
  {
    label: "AI",
    value: "Queued",
    note: "Follow-up agent after backend"
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
    detail: "Create the project, add credentials, run the schema, and replace localStorage with database reads and writes."
  },
  {
    status: "Now",
    title: "Authentication and workspaces",
    detail: "Use magic-link login, workspace membership, and owner/admin roles."
  },
  {
    status: "After",
    title: "AI money operations",
    detail: "Generate follow-ups, summarize collection risk, and recommend the owner's next best action."
  }
];
