import { sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Record a real payment between two guys (admin only). Balances update on the money page.
export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    if (!b.from_code || !b.to_code) return bad('Need who paid and who received.');
    if (b.from_code === b.to_code) return bad('Payer and receiver must differ.');
    if (!Number.isFinite(b.amount_cents) || b.amount_cents <= 0) return bad('Need an amount.');
    await sql`INSERT INTO settlements (trip_id, from_code, to_code, amount_cents, note)
              VALUES (${s.tripId}, ${b.from_code}, ${b.to_code}, ${b.amount_cents}, ${b.note || null})`;
    return ok();
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    await sql`DELETE FROM settlements WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}
