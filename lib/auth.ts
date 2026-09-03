import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { sql } from './db';

const SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
const SESSION_COOKIE = 'phq_session';
const ADMIN_COOKIE = 'phq_admin';
const ADMIN_MARK = 'admin-ok';

function sign(value: string): string {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

// Pack a value with a signature so it can't be forged in the browser.
function pack(value: string): string {
  return `${value}.${sign(value)}`;
}

function unpack(signed: string | undefined): string | null {
  if (!signed) return null;
  const i = signed.lastIndexOf('.');
  if (i < 0) return null;
  const value = signed.slice(0, i);
  const sig = signed.slice(i + 1);
  // constant-time compare
  const expected = sign(value);
  if (
    sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return value;
  }
  return null;
}

export type Session = {
  code: string;
  name: string;
  tripId: number;
  tripCode: string;
  tripName: string;
  tripDate: string | null;
};

// Who is logged in right now? Returns null if not logged in.
// The cookie holds "<tripCode>:<guestCode>".
export async function getSession(): Promise<Session | null> {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  const value = unpack(raw);
  if (!value) return null;
  const sep = value.indexOf(':');
  if (sep < 0) return null;
  const tripCode = value.slice(0, sep);
  const code = value.slice(sep + 1);
  const rows = (await sql`
    SELECT g.code, g.name, t.id AS trip_id, t.code AS trip_code, t.name AS trip_name, t.trip_date
    FROM guests g
    JOIN trips t ON t.id = g.trip_id
    WHERE t.code = ${tripCode} AND g.code = ${code}`) as any[];
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    code: r.code,
    name: r.name,
    tripId: r.trip_id,
    tripCode: r.trip_code,
    tripName: r.trip_name,
    tripDate: r.trip_date ? String(r.trip_date).slice(0, 10) : null,
  };
}

export function isAdmin(): boolean {
  const raw = cookies().get(ADMIN_COOKIE)?.value;
  return unpack(raw) === ADMIN_MARK;
}

// --- cookie setters/clearers (call from route handlers) ---
export function setSessionCookie(tripCode: string, code: string) {
  cookies().set(SESSION_COOKIE, pack(`${tripCode}:${code}`), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 120, // 120 days
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
  cookies().delete(ADMIN_COOKIE);
}

export function setAdminCookie() {
  cookies().set(ADMIN_COOKIE, pack(ADMIN_MARK), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 120,
  });
}

export function clearAdminCookie() {
  cookies().delete(ADMIN_COOKIE);
}

export function checkAdminPasscode(input: string): boolean {
  const expected = process.env.ADMIN_PASSCODE || '';
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Guard helpers for route handlers. They throw a Response on failure,
// which Next.js route handlers can catch via the pattern in lib/api.ts.
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new AuthError('Please log in first.', 401);
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireSession();
  if (!isAdmin()) throw new AuthError('Admin only.', 403);
  return s;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
