import { sql } from '@/lib/db';
import {
  getSession,
  isAdmin,
  setSessionCookie,
  clearSessionCookie,
  setAdminCookie,
  clearAdminCookie,
  checkAdminPasscode,
  requireSession,
} from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Who am I / am I admin?
export async function GET() {
  return handle(async () => {
    const session = await getSession();
    return ok({ session, isAdmin: session ? isAdmin() : false });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'login') {
      const eventCode = String(body.eventCode || '').toLowerCase().replace(/\s+/g, '');
      const code = String(body.code || '').toLowerCase().replace(/\s+/g, '');
      if (!eventCode) return bad('Enter the event code.');
      if (!code) return bad('Enter your name code.');
      const trip = (await sql`SELECT id, code, name FROM trips WHERE code = ${eventCode}`) as any[];
      if (trip.length === 0) return bad('No event with that code. Double-check it with the organizer.', 404);
      const rows = (await sql`
        SELECT code, name FROM guests WHERE trip_id = ${trip[0].id} AND code = ${code}`) as any[];
      if (rows.length === 0) {
        return bad('That name code isn’t on this event’s guest list (try firstnamelastname).', 404);
      }
      setSessionCookie(trip[0].code, rows[0].code);
      return ok({ ok: true });
    }

    if (action === 'admin-unlock') {
      await requireSession();
      if (!checkAdminPasscode(String(body.passcode || ''))) {
        return bad('Wrong admin passcode.', 403);
      }
      setAdminCookie();
      return ok({ isAdmin: true });
    }

    if (action === 'admin-lock') {
      clearAdminCookie();
      return ok({ isAdmin: false });
    }

    if (action === 'logout') {
      clearSessionCookie();
      return ok({ session: null });
    }

    return bad('Unknown action.');
  });
}
