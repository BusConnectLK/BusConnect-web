import { createClient } from '@/lib/supabase/server';

export interface PopularRoute {
  originId: string;
  destId: string;
  originName: string;
  destName: string;
  durationMinutes: number | null;
  tripCount: number;
  imageUrl: string | null;
}

interface RouteRow {
  origin_id: string;
  dest_id: string;
  image_url: string | null;
  origin: { name_en: string } | null;
  dest: { name_en: string } | null;
}

interface TripRow {
  depart_at: string;
  arrive_est: string | null;
  route: { origin_id: string; dest_id: string } | null;
}

type PairAgg = {
  originId: string;
  destId: string;
  originName: string;
  destName: string;
  durations: number[];
  count: number;
  imageUrl: string | null;
};

/**
 * "Popular routes" for the homepage. Every route admin has published is
 * guaranteed to appear — seeded straight from the shared route catalog —
 * regardless of whether any operator has scheduled a trip on it yet. Routes
 * WITH real upcoming trips (active operators only) are ranked above ones
 * without, by how many trips actually exist for that origin/destination
 * corridor; this is live marketplace data layered on top of the catalog, not
 * a fixed editorial list. Two different routes sharing the same endpoints
 * (different stop paths) merge into one corridor card, since that's how
 * passengers search (by From/To location, not by route).
 */
export async function listPopularRoutes(limit?: number): Promise<PopularRoute[]> {
  const supabase = await createClient();

  const byPair = new Map<string, PairAgg>();

  // 1. Seed with EVERY published route, so a brand-new route with zero trips
  //    still shows up.
  const { data: routes, error: routesErr } = await supabase
    .from('routes')
    .select(
      `origin_id, dest_id, image_url,
       origin:locations!routes_origin_id_fkey ( name_en ),
       dest:locations!routes_dest_id_fkey ( name_en )`,
    );
  if (routesErr) {
    console.error('listPopularRoutes: could not load the route catalog —', routesErr.message);
  }

  for (const r of (routes ?? []) as unknown as RouteRow[]) {
    const key = `${r.origin_id}|${r.dest_id}`;
    const existing = byPair.get(key);
    if (existing) {
      if (!existing.imageUrl && r.image_url) existing.imageUrl = r.image_url;
    } else {
      byPair.set(key, {
        originId: r.origin_id,
        destId: r.dest_id,
        originName: r.origin?.name_en ?? 'Unknown',
        destName: r.dest?.name_en ?? 'Unknown',
        durations: [],
        count: 0,
        imageUrl: r.image_url,
      });
    }
  }

  // 2. Layer in real upcoming-trip activity to rank corridors + estimate duration.
  const { data: trips, error: tripsErr } = await supabase
    .from('trips')
    .select(
      `depart_at, arrive_est,
       route:routes!inner ( origin_id, dest_id ),
       bus:buses!inner ( operator:operators!inner ( status ) )`,
    )
    .eq('bus.operator.status', 'active')
    .gte('depart_at', new Date().toISOString())
    .in('status', ['scheduled', 'boarding'])
    .limit(500);
  if (tripsErr) {
    console.error('listPopularRoutes: could not load trip activity —', tripsErr.message);
  }

  for (const row of (trips ?? []) as unknown as TripRow[]) {
    const route = row.route;
    if (!route) continue;
    const key = `${route.origin_id}|${route.dest_id}`;
    const duration = row.arrive_est
      ? Math.round((new Date(row.arrive_est).getTime() - new Date(row.depart_at).getTime()) / 60000)
      : null;

    // Should already be seeded from the catalog above; handle defensively
    // in case a trip somehow outlives its route record.
    const existing = byPair.get(key) ?? {
      originId: route.origin_id,
      destId: route.dest_id,
      originName: 'Unknown',
      destName: 'Unknown',
      durations: [],
      count: 0,
      imageUrl: null,
    };
    existing.count += 1;
    if (duration != null) existing.durations.push(duration);
    byPair.set(key, existing);
  }

  const sorted = [...byPair.values()].sort(
    (a, b) => b.count - a.count || a.originName.localeCompare(b.originName),
  );

  return (limit != null ? sorted.slice(0, limit) : sorted).map((r) => ({
    originId: r.originId,
    destId: r.destId,
    originName: r.originName,
    destName: r.destName,
    durationMinutes: r.durations.length > 0 ? Math.min(...r.durations) : null,
    tripCount: r.count,
    imageUrl: r.imageUrl,
  }));
}

export function formatDuration(minutes: number | null): string {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
