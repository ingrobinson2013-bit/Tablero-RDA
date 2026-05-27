import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn('[NODIA OPS] Supabase env vars not set — running in local-only mode');
}

export const supabase = url && key ? createClient(url, key) : null;
