// src/lib/supabaseClient.ts
// Run:  npm i @supabase/supabase-js
// Then add to your .env file:
//   VITE_SUPABASE_URL=https://<your-project>.supabase.co
//   VITE_SUPABASE_ANON_KEY=<your-anon-key>
//
// ── Supabase SQL Schema ────────────────────────────────────────────────────────
// Run the following in your Supabase SQL editor once:
//
// create table public.pets (
//   id          uuid primary key default gen_random_uuid(),
//   user_id     uuid references auth.users(id) on delete cascade not null,
//   pet_id      text        not null,
//   pet_name    text        not null,
//   logs        jsonb       not null default '[]'::jsonb,
//   created_at  timestamptz default now(),
//   updated_at  timestamptz default now(),
//   constraint  pets_user_id_key unique (user_id)   -- one pet per user
// );
//
// alter table public.pets enable row level security;
//
// create policy "Users manage their own pet"
//   on public.pets for all
//   using  (auth.uid() = user_id)
//   with check (auth.uid() = user_id);
//
// -- Auto-update updated_at on every row change
// create or replace function public.touch_updated_at()
// returns trigger language plpgsql as $$
// begin new.updated_at = now(); return new; end; $$;
//
// create trigger pets_touch_updated_at
//   before update on public.pets
//   for each row execute procedure public.touch_updated_at();
// ──────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

// Vite exposes env vars on import.meta.env at build time.
// TypeScript knows about these via vite/client in tsconfig.
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "[CodePet] Missing Supabase env vars. " +
    "Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file."
  );
}

// Export a single shared client — import this everywhere you need Supabase.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Supabase stores the session in localStorage automatically.
    // persistSession: true is the default, shown here for clarity.
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true, // Required for magic-link / OTP redirects
  },
});

// ── Convenience re-export of the Database row type ───────────────────────────
// Update this if you add columns to the pets table.
export interface PetRow {
  id:         string;
  user_id:    string;
  pet_id:     string;
  pet_name:   string;
  logs:       unknown[];     // JSONB — cast to HabitLog[] after fetching
  created_at: string;
  updated_at: string;
}