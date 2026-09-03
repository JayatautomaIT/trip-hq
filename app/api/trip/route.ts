import { sql } from '@/lib/db';
import { requireSession, requireAdmin } from '@/lib/auth';
import { handle, ok } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Event-level settings (name, date, per-person budget).
export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = (await sql`SELECT code, name, trip_date, budget_per_person_cents
                            FROM trips WHERE id = ${s.tripId}`) as any[];
    return ok({ trip: rows[0] });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    await sql`UPDATE trips SET
                name = COALESCE(${b.name ?? null}, name),
                trip_date = COALESCE(${b.trip_date ?? null}, trip_date),
                budget_per_person_cents = COALESCE(${b.budget_per_person_cents ?? null}, budget_per_person_cents)
              WHERE id = ${s.tripId}`;
    return ok();
  });
}
