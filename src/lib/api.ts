/**
 * Typed client for the BusConnect NestJS API. Public reads (search, trip
 * detail, seat map) need no token. Writes (holds, bookings) require the
 * caller to pass the Supabase access token — see lib/supabase/{client,server}.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, headers, ...rest } = init;

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ── Types (mirror BusConnect-api response shapes) ───────────────────────────

export interface TripSearchResult {
  id: string;
  depart_at: string;
  arrive_est: string | null;
  base_fare: number;
  status: string;
  route: {
    id: string;
    operator: { id: string; name: string; rating: number; reliability_score: number };
  };
  bus: {
    reg_no: string;
    amenities: string[];
    bus_type: { name: string; class: string; seat_count: number };
  };
}

/**
 * Seat layout convention stored in bus_types.layout_json.
 * `cols` is a row template: a string is a seat column label, `null` is an aisle
 * gap. A seat's label is `${rowNumber}${colLabel}` (e.g. "1A").
 */
export interface SeatLayout {
  rows: number;
  cols: (string | null)[];
}

export interface SeatMap {
  trip_id: string;
  layout: SeatLayout | null;
  taken: string[];
}

export interface RouteStop {
  id: string;
  route_id: string;
  location_id: string;
  seq: number;
  scheduled_offset_min: number;
}

export interface TripDetail {
  id: string;
  depart_at: string;
  arrive_est: string | null;
  base_fare: number;
  status: string;
  route: {
    id: string;
    origin_id: string;
    dest_id: string;
    operator: { id: string; name: string; rating: number; reliability_score: number };
    stops: RouteStop[];
  };
  bus: {
    reg_no: string;
    amenities: string[];
    bus_type: { name: string; class: string; seat_count: number; layout_json: SeatLayout | null };
  };
}

export interface Booking {
  id: string;
  trip_id: string;
  seats: string[];
  amount: number;
  status: string;
  from_stop_id: string;
  to_stop_id: string;
  tickets?: { id: string; status: string; qr_signature: string | null }[];
  payments?: { id: string; status: string; amount: number }[];
}

export interface HoldResult {
  ok: boolean;
  hold_group: string;
  trip_id: string;
  seats: string[];
  expires_at: string;
}

export interface BookingResult {
  ok: boolean;
  booking_id: string;
  trip_id: string;
  seats: string[];
  amount: number;
}

export interface PayHereCheckout {
  action: string;
  fields: Record<string, string>;
}

// ── Public (no token) ────────────────────────────────────────────────────────

export function searchTrips(params: { from: string; to: string; date: string }) {
  const qs = new URLSearchParams(params).toString();
  return request<TripSearchResult[]>(`/search?${qs}`);
}

export function getTrip(id: string) {
  return request<TripDetail>(`/trips/${id}`);
}

export function getSeatmap(id: string) {
  return request<SeatMap>(`/trips/${id}/seatmap`);
}

// ── Authenticated (token required) ──────────────────────────────────────────

export function createHold(
  accessToken: string,
  body: { tripId: string; seats: string[] },
) {
  return request<HoldResult>('/holds', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function releaseHold(accessToken: string, holdGroup: string) {
  return request(`/holds/${holdGroup}`, { method: 'DELETE', accessToken });
}

export function createBooking(
  accessToken: string,
  body: { holdGroup: string; fromStopId: string; toStopId: string },
) {
  return request<BookingResult>('/bookings', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function getBooking(accessToken: string, id: string) {
  return request<Booking>(`/bookings/${id}`, { accessToken });
}

export function checkoutBooking(accessToken: string, bookingId: string) {
  return request<PayHereCheckout>(`/bookings/${bookingId}/pay`, {
    method: 'POST',
    accessToken,
  });
}

// ── Operator dashboard (token required; caller must be linked via operator_users) ──

export interface OperatorInfo {
  id: string;
  name: string;
  rating: number;
  reliability_score: number;
  status: string;
}

export interface OperatorTrip {
  id: string;
  depart_at: string;
  arrive_est: string | null;
  base_fare: number;
  status: string;
  route: { id: string; operator_id: string; origin_id: string; dest_id: string };
  bus: { reg_no: string; bus_type: { name: string; class: string; seat_count: number } };
}

export interface OperatorManifestBooking {
  id: string;
  seats: string[];
  amount: number;
  status: string;
  created_at: string;
}

export interface OperatorManifest {
  trip_id: string;
  layout: SeatLayout | null;
  taken: string[];
  bookings: OperatorManifestBooking[];
  revenue: number;
}

export interface OperatorAnalytics {
  operator: { id: string; name: string; rating: number; reliability_score: number };
  totalTrips: number;
  upcomingTrips: number;
  totalBookings: number;
  totalRevenue: number;
  fillRatePct: number;
}

export interface OperatorFleet {
  routes: { id: string; origin_id: string; dest_id: string }[];
  buses: { id: string; reg_no: string; bus_type: { name: string; seat_count: number } }[];
}

export function getMyOperator(accessToken: string) {
  return request<OperatorInfo>('/operator/me', { accessToken });
}

export function listOperatorTrips(accessToken: string) {
  return request<OperatorTrip[]>('/operator/trips', { accessToken });
}

export function getOperatorManifest(accessToken: string, tripId: string) {
  return request<OperatorManifest>(`/operator/trips/${tripId}/manifest`, { accessToken });
}

export function getOperatorAnalytics(accessToken: string) {
  return request<OperatorAnalytics>('/operator/analytics', { accessToken });
}

export function getOperatorFleet(accessToken: string) {
  return request<OperatorFleet>('/operator/fleet', { accessToken });
}

export function createOperatorTrip(
  accessToken: string,
  body: { routeId: string; busId: string; departAt: string; arriveEst?: string; baseFare: number },
) {
  return request<OperatorTrip>('/operator/trips', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}
