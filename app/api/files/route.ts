import { del } from '@vercel/blob';
import { sql } from '@/lib/db';
import { requireSession, isAdmin } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = await sql`SELECT id, url, pathname, name, content_type, size, caption, added_by, guest_code, created_at
                           FROM files WHERE trip_id = ${s.tripId} ORDER BY created_at DESC`;
    return ok({ files: rows });
  });
}

// Record metadata for a file the browser already uploaded to Blob.
export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    if (!b.url) return bad('Missing file url.');
    await sql`INSERT INTO files (trip_id, url, pathname, name, content_type, size, caption, guest_code, added_by)
              VALUES (${s.tripId}, ${b.url}, ${b.pathname || null}, ${b.name || null},
                      ${b.content_type || null}, ${b.size || null}, ${b.caption || null}, ${s.code}, ${s.name})`;
    return ok();
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    const rows = (await sql`SELECT url, guest_code FROM files WHERE id = ${b.id} AND trip_id = ${s.tripId}`) as any[];
    if (rows.length === 0) return ok();
    if (rows[0].guest_code !== s.code && !isAdmin()) return bad('You can only delete files you uploaded.', 403);
    try {
      await del(rows[0].url); // remove the actual blob
    } catch {
      // if the blob is already gone, still remove the row
    }
    await sql`DELETE FROM files WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}
