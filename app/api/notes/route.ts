import { sql } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Everyone logged in can read and edit the notes board (collaborative).
export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    // Pinned notes float to the top — they double as the trip's reference info.
    const rows = await sql`SELECT id, title, body, color, pinned, updated_by, updated_at
                           FROM notes WHERE trip_id = ${s.tripId}
                           ORDER BY pinned DESC, created_at`;
    return ok({ notes: rows });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    const rows = await sql`
      INSERT INTO notes (trip_id, title, body, color, updated_by)
      VALUES (${s.tripId}, ${b.title || ''}, ${b.body || ''}, ${b.color || 'yellow'}, ${s.name})
      RETURNING id`;
    return ok({ id: (rows as any[])[0].id });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    if (!b.id) return bad('Need an id.');
    await sql`UPDATE notes SET
                title = COALESCE(${b.title ?? null}, title),
                body = COALESCE(${b.body ?? null}, body),
                color = COALESCE(${b.color ?? null}, color),
                pinned = COALESCE(${b.pinned ?? null}, pinned),
                updated_by = ${s.name},
                updated_at = now()
              WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    await sql`DELETE FROM notes WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}
