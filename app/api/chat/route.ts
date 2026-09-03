import { sql } from '@/lib/db';
import { requireSession, isAdmin } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Group chat. Everyone posts; messages can be turned into to-do / buy / bring items on the client.
export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = await sql`SELECT id, guest_code, name, body, created_at FROM messages
                           WHERE trip_id = ${s.tripId} ORDER BY created_at DESC LIMIT 200`;
    return ok({ messages: (rows as any[]).reverse() });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    const body = String(b.body || '').trim();
    if (!body) return bad('Say something.');
    const rows = (await sql`INSERT INTO messages (trip_id, guest_code, name, body)
                            VALUES (${s.tripId}, ${s.code}, ${s.name}, ${body}) RETURNING id`) as any[];
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
