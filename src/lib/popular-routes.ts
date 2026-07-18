import { createClient } from '@/lib/supabase/server';

export interface PopularRoute {
  originId: string;
  destId: string;
  originName: string;
  destName: string;
  durationMinutes: number | null;
  tripCount: number;
}

interface TripRow {
  route: {
    origin_id: string;
    dest_id: string;
    origin: { name_en: string } | null;
    dest: { name_en: string } | null;
    stops: { seq: number; scheduled_offset_min: number }[] | null;
  } | null;
}

/**
 * Derives "popular routes" from real upcoming trips (active operators only —
 * a display read, so it goes straight to Supabase under RLS rather than
 * through BusConnect-api, same as listLocations()). Ranked by how many
 * scheduled trips actually exist for that origin/destination pair — this is
 * live marketplace data, not a fixed editorial list.
 */
export async function listPopularRoutes(limit = 6): Promise<PopularRoute[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trips')
    .select(
      `route:routes!inner (
         origin_id, dest_id,
         origin:locations!routes_origin_id_fkey ( name_en ),
         dest:locations!routes_dest_id_fkey ( name_en ),
         stops:route_stops ( seq, scheduled_offset_min ),
         operator:operators!inner ( status )
       )`,
    )
    .eq('route.operator.status', 'active')
    .gte('depart_at', new Date().toISOString())
    .in('status', ['scheduled', 'boarding'])
    .limit(500);

  if (error) {
    console.error('listPopularRoutes: falling back to empty list —', error.message);
    return [];
  }

  const byPair = new Map<
    string,
    { originId: string; destId: string; originName: string; destName: string; durations: number[]; count: number }
  >();

  for (const row of (data ?? []) as unknown as TripRow[]) {
    const route = row.route;
    if (!route) continue;
    const key = `${route.origin_id}|${route.dest_id}`;
    const stops = [...(route.stops ?? [])].sort((a, b) => a.seq - b.seq);
    const duration = stops.length > 0 ? stops[stops.length - 1].scheduled_offset_min : null;

    const existing = byPair.get(key);
    if (existing) {
      existing.count += 1;
      if (duration != null) existing.durations.push(duration);
    } else {
      byPair.set(key, {
        originId: route.origin_id,
        destId: route.dest_id,
        originName: route.origin?.name_en ?? 'Unknown',
        destName: route.dest?.name_en ?? 'Unknown',
        durations: duration != null ? [duration] : [],
        count: 1,
      });
    }
  }

  return [...byPair.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((r) => ({
      originId: r.originId,
      destId: r.destId,
      originName: r.originName,
      destName: r.destName,
      durationMinutes: r.durations.length > 0 ? Math.min(...r.durations) : null,
      tripCount: r.count,
    }));
}

export function formatDuration(minutes: number | null): string {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
