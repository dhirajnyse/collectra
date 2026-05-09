export const version = import.meta.env.VITE_COLLECTRA_VERSION || "v1.3.0";

export const demoMetrics = [
  {
    label: "Platform",
    value: "React",
    note: "Workspace UI ready"
  },
  {
    label: "Database",
    value: "Supabase",
    note: "RPC seed path ready"
  },
  {
    label: "Auth",
    value: "Magic link",
    note: "Session detection ready"
  },
  {
    label: "AI",
    value: "Email",
    note: "Provider boundary"
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
    title: "Email provider foundation",
    detail: "Save sender settings, then send approved queued emails through a Supabase Edge Function."
  },
  {
    status: "After",
    title: "AI money operations",
    detail: "Add WhatsApp sending, summarize collection risk, and rank next actions."
  }
];
