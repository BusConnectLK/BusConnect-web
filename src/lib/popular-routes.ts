import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

export interface PopularRoute {
  originId: string;
  destId: string;
  originName: string;
  destName: string;
  durationMinutes: number | null;
  /** Total upcoming trips (any day) — used for popularity ranking. */
  tripCount: number;
  /** Trips departing today (Asia/Colombo calendar day) — what the card's "Today" badge shows. */
  todayCount: number;
  /** Calendar date (Asia/Colombo, yyyy-mm-dd) of the soonest upcoming trip, if any. */
  nextDateIso: string | null;
  imageUrl: string | null;
  minFare: number | null;
}

interface RouteRow {
  origin_id: string;
  dest_id: string;
  image_url: string | null;
  origin: { name_en: string } | null;
  dest: { name_en: string } | null;
}

/** One row of popular_route_activity() — see 0043_popular_route_activity.sql. */
interface ActivityRow {
  origin_id: string;
  dest_id: string;
  trip_count: number;
  today_count: number;
  next_date: string | null;
  min_duration_minutes: number | null;
  min_fare: number | null;
}

type PairAgg = {
  originId: string;
  destId: string;
  originName: string;
  destName: string;
  durationMinutes: number | null;
  count: number;
  todayCount: number;
  nextDateIso: string | null;
  imageUrl: string | null;
  minFare: number | null;
};

/**
 * "Popular routes" for the homepage. Every route admin has published is
 * guaranteed to appear — seeded straight from the shared route catalog —
 * regardless of whether any operator has scheduled a trip on it yet. Routes
 * WITH real upcoming trips (active operators only) are ranked above ones
 * without, by how many trips actually exist for that origin/destination
 * corridor; this is live marketplace data layered on top of the catalog, not
 * a fixed editorial list.
 *
 * Trip activity is counted by walking route_stops the same way
 * search_trips() does (see 0025_search_bus_images.sql / popular_route_
 * activity() in 0043), not by a trip's own route.origin_id/dest_id — a trip
 * on a "Nittambuwa -> Colombo" route that also stops at Maradana is
 * findable by searching "Nittambuwa -> Maradana", so it needs to count
 * toward that corridor's card too, or the two disagree.
 *
 * The underlying fetch+aggregation is cached across requests (see
 * `getAllPopularRoutes` below) since this data doesn't need per-request
 * freshness and re-running it on every page load added a real Supabase
 * round-trip to every request's TTFB.
 */
export async function listPopularRoutes(limit?: number): Promise<PopularRoute[]> {
  const all = await getAllPopularRoutes();
  return limit != null ? all.slice(0, limit) : all;
}

const getAllPopularRoutes = unstable_cache(
  async (): Promise<PopularRoute[]> => {
    const supabase = createPublicClient();
    const byPair = new Map<string, PairAgg>();

    // The route catalog and trip activity are independent reads — run them
    // concurrently instead of one after another to halve the round-trip cost.
    const [
      { data: routes, error: routesErr },
      { data: activity, error: activityErr },
    ] = await Promise.all([
      // 1. Seed with EVERY published route, so a brand-new route with zero
      //    trips still shows up.
      supabase
        .from('routes')
        .select(
          `origin_id, dest_id, image_url,
           origin:locations!routes_origin_id_fkey ( name_en ),
           dest:locations!routes_dest_id_fkey ( name_en )`,
        ),
      // 2. Real upcoming-trip activity per (from, to) location pair, to rank
      //    corridors + estimate duration/fare.
      supabase.rpc('popular_route_activity'),
    ]);
    if (routesErr) {
      console.error('listPopularRoutes: could not load the route catalog —', routesErr.message);
    }
    if (activityErr) {
      console.error('listPopularRoutes: could not load trip activity —', activityErr.message);
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
          durationMinutes: null,
          count: 0,
          todayCount: 0,
          nextDateIso: null,
          imageUrl: r.image_url,
          minFare: null,
        });
      }
    }

    for (const row of (activity ?? []) as unknown as ActivityRow[]) {
      const existing = byPair.get(`${row.origin_id}|${row.dest_id}`);
      if (!existing) continue; // only card known catalog corridors, not every stop pair
      existing.count = row.trip_count;
      existing.todayCount = row.today_count;
      existing.nextDateIso = row.next_date;
      existing.durationMinutes = row.min_duration_minutes;
      existing.minFare = row.min_fare;
    }

    const sorted = [...byPair.values()].sort(
      (a, b) => b.count - a.count || a.originName.localeCompare(b.originName),
    );

    return sorted.map((r) => ({
      originId: r.originId,
      destId: r.destId,
      originName: r.originName,
      destName: r.destName,
      durationMinutes: r.durationMinutes,
      tripCount: r.count,
      todayCount: r.todayCount,
      nextDateIso: r.nextDateIso,
      imageUrl: r.imageUrl,
      minFare: r.minFare,
    }));
  },
  ['popular-routes'],
  { revalidate: 60 },
);

export function formatDuration(minutes: number | null): string {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
