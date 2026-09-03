import { sql } from '@/lib/db';
import { requireSession, requireAdmin } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Trip info / logistics sections. Everyone views; admin edits.
export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = await sql`SELECT id, label, body, sort FROM info_sections
                           WHERE trip_id = ${s.tripId} ORDER BY sort, id`;
    return ok({ sections: rows });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    if (!b.label) return bad('Need a title.');
    const rows = (await sql`INSERT INTO info_sections (trip_id, label, body, sort)
                            VALUES (${s.tripId}, ${b.label}, ${b.body || null}, ${b.sort || 0}) RETURNING id`) as any[];
    return ok({ id: rows[0].id });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    if (!b.id) return bad('Need an id.');
    await sql`UPDATE info_sections SET
                label = COALESCE(${b.label ?? null}, label),
                body = ${b.body ?? null}
              WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    await sql`DELETE FROM info_sections WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}
