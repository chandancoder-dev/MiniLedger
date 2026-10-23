import { Platform } from 'react-native';

// Set EXPO_PUBLIC_API_URL for a physical phone (computer's LAN IP) or override
// the platform default. Android emulators reach the host at 10.0.2.2.
export const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000')).replace(/\/$/, '');

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) { onUnauthorized = handler; }

async function request<T>(path: string, init?: RequestInit, protectedRequest = false): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, init);
  } catch {
    throw new Error(`Cannot reach MiniLedger API at ${BASE_URL}. Check that the backend is running and the device API URL is correct.`);
  }
  let data: any = {};
  try { data = await response.json(); } catch { /* respond with a useful fallback below */ }
  if (protectedRequest && response.status === 401) onUnauthorized?.();
  if (!response.ok) throw new Error(data.message ?? `Request failed (${response.status})`);
  return data as T;
}

export interface Loan {
  id: number;
  friendName: string;
  amount: number;
  dueDate: string;       // "YYYY-MM-DD"
  repaidAt: string | null;
  createdAt: string;
}

export interface LoanSummary {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
}

export interface User {
  id: number;
  phone: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function requestOtp(phone: string): Promise<{ message: string }> {
  return request('/api/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(
  phone: string,
  otp: string
): Promise<{ token: string; user: User }> {
  return request('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp }),
  });
}

// ─── Loans ───────────────────────────────────────────────────────────────────

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getLoans(token: string): Promise<Loan[]> {
  const data = await request<{ loans: Loan[] }>('/api/loans', {
    headers: authHeaders(token),
  }, true);
  return data.loans;
}

export async function createLoan(
  token: string,
  payload: { friendName: string; amount: number; dueDate: string }
): Promise<Loan> {
  const data = await request<{ loan: Loan }>('/api/loans', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  }, true);
  return data.loan;
}

export async function repayLoan(token: string, id: number): Promise<Loan> {
  const data = await request<{ loan: Loan }>(`/api/loans/${id}/repay`, {
    method: 'PATCH',
    headers: authHeaders(token),
  }, true);
  return data.loan;
}

export async function getLoanSummary(token: string): Promise<LoanSummary> {
  return request('/api/loans/summary', {
    headers: authHeaders(token),
  }, true);
}
