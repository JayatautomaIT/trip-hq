import { sql } from '@/lib/db';
import { requireSession, requireAdmin } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Availability poll: candidate dates, everyone marks yes/maybe/no.
export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = await sql`
      SELECT d.id, d.label, d.sort,
        COALESCE(
          (SELECT json_agg(json_build_object('guest_code', v.guest_code, 'choice', v.choice))
           FROM poll_votes v WHERE v.poll_date_id = d.id),
          '[]'
        ) AS votes
      FROM poll_dates d
      WHERE d.trip_id = ${s.tripId}
      ORDER BY d.sort, d.id`;
    return ok({ dates: rows, me: s.code });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    if (!b.label) return bad('Need a date/label.');
    const rows = (await sql`INSERT INTO poll_dates (trip_id, label, sort)
                            VALUES (${s.tripId}, ${b.label}, ${b.sort || 0}) RETURNING id`) as any[];
    return ok({ id: rows[0].id });
  });
}

// Cast/change my vote on a date.
export async function PATCH(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    const choice = String(b.choice || '');
    if (!['yes', 'maybe', 'no'].includes(choice)) return bad('Bad choice.');
    const owns = (await sql`SELECT id FROM poll_dates WHERE id = ${b.poll_date_id} AND trip_id = ${s.tripId}`) as any[];
    if (owns.length === 0) return bad('Date not found.', 404);
    await sql`INSERT INTO poll_votes (poll_date_id, guest_code, choice)
              VALUES (${b.poll_date_id}, ${s.code}, ${choice})
              ON CONFLICT (poll_date_id, guest_code) DO UPDATE SET choice = EXCLUDED.choice`;
    return ok();
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    await sql`DELETE FROM poll_dates WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}
