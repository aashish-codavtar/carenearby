import { Storage } from '../utils/storage';

// Reads from mobile/.env  →  EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
// Falls back to localhost for the iOS Simulator / Android Emulator
export const API_BASE: string =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ?? 'http://localhost:3000';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function request<T>(
  method: Method,
  path: string,
  body?: object,
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = await Storage.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      (json as { error?: string; message?: string }).error ||
      (json as { error?: string; message?: string }).message ||
      `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return json as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function apiLogin(payload: {
  phone: string;
  name?: string;
  role?: string;
}) {
  return request<{ message: string }>('POST', '/auth/login', payload, false);
}

export function apiVerify(payload: { phone: string; otp: string }) {
  return request<{ token: string; user: { id: string; name: string; role: string; phone: string } }>(
    'POST',
    '/auth/verify',
    payload,
    false,
  );
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export function apiCreateBooking(payload: {
  serviceType: string;
  hours: number;
  scheduledAt: string;
  location: { coordinates: [number, number] };
}) {
  return request<{ booking: Booking }>('POST', '/bookings', payload);
}

export function apiMyBookings() {
  return request<{ bookings: Booking[] }>('GET', '/bookings/my');
}

export function apiRateBooking(payload: { bookingId: string; rating: number }) {
  return request<{ message: string }>('POST', '/ratings', payload);
}

// ─── PSW ──────────────────────────────────────────────────────────────────────

// Optionally pass current GPS coords so the backend updates PSW location atomically
export function apiNearbyJobs(coords?: { lat: number; lng: number }) {
  const qs = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : '';
  return request<{ bookings: Booking[] }>('GET', `/jobs/nearby${qs}`);
}

export function apiAcceptJob(id: string) {
  return request<{ booking: Booking }>('POST', `/jobs/${id}/accept`);
}

export function apiStartJob(id: string) {
  return request<{ booking: Booking }>('POST', `/jobs/${id}/start`);
}

export function apiCompleteJob(id: string) {
  return request<{ booking: Booking }>('POST', `/jobs/${id}/complete`);
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export function apiGetPSWs(approved?: boolean) {
  const qs = approved !== undefined ? `?approved=${approved}` : '';
  return request<{ psws: PSWEntry[] }>('GET', `/admin/psws${qs}`);
}

export function apiApprovePSW(id: string) {
  return request<{ message: string }>('POST', `/admin/psws/${id}/approve`);
}

export function apiGetAllBookings(params?: { status?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return request<{ bookings: Booking[]; total: number }>('GET', `/admin/bookings${q ? `?${q}` : ''}`);
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface Booking {
  _id: string;
  customer: { _id: string; name: string; phone: string; rating?: number };
  psw?: { _id: string; name: string; phone: string; rating?: number };
  serviceType: string;
  hours: number;
  scheduledAt: string;
  location: { coordinates: [number, number] };
  status: 'REQUESTED' | 'ACCEPTED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  totalPrice: number;
  paymentStatus: string;
  createdAt: string;
  distanceKm?: number;
}

export interface PSWEntry {
  _id: string;
  name: string;
  phone: string;
  rating: number;
  ratingCount: number;
  isVerified: boolean;
  profile?: {
    approvedByAdmin: boolean;
    availability: boolean;
    certifications: string[];
    experienceYears: number;
  };
}
