import { sql } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Each guy's PERSONAL packing list — only his own, within his event.
export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = await sql`SELECT id, text, checked, public FROM packing_items
                           WHERE trip_id = ${s.tripId} AND guest_code = ${s.code} ORDER BY created_at`;
    return ok({ items: rows });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    if (!b.text) return bad('Need some text.');
    const rows = (await sql`INSERT INTO packing_items (trip_id, guest_code, text)
                            VALUES (${s.tripId}, ${s.code}, ${b.text}) RETURNING id`) as any[];
    return ok({ id: rows[0].id });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    if (!b.id) return bad('Need an id.');
    await sql`UPDATE packing_items SET
                checked = COALESCE(${b.checked ?? null}, checked),
                text = COALESCE(${b.text ?? null}, text),
                public = COALESCE(${b.public ?? null}, public)
              WHERE id = ${b.id} AND trip_id = ${s.tripId} AND guest_code = ${s.code}`;
    return ok();
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    await sql`DELETE FROM packing_items WHERE id = ${b.id} AND trip_id = ${s.tripId} AND guest_code = ${s.code}`;
    return ok();
  });
}
