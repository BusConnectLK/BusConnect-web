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

/**
 * One row per bookable (trip, boarding stop, drop stop) match — `search_trips`
 * resolves the actual board/drop instants and fare for the requested stop
 * pair, which may be any two stops the bus passes (not just route endpoints).
 */
export interface TripSearchResult {
  trip_id: string;
  route_id: string;
  route_name: string;
  from_stop_id: string;
  to_stop_id: string;
  boarding_at: string;
  drop_at: string;
  fare: number;
  depart_at: string;
  arrive_est: string | null;
  status: string;
  bus_reg_no: string;
  bus_amenities: string[];
  bus_images: string[];
  bus_type_name: string;
  bus_type_class: string;
  bus_type_seat_count: number;
  operator_id: string;
  operator_name: string;
  operator_logo_url: string | null;
  operator_rating: number;
  operator_reliability_score: number;
}

export interface CrewMember {
  name: string;
  photoUrl: string | null;
}

export interface TripCrew {
  driver: CrewMember | null;
  conductor: CrewMember | null;
}

export function getTripCrew(tripId: string) {
  return request<TripCrew>(`/trips/${tripId}/crew`);
}

/**
 * Seat layout convention stored in bus_types.layout_json.
 * `cols` is a row template: a string is a seat column label, `null` is an aisle
 * gap. A seat's label is `${rowNumber}${colLabel}` (e.g. "1A") UNLESS `labels`
 * is present — then `labels[i]` (in row-major reading order, one entry per
 * non-aisle position) overrides the computed label for the i-th seat. This is
 * purely a display/identifier override: hold_seats/create_booking treat
 * seat_no as opaque text regardless of which convention produced it.
 */
export interface SeatLayout {
  rows: number;
  cols: (string | null)[];
  labels?: string[];
}

export interface SeatMap {
  trip_id: string;
  layout: SeatLayout | null;
  taken: string[];
}

/** A trip's per-stop timetable row (real times — from the journey when it has one). */
export interface TripStopTime {
  route_stop_id: string;
  seq: number;
  location_id: string;
  location_name: string;
  scheduled_at: string | null;
  can_board: boolean;
  can_drop: boolean;
}

export interface TripFare {
  from_stop_id: string;
  to_stop_id: string;
  fare: number;
}

export interface TripDetail {
  id: string;
  depart_at: string;
  arrive_est: string | null;
  base_fare: number;
  status: string;
  route: {
    id: string;
    name: string;
    origin_id: string;
    dest_id: string;
  };
  bus: {
    reg_no: string;
    amenities: string[];
    operator: { id: string; name: string; logo_url: string | null; rating: number; reliability_score: number } | null;
    bus_type: { name: string; class: string; seat_count: number; layout_json: SeatLayout | null };
  };
  fares: TripFare[];
  stops: TripStopTime[];
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
  refunds?: { id: string; amount: number; reason: string; status: string }[];
  trip?: { depart_at: string };
}

