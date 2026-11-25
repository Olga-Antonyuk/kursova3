
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL || ""
)
  .trim()
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/+$/, "");

const supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
).trim();

export const configured = Boolean(
  supabaseUrl && supabaseKey
);

export const supabase = configured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
