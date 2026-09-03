import { sql } from '@/lib/db';
import { requireSession, requireAdmin, isAdmin } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = await sql`
      SELECT i.id, i.title, i.notes, i.url, i.category, i.status, i.pinned, i.created_by, i.created_at,
             COUNT(v.id)::int AS votes,
             BOOL_OR(v.guest_code = ${s.code}) AS voted
      FROM ideas i
      LEFT JOIN votes v ON v.idea_id = i.id
      WHERE i.trip_id = ${s.tripId}
      GROUP BY i.id
      ORDER BY i.pinned DESC, votes DESC, i.created_at DESC`;
    return ok({ ideas: rows });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    if (!b.title) return bad('Need a title.');
    const rows = await sql`
      INSERT INTO ideas (trip_id, title, notes, url, category, created_by)
      VALUES (${s.tripId}, ${b.title}, ${b.notes || null}, ${b.url || null}, ${b.category || null}, ${s.name})
      RETURNING id`;
    return ok({ id: (rows as any[])[0].id });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    if (!b.id) return bad('Need an id.');

    if (b.status !== undefined || b.pinned !== undefined) {
      await requireAdmin();
      await sql`UPDATE ideas SET
                  status = COALESCE(${b.status ?? null}, status),
                  pinned = COALESCE(${b.pinned ?? null}, pinned)
                WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
      return ok();
    }

    const rows = (await sql`SELECT created_by FROM ideas WHERE id = ${b.id} AND trip_id = ${s.tripId}`) as any[];
    if (rows.length === 0) return bad('Not found.', 404);
    if (rows[0].created_by !== s.name && !isAdmin()) {
      return bad('Only the person who added this (or the admin) can edit it.', 403);
    }
    await sql`UPDATE ideas SET
                title = COALESCE(${b.title ?? null}, title),
                notes = ${b.notes ?? null},
                url = ${b.url ?? null},
                category = ${b.category ?? null}
              WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    const rows = (await sql`SELECT created_by FROM ideas WHERE id = ${b.id} AND trip_id = ${s.tripId}`) as any[];
    if (rows.length === 0) return ok();
    if (rows[0].created_by !== s.name && !isAdmin()) {
      return bad('Only the person who added this (or the admin) can delete it.', 403);
    }
    await sql`DELETE FROM ideas WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}
