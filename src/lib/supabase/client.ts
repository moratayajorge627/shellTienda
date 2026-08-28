import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xgyvbrnszhgkonomstsm.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhneXZicm5zemhna29ub21zdHNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NzI0MDEsImV4cCI6MjEwMzQ0ODQwMX0.e3K0nBxn763Ly5aTEHFWRvuJFdEiIF2K7f4BGZsFdd4'
  );
}
