import { sql } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Shared group shopping list — everyone in the event.
export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = await sql`SELECT id, text, qty, checked, source, added_by
                           FROM shopping_items WHERE trip_id = ${s.tripId}
                           ORDER BY checked, created_at`;
    return ok({ items: rows });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    if (!b.text) return bad('Need some text.');
    const rows = (await sql`INSERT INTO shopping_items (trip_id, text, qty, added_by)
                            VALUES (${s.tripId}, ${b.text}, ${b.qty || null}, ${s.name}) RETURNING id`) as any[];
    return ok({ id: rows[0].id });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    if (!b.id) return bad('Need an id.');
    await sql`UPDATE shopping_items SET
                checked = COALESCE(${b.checked ?? null}, checked),
                text = COALESCE(${b.text ?? null}, text),
                qty = COALESCE(${b.qty ?? null}, qty)
              WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    if (b.clearChecked) {
      await sql`DELETE FROM shopping_items WHERE checked = TRUE AND trip_id = ${s.tripId}`;
      return ok();
    }
    await sql`DELETE FROM shopping_items WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}
