import { sql } from '@/lib/db';
import { requireSession, isAdmin } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Group chat. Messages can carry a file attachment and can be turned into
// a note / idea / to-do / shopping / packing item on the client.
export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = await sql`
      SELECT m.id, m.guest_code, m.name, m.body, m.created_at,
             f.url AS file_url, f.name AS file_name, f.content_type AS file_type
      FROM messages m
      LEFT JOIN files f ON f.id = m.file_id
      WHERE m.trip_id = ${s.tripId}
      ORDER BY m.created_at DESC
      LIMIT 200`;
    return ok({ messages: (rows as any[]).reverse() });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    const body = String(b.body || '').trim();
    if (!body && !b.file_id) return bad('Say something (or attach a file).');
    const rows = (await sql`INSERT INTO messages (trip_id, guest_code, name, body, file_id)
                            VALUES (${s.tripId}, ${s.code}, ${s.name}, ${body}, ${b.file_id || null})
                            RETURNING id`) as any[];
    return ok({ id: rows[0].id });
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    const rows = (await sql`SELECT guest_code FROM messages WHERE id = ${b.id} AND trip_id = ${s.tripId}`) as any[];
    if (rows.length === 0) return ok();
    if (rows[0].guest_code !== s.code && !isAdmin()) return bad('You can only delete your own messages.', 403);
    await sql`DELETE FROM messages WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}
