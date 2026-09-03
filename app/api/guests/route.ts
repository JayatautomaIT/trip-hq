import { sql } from '@/lib/db';
import { requireSession, requireAdmin, isAdmin } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = await sql`SELECT code, name, rsvp, contact, pay_handle, diet FROM guests
                           WHERE trip_id = ${s.tripId} ORDER BY sort, name`;
    return ok({ guests: rows });
  });
}

// Add a guy (admin only)
export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    const code = String(b.code || '').toLowerCase().replace(/\s+/g, '');
    const name = String(b.name || '').trim();
    if (!code || !name) return bad('Need a name and a code.');
    await sql`INSERT INTO guests (trip_id, code, name, contact)
              VALUES (${s.tripId}, ${code}, ${name}, ${b.contact || null})
              ON CONFLICT (trip_id, code) DO UPDATE SET name = EXCLUDED.name, contact = EXCLUDED.contact`;
    return ok();
  });
}

// Set RSVP / profile (each guy can edit his own; admin can edit anyone's)
export async function PATCH(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    const target = String(b.code || '') || s.code;
    if (target !== s.code && !isAdmin()) return bad('You can only edit your own info.', 403);

    if (b.rsvp !== undefined) {
      const rsvp = String(b.rsvp || '');
      if (!['yes', 'no', 'maybe', 'pending'].includes(rsvp)) return bad('Bad RSVP value.');
      await sql`UPDATE guests SET rsvp = ${rsvp} WHERE code = ${target} AND trip_id = ${s.tripId}`;
    }
    if (b.pay_handle !== undefined || b.diet !== undefined) {
      await sql`UPDATE guests SET
                  pay_handle = COALESCE(${b.pay_handle ?? null}, pay_handle),
                  diet = COALESCE(${b.diet ?? null}, diet)
                WHERE code = ${target} AND trip_id = ${s.tripId}`;
    }
    return ok();
  });
}

// Remove a guy (admin only)
export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    const code = String(b.code || '');
    if (!code) return bad('Need a code.');
    await sql`DELETE FROM guests WHERE code = ${code} AND trip_id = ${s.tripId}`;
    return ok();
  });
}
