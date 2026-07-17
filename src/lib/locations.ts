import { createClient } from '@/lib/supabase/server';

export interface Location {
  id: string;
  name_en: string;
  name_si: string | null;
  name_ta: string | null;
}

/**
 * Reads the location catalog directly from Supabase (public read under RLS —
 * see supabase/migrations/0003_rls.sql). This is a display read, so it
 * bypasses BusConnect-api per the read/write split in docs/PRODUCT_AND_TECH_PLAN.md §4.2.
 */
export async function listLocations(): Promise<Location[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('locations')
    .select('id, name_en, name_si, name_ta')
    .order('name_en');

  if (error) {
    // Expected on a fresh Supabase project before BusConnect-api's migrations
    // have been applied — degrade to an empty list rather than a 500 page.
    console.error('listLocations: falling back to empty list —', error.message);
    return [];
  }
  return data ?? [];
}
