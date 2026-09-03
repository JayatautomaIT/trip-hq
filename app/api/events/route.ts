import { sql } from '@/lib/db';
import { requireSession, requireAdmin } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = await sql`SELECT id, day, start_time, title, location, notes, pinned, sort
                           FROM events WHERE trip_id = ${s.tripId}
                           ORDER BY day NULLS LAST, sort, start_time`;
    return ok({ events: rows });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    if (!b.title) return bad('Need a title.');
    const rows = await sql`
      INSERT INTO events (trip_id, day, start_time, title, location, notes, sort)
      VALUES (${s.tripId}, ${b.day || null}, ${b.start_time || null}, ${b.title}, ${b.location || null}, ${b.notes || null}, ${b.sort || 0})
      RETURNING id`;
    return ok({ id: (rows as any[])[0].id });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    if (!b.id) return bad('Need an id.');
    await sql`
      UPDATE events SET
        day = ${b.day ?? null},
        start_time = ${b.start_time ?? null},
        title = COALESCE(${b.title ?? null}, title),
        location = ${b.location ?? null},
        notes = ${b.notes ?? null},
        pinned = COALESCE(${b.pinned ?? null}, pinned)
      WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    await sql`DELETE FROM events WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}