export interface CancelResult {
  ok: true;
  refundPct: number;
  refundAmount: number;
  refundStatus: "processed" | "pending_manual" | "not_eligible" | "none";
  message: string;
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

export function cancelBooking(accessToken: string, id: string) {
  return request<CancelResult>(`/bookings/${id}/cancel`, {
    method: 'POST',
    accessToken,
  });
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
  witness_name?: string | null;
  mobile_no?: string | null;
  address?: string | null;
  logo_url?: string | null;
  id_document_path?: string | null;
}

export interface OperatorTrip {
  id: string;
  depart_at: string;
  arrive_est: string | null;
  base_fare: number;
  status: string;
  route: { id: string; name: string; origin_id: string; dest_id: string } | null;
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

export interface OperatorBus {
  id: string;
  reg_no: string;
  status: 'pending' | 'active' | 'rejected';
  amenities: string[];
  notes: string | null;
  seat_layout_style: string | null;
  seat_numbering: 'auto' | 'custom';
  front_image_url: string | null;
  side_image_urls: string[] | null;
  interior_image_url: string | null;
  seat_layout_image_url: string | null;
  bus_type: { name: string; class: string; seat_count: number } | null;
}

export interface RouteStopEntry {
  id?: string; // route_stops.id — present via the operator catalog reader
  seq: number;
  location: { id: string; name_en: string } | null;
}

export interface RouteCatalogEntry {
  id: string;
  name: string;
  image_url: string | null;
  origin_id: string;
  dest_id: string;
  origin?: { name_en: string } | null;
  dest?: { name_en: string } | null;
  stops: RouteStopEntry[];
}

export interface OperatorFleet {
  routes: { id: string; name: string; origin_id: string; dest_id: string }[];
  buses: OperatorBus[];
}

// ── Journeys (operator recurring services) ──────────────────────────────────

export interface OperatorJourney {
  id: string;
  code: string | null;
  depart_time: string;
  arrive_time: string;
  arrive_day_offset: number;
  base_fare: number;
  recurrence: 'daily' | 'weekly';
  weekdays: number[];
  start_date: string;
  end_date: string | null;
  status: 'active' | 'paused';
  created_at: string;
  route: { id: string; name: string } | null;
  bus: { reg_no: string; bus_type: { name: string; class: string } | null } | null;
  driver: { name: string } | null;
  conductor: { name: string } | null;
}

export interface JourneyStopDetail {
  id: string;
  route_stop_id: string;
  seq: number;
  scheduled_time: string;
  day_offset: number;
  can_board: boolean;
  can_drop: boolean;
  route_stop: { location: { id: string; name_en: string } | null } | null;
}

export interface OperatorJourneyDetail extends Omit<OperatorJourney, 'route' | 'bus'> {
  depart_location: string | null;
  depart_location_url: string | null;
  arrive_location: string | null;
  arrive_location_url: string | null;
  route: { id: string; name: string; origin_id: string; dest_id: string } | null;
  bus: { id: string; reg_no: string; bus_type: { name: string; class: string; seat_count: number } | null } | null;
  driver: { id: string; name: string } | null;
  conductor: { id: string; name: string } | null;
  stops: JourneyStopDetail[];
}

export interface JourneyStopInput {
  routeStopId: string;
  time: string;
  dayOffset?: number;
  canBoard?: boolean;
  canDrop?: boolean;
}

export interface UpsertJourneyInput {
  routeId: string;
  busId: string;
  departTime: string;
  arriveTime: string;
  arriveDayOffset?: number;
  departLocation?: string;
  departLocationUrl?: string;
  arriveLocation?: string;
  arriveLocationUrl?: string;
  baseFare: number;
  recurrence: 'daily' | 'weekly';
  weekdays?: number[];
  startDate: string;
  endDate?: string;
  stops: JourneyStopInput[];
}

export function listJourneys(accessToken: string) {
  return request<OperatorJourney[]>('/operator/journeys', { accessToken });
}

export function getJourney(accessToken: string, id: string) {
  return request<OperatorJourneyDetail>(`/operator/journeys/${id}`, { accessToken });
}

export function createJourney(accessToken: string, input: UpsertJourneyInput) {
  return request<OperatorJourneyDetail>('/operator/journeys', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function updateJourney(accessToken: string, id: string, input: UpsertJourneyInput) {
  return request<OperatorJourneyDetail>(`/operator/journeys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function setJourneyStatus(accessToken: string, id: string, status: 'active' | 'paused') {
  return request<OperatorJourney>(`/operator/journeys/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    accessToken,
  });
}

export function deleteJourney(accessToken: string, id: string) {
  return request(`/operator/journeys/${id}`, { method: 'DELETE', accessToken });
}

export function getOperatorRouteCatalog(accessToken: string) {
  return request<RouteCatalogEntry[]>('/operator/routes', { accessToken });
}

export interface RegisterBusInput {
  regNo: string;
  busClass: 'normal' | 'semi_luxury' | 'luxury' | 'super_luxury' | 'expressway';
  totalSeats: number;
  seatLayoutStyle: '2x2' | '3x2' | '2x1';
  seatNumbering: 'auto' | 'custom';
  customSeatNumbers?: string[];
  amenities: string[];
  frontImageUrl?: string;
  sideImageUrls?: string[];
  interiorImageUrl?: string;
  seatLayoutImageUrl?: string;
  notes?: string;
}

export function registerBus(accessToken: string, input: RegisterBusInput) {
  return request<OperatorBus>('/operator/buses', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export interface OperatorBusDetail extends OperatorBus {
  created_at: string;
}

export function getBus(accessToken: string, busId: string) {
  return request<OperatorBusDetail>(`/operator/buses/${busId}`, { accessToken });
}

export interface UpdateBusInput {
  regNo?: string;
  busClass?: 'normal' | 'semi_luxury' | 'luxury' | 'super_luxury' | 'expressway';
  amenities?: string[];
  notes?: string;
  frontImageUrl?: string;
  sideImageUrls?: string[];
  interiorImageUrl?: string;
  seatLayoutImageUrl?: string;
}

export function updateBus(accessToken: string, busId: string, input: UpdateBusInput) {
  return request<OperatorBusDetail>(`/operator/buses/${busId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export type OperatorRole = 'owner' | 'pilot';

export interface OperatorMembership {
  operator: OperatorInfo;
  role: OperatorRole;
}

export interface OperatorPilot {
  id: string;
  name: string;
  id_number: string;
  phone_no: string;
  profile_image_url: string | null;
  status: 'pending' | 'active' | 'rejected';
  assigned_bus_id: string | null;
  assigned_role: 'driver' | 'conductor' | null;
  user_id: string | null;
  created_at: string;
  bus: { reg_no: string } | null;
}

export interface OperatorPilotDetail extends OperatorPilot {
  operator_id: string;
  bus: { reg_no: string; bus_type: { name: string; class: string } | null } | null;
}

export interface MyRoles {
  isOperator: boolean;
  operatorRole: OperatorRole | null;
  operatorName: string | null;
  operatorStatus: string | null;
  isAdmin: boolean;
}

export function getMyOperator(accessToken: string) {
  return request<OperatorMembership>('/operator/me', { accessToken });
}

export interface ApplyOperatorInput {
  name: string;
  witnessName: string;
  mobileNo: string;
  address: string;
  logoUrl: string;
  idDocumentPath: string;
}

export function applyAsOperator(accessToken: string, input: ApplyOperatorInput) {
  return request<OperatorInfo>('/operator/apply', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function listPilots(accessToken: string) {
  return request<OperatorPilot[]>('/operator/pilots', { accessToken });
}

export function getPilot(accessToken: string, pilotId: string) {
  return request<OperatorPilotDetail>(`/operator/pilots/${pilotId}`, { accessToken });
}

export interface UpdatePilotInput {
  name?: string;
  idNumber?: string;
  phoneNo?: string;
  profileImagePath?: string;
}

export function updatePilot(accessToken: string, pilotId: string, input: UpdatePilotInput) {
  return request<OperatorPilotDetail>(`/operator/pilots/${pilotId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export interface RegisterPilotInput {
  name: string;
  idNumber: string;
  phoneNo: string;
  profileImagePath: string;
}

export function registerPilot(accessToken: string, input: RegisterPilotInput) {
  return request<OperatorPilot>('/operator/pilots', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function getPilotPhotoUrl(accessToken: string, pilotId: string) {
  return request<{ url: string }>(`/operator/pilots/${pilotId}/photo-url`, { accessToken });
}

export function assignPilot(
  accessToken: string,
  pilotId: string,
  input: { busId: string; role: 'driver' | 'conductor' },
) {
  return request<OperatorPilot>(`/operator/pilots/${pilotId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function linkPilotAccount(accessToken: string, pilotId: string, email: string) {
  return request<OperatorPilot>(`/operator/pilots/${pilotId}/link-account`, {
    method: 'POST',
    body: JSON.stringify({ email }),
    accessToken,
  });
}

export function deletePilot(accessToken: string, pilotId: string) {
  return request(`/operator/pilots/${pilotId}`, { method: 'DELETE', accessToken });
}

export function getMyRoles(accessToken: string) {
  return request<MyRoles>('/me/roles', { accessToken });
}

export function validateTicket(accessToken: string, token: string) {
  return request<
    | { ok: true; status: 'accepted'; ticketId: string }
    | { ok: false; reason: 'already_used' | 'void' | 'not_found' }
  >('/tickets/validate', {
    method: 'POST',
    body: JSON.stringify({ token }),
    accessToken,
  });
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

export interface OperatorPayoutAccount {
  bankName?: string | null;
  branchName?: string | null;
  accountNumber?: string | null;
  bankCode?: string | null;
}

export interface OperatorProfile {
  id: string;
  name: string;
  rating: number;
  reliability_score: number;
  status: string;
  logo_url: string | null;
  witness_name: string | null;
  mobile_no: string | null;
  address: string | null;
  payout_account: OperatorPayoutAccount | null;
  created_at: string;
  role: OperatorRole;
}

export function getOperatorProfile(accessToken: string) {
  return request<OperatorProfile>('/operator/profile', { accessToken });
}

export interface UpdateOperatorProfileInput {
  mobileNo?: string;
  address?: string;
  logoUrl?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  bankCode?: string;
}

export function updateOperatorProfile(accessToken: string, input: UpdateOperatorProfileInput) {
  return request<OperatorProfile>('/operator/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

// ── Admin dashboard (token required; caller must be linked via admin_users) ────

export interface AdminOperator {
  id: string;
  name: string;
  logo_url: string | null;
  rating: number;
  reliability_score: number;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  witness_name: string | null;
  mobile_no: string | null;
  address: string | null;
  id_document_path: string | null;
  payout_account: OperatorPayoutAccount | null;
  owner_email?: string | null;
}

export interface AdminRefund {
  id: string;
  amount: number;
  reason: string;
  status: string;
  processed_at: string | null;
  booking: {
    id: string;
    amount: number;
    seats: string[];
    trip: { bus: { operator: { name: string } | null } | null } | null;
  };
}

export interface AdminAnalytics {
  totalOperators: number;
  pendingOperators: number;
  activeOperators: number;
  totalTrips: number;
  totalBookings: number;
  totalRevenue: number;
  pendingRefundsCount: number;
  pendingRefundsAmount: number;
  perOperator: { operatorId: string; name: string; status: string; bookings: number; revenue: number }[];
}

export interface AdminBooking {
  id: string;
  seats: string[];
  amount: number;
  status: string;
  created_at: string;
  trip: { depart_at: string; bus: { operator: { name: string } | null } | null } | null;
  tickets?: { id: string; status: string }[];
  payments?: { id: string; status: string; amount: number }[];
  refunds?: { id: string; amount: number; status: string }[];
}

export interface AdminLocation {
  id: string;
  name_en: string;
  name_si: string | null;
  name_ta: string | null;
}

export interface AdminBusType {
  id: string;
  name: string;
  class: string;
  seat_count: number;
  layout_json: SeatLayout;
}

export interface AdminBus {
  id: string;
  reg_no: string;
  amenities: string[];
  status: 'pending' | 'active' | 'rejected';
  notes: string | null;
  seat_layout_style: string | null;
  seat_numbering: 'auto' | 'custom';
  front_image_url: string | null;
  side_image_urls: string[] | null;
  interior_image_url: string | null;
  seat_layout_image_url: string | null;
  operator: { name: string } | null;
  bus_type: { name: string; class: string; seat_count: number } | null;
}

export type AdminRoute = RouteCatalogEntry;

export function listAdminOperators(accessToken: string) {
  return request<AdminOperator[]>('/admin/operators', { accessToken });
}

export function getAdminOperator(accessToken: string, operatorId: string) {
  return request<AdminOperator>(`/admin/operators/${operatorId}`, { accessToken });
}

export function setAdminOperatorStatus(
  accessToken: string,
  operatorId: string,
  status: 'pending' | 'active' | 'suspended',
) {
  return request<AdminOperator>(`/admin/operators/${operatorId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    accessToken,
  });
}

export function deleteAdminOperator(accessToken: string, operatorId: string) {
  return request<{ ok: true }>(`/admin/operators/${operatorId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function getAdminIdDocumentUrl(accessToken: string, operatorId: string) {
  return request<{ url: string }>(`/admin/operators/${operatorId}/id-document-url`, {
    accessToken,
  });
}

export function listAdminRefunds(accessToken: string, status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<AdminRefund[]>(`/admin/refunds${qs}`, { accessToken });
}

export function processAdminRefund(accessToken: string, refundId: string) {
  return request(`/admin/refunds/${refundId}/process`, { method: 'POST', accessToken });
}

export function getAdminAnalytics(accessToken: string) {
  return request<AdminAnalytics>('/admin/analytics', { accessToken });
}

export function findAdminBookingById(accessToken: string, bookingId: string) {
  return request<AdminBooking>(`/admin/bookings/${bookingId}`, { accessToken });
}

export function findAdminBookingsByEmail(accessToken: string, email: string) {
  return request<AdminBooking[]>(`/admin/bookings?email=${encodeURIComponent(email)}`, {
    accessToken,
  });
}

export function listAdminLocations(accessToken: string) {
  return request<AdminLocation[]>('/admin/locations', { accessToken });
}

export function createAdminLocation(
  accessToken: string,
  body: { nameEn: string; nameSi?: string; nameTa?: string; lat?: number; lng?: number },
) {
  return request<AdminLocation>('/admin/locations', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function listAdminBusTypes(accessToken: string) {
  return request<AdminBusType[]>('/admin/bus-types', { accessToken });
}

export function createAdminBusType(
  accessToken: string,
  body: { name: string; busClass: string; seatCount: number },
) {
  return request<AdminBusType>('/admin/bus-types', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function listAdminBuses(accessToken: string) {
  return request<AdminBus[]>('/admin/buses', { accessToken });
}

export function createAdminBus(
  accessToken: string,
  body: { operatorId: string; busTypeId: string; regNo: string; amenities?: string[] },
) {
  return request<AdminBus>('/admin/buses', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function setAdminBusStatus(
  accessToken: string,
  busId: string,
  status: 'pending' | 'active' | 'rejected',
) {
  return request<AdminBus>(`/admin/buses/${busId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    accessToken,
  });
}

export interface AdminPilot {
  id: string;
  name: string;
  id_number: string;
  phone_no: string;
  profile_image_url: string | null;
  status: 'pending' | 'active' | 'rejected';
  assigned_bus_id: string | null;
  assigned_role: 'driver' | 'conductor' | null;
  user_id: string | null;
  created_at: string;
  operator: { name: string } | null;
  bus: { reg_no: string } | null;
}

export function listAdminPilots(accessToken: string) {
  return request<AdminPilot[]>('/admin/pilots', { accessToken });
}

export function setAdminPilotStatus(
  accessToken: string,
  pilotId: string,
  status: 'pending' | 'active' | 'rejected',
) {
  return request<AdminPilot>(`/admin/pilots/${pilotId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    accessToken,
  });
}

export function getAdminPilotPhotoUrl(accessToken: string, pilotId: string) {
  return request<{ url: string }>(`/admin/pilots/${pilotId}/photo-url`, { accessToken });
}

export function listAdminRoutes(accessToken: string) {
  return request<AdminRoute[]>('/admin/routes', { accessToken });
}

export interface UpsertRouteInput {
  name: string;
  stopLocationIds: string[];
  imageUrl?: string;
}

export function createAdminRoute(accessToken: string, body: UpsertRouteInput) {
  return request<AdminRoute>('/admin/routes', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function updateAdminRoute(accessToken: string, routeId: string, body: UpsertRouteInput) {
  return request<AdminRoute>(`/admin/routes/${routeId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function deleteAdminRoute(accessToken: string, routeId: string) {
  return request(`/admin/routes/${routeId}`, { method: 'DELETE', accessToken });
}
