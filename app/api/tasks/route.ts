import { sql } from '@/lib/db';
import { requireSession, requireAdmin, isAdmin } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Task board. Admin adds/removes/assigns; the assigned guy (or admin) can tick it done.
export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = await sql`SELECT id, title, assignee, done, notes, sort FROM tasks
                           WHERE trip_id = ${s.tripId} ORDER BY done, sort, id`;
    return ok({ tasks: rows });
  });
}

// Anyone can add a to-do (also used by "turn chat message into a to-do").
export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    if (!b.title) return bad('Need a title.');
    const rows = (await sql`INSERT INTO tasks (trip_id, title, assignee, notes)
                            VALUES (${s.tripId}, ${b.title}, ${b.assignee || null}, ${b.notes || null}) RETURNING id`) as any[];
    return ok({ id: rows[0].id });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    if (!b.id) return bad('Need an id.');

    // Toggling done: allowed for the assignee or admin. Other edits: admin only.
    const onlyDone = Object.keys(b).every((k) => k === 'id' || k === 'done');
    if (onlyDone) {
      const rows = (await sql`SELECT assignee FROM tasks WHERE id = ${b.id} AND trip_id = ${s.tripId}`) as any[];
      if (rows.length === 0) return bad('Not found.', 404);
      if (rows[0].assignee !== s.code && !isAdmin()) return bad('Only the assignee or organizer can tick this off.', 403);
      await sql`UPDATE tasks SET done = ${!!b.done} WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
      return ok();
    }

    await requireAdmin();
    await sql`UPDATE tasks SET
                title = COALESCE(${b.title ?? null}, title),
                assignee = ${b.assignee ?? null},
                done = COALESCE(${b.done ?? null}, done),
                notes = ${b.notes ?? null}
              WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    await sql`DELETE FROM tasks WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}
