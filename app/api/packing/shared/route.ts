import { sql } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { handle, ok } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The "what everyone's bringing" board — only items each guy chose to share.
export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = await sql`
      SELECT p.id, p.text, p.guest_code, g.name
      FROM packing_items p
      JOIN guests g ON g.trip_id = p.trip_id AND g.code = p.guest_code
      WHERE p.trip_id = ${s.tripId} AND p.public = TRUE
      ORDER BY g.sort, g.name, p.created_at`;
    return ok({ items: rows });
  });
}
