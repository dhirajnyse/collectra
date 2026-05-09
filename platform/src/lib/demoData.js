export const version = import.meta.env.VITE_COLLECTRA_VERSION || "v3.9.0";

export const demoMetrics = [
  {
    label: "Platform",
    value: "React",
    note: "Workspace UI ready"
  },
  {
    label: "Database",
    value: "Supabase",
    note: "Exchange runs ready"
  },
  {
    label: "Auth",
    value: "Magic link",
    note: "Session detection ready"
  },
  {
    label: "AI",
    value: "Review",
    note: "Playbook-aware drafts"
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
    detail: "Create the project, add credentials, run the schema, and verify the pilot checklist."
  },
  {
    status: "Now",
    title: "Provider token exchange foundation",
    detail: "Record server-side token exchange runs and vault handoffs without storing raw authorization codes or provider tokens in workspace rows."
  },
  {
    status: "After",
    title: "AI money operations",
    detail: "Connect live provider vault storage, scheduled money operations, and richer exception workflows."
  }
];
