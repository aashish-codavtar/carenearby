import { Storage } from '../utils/storage';

export const API_BASE: string =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ?? 'http://localhost:3000';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function request<T>(method: Method, path: string, body?: object, auth = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
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

export function apiLogin(payload: { phone: string; name?: string; role?: string }) {
  return request<{ message: string }>('POST', '/auth/login', payload, false);
}

export function apiVerify(payload: { phone: string; otp: string }) {
  return request<{ token: string; user: { id: string; name: string; role: string; phone: string; onboardingComplete: boolean } }>(
    'POST', '/auth/verify', payload, false,
  );
}

export function apiSubmitPSWOnboarding(payload: {
  qualificationType: string;
  licenseNumber?: string;
  collegeName?: string;
  experienceYears?: number;
  specialties?: string[];
  certifications?: string[];
  firstAidCertified?: boolean;
  driversLicense?: boolean;
  ownTransportation?: boolean;
  bio?: string;
  languages?: string[];
}) {
  return request<{ message: string }>('POST', '/auth/psw-profile', payload);
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export function apiCreateBooking(payload: {
  serviceType: string;
  hours: number;
  scheduledAt: string;
  location: { coordinates: [number, number] };
  address?: string;
  notes?: string;
}) {
  return request<{ booking: Booking }>('POST', '/bookings', payload);
}

export function apiMyBookings() {
  return request<{ bookings: Booking[] }>('GET', '/bookings/my');
}

export function apiGetBooking(id: string) {
  return request<{ booking: Booking }>('GET', `/bookings/${id}`);
}

export function apiCancelBooking(id: string) {
  return request<{ booking: Booking }>('PATCH', `/bookings/${id}/cancel`);
}

export function apiRateBooking(payload: { bookingId: string; rating: number; comment?: string }) {
  return request<{ message: string }>('POST', '/ratings', payload);
}

export function apiGetAvailablePSWs() {
  return request<{ count: number; psws: AvailablePSW[] }>('GET', '/psws/available');
}

// ─── PSW ──────────────────────────────────────────────────────────────────────

export function apiNearbyJobs(coords?: { lat: number; lng: number }) {
  const qs = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : '';
  return request<{ bookings: Booking[] }>('GET', `/jobs/nearby${qs}`);
}

export function apiMyJobs() {
  return request<{ bookings: Booking[] }>('GET', '/jobs/my');
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

export function apiToggleAvailability(available: boolean) {
  return request<{ message: string }>('PATCH', '/jobs/availability', { available });
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function apiGetProfile(): Promise<{ user: UserProfile }> {
  // Backend returns { user: {...}, pswProfile: {...} } as separate top-level fields.
  // Merge pswProfile into user so callers can access user.pswProfile correctly.
  const raw = await request<{ user: Record<string, any>; pswProfile?: Record<string, any> | null }>('GET', '/profile');
  if (raw.pswProfile) (raw.user as any).pswProfile = raw.pswProfile;
  return { user: raw.user as UserProfile };
}

export function apiUpdateProfile(payload: {
  name?: string;
  bio?: string;
  languages?: string[];
  specialties?: string[];
  photoUrl?: string;
}) {
  return request<{ user: UserProfile }>('PATCH', '/profile', payload);
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function apiUploadDocument(payload: { docType: string; label: string; dataUrl: string; mimeType?: string; fileName?: string }) {
  const token = await Storage.getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Build FormData with the file as a blob (works on web and native)
  const form = new FormData();
  form.append('docType', payload.docType);
  form.append('label', payload.label);

  if (payload.dataUrl) {
    let fileBlob: Blob;
    // Safari on iOS/iPad often returns a blob:// URI instead of a base64 data URL.
    // For blob:// or http(s):// URIs, fetch the resource directly.
    if (payload.dataUrl.startsWith('blob:') || payload.dataUrl.startsWith('http:') || payload.dataUrl.startsWith('https:')) {
      const resp = await fetch(payload.dataUrl);
      fileBlob = await resp.blob();
    } else {
      // Standard base64 data URL (data:image/jpeg;base64,...)
      const mime = payload.mimeType ?? payload.dataUrl.split(';')[0].split(':')[1] ?? 'image/jpeg';
      const b64  = payload.dataUrl.includes(',') ? payload.dataUrl.split(',')[1] : payload.dataUrl;
      const binary = atob(b64);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      fileBlob = new Blob([bytes], { type: mime });
    }
    const name = payload.fileName ?? `doc_${Date.now()}.${(fileBlob.type || payload.mimeType || 'image/jpeg').split('/')[1] || 'jpg'}`;
    form.append('file', fileBlob, name);
  }

  const res = await fetch(`${API_BASE}/documents/upload`, { method: 'POST', headers, body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any).error || (json as any).message || `Upload failed: ${res.status}`;
    throw new Error(message);
  }
  return json as { message: string; document: { id: string; docType: string; status: string; url: string; submittedAt: string } };
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export function apiGetPSWs(approved?: boolean) {
  const qs = approved !== undefined ? `?approved=${approved}` : '';
  return request<{ psws: PSWEntry[] }>('GET', `/admin/psws${qs}`);
}

export function apiGetPSWDetail(id: string) {
  return request<{ psw: PSWEntry }>('GET', `/admin/psws/${id}`);
}

export function apiApprovePSW(id: string) {
  return request<{ message: string }>('POST', `/admin/psws/${id}/approve`);
}

export function apiRejectPSW(id: string) {
  return request<{ message: string }>('POST', `/admin/psws/${id}/reject`);
}

export function apiVerifyDocument(pswId: string, payload: { docType: string; verified: boolean; rejectionNote?: string }) {
  return request<{ message: string; docType: string }>('POST', `/admin/psws/${pswId}/verify-document`, payload);
}

export function apiTogglePoliceCheck(pswId: string, cleared: boolean) {
  return request<{ message: string; policeCheckCleared: boolean }>('PATCH', `/admin/psws/${pswId}/police-check`, { cleared });
}

export function apiGetAllBookings(params?: { status?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return request<{ bookings: Booking[]; total: number }>('GET', `/admin/bookings${q ? `?${q}` : ''}`);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvailablePSW {
  _id: string;
  name: string;
  rating: number;
  lat: number;
  lng: number;
  qualificationType: string;
}

export interface SubmittedDocument {
  docType: string;
  label: string;
  dataUrl: string;
  submittedAt: string;
  verifiedByAdmin: boolean;
  verifiedAt?: string;
  rejectionNote?: string;
}

export interface Booking {
  _id: string;
  customer: { _id: string; name: string; phone: string; rating?: number };
  psw?: { _id: string; name: string; phone: string; rating?: number; ratingCount?: number };
  serviceType: string;
  hours: number;
  scheduledAt: string;
  location: { coordinates: [number, number] };
  address?: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  totalPrice: number;
  paymentStatus: string;
  notes?: string;
  createdAt: string;
  distanceKm?: number;
}

export interface UserProfile {
  _id: string;
  name: string;
  phone: string;
  role: string;
  rating?: number;
  ratingCount?: number;
  pswProfile?: {
    approvedByAdmin: boolean;
    availability: boolean;
    certifications: string[];
    experienceYears: number;
    bio?: string;
    languages?: string[];
    photoUrl?: string;
    specialties?: string[];
    policeCheckCleared?: boolean;
  };
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
    bio?: string;
    languages?: string[];
    photoUrl?: string;
    specialties?: string[];
    policeCheckCleared?: boolean;
    qualificationType?: string;
    licenseNumber?: string;
    collegeName?: string;
    firstAidCertified?: boolean;
    driversLicense?: boolean;
    ownTransportation?: boolean;
    insuranceVerified?: boolean;
    submittedDocuments?: SubmittedDocument[];
  };
}
