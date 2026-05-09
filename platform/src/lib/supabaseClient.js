import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function getSupabaseStatus() {
  if (supabase) {
    return {
      ready: true,
      label: "Connected",
      detail: "Environment credentials are loaded."
    };
  }

  return {
    ready: false,
    label: "Credentials needed",
    detail: "Create .env.local from .env.example after the Supabase project exists."
  };
}
