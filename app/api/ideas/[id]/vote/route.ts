import { sql } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Toggle the current user's vote on an idea (only within their own event).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const s = await requireSession();
    const id = Number(params.id);
    const idea = (await sql`SELECT id FROM ideas WHERE id = ${id} AND trip_id = ${s.tripId}`) as any[];
    if (idea.length === 0) return bad('Idea not found.', 404);

    const existing = (await sql`SELECT id FROM votes WHERE idea_id = ${id} AND guest_code = ${s.code}`) as any[];
    if (existing.length > 0) {
      await sql`DELETE FROM votes WHERE idea_id = ${id} AND guest_code = ${s.code}`;
      return ok({ voted: false });
    }
    await sql`INSERT INTO votes (idea_id, guest_code) VALUES (${id}, ${s.code}) ON CONFLICT DO NOTHING`;
    return ok({ voted: true });
  });
}
