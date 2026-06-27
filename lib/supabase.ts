import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Server-only client. The service-role key bypasses RLS and must never reach the browser.
export const supabaseAdmin =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
