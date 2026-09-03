import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Generates a short-lived token so the browser can upload straight to Vercel Blob.
// We authorize here: only logged-in guys can upload. The DB row is written
// separately (client calls POST /api/files after the upload finishes).
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const s = await getSession();
        if (!s) throw new Error('Log in first.');
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: 25 * 1024 * 1024, // 25 MB per file
          tokenPayload: JSON.stringify({ tripId: s.tripId, code: s.code, name: s.name }),
        };
      },
      onUploadCompleted: async () => {
        // The DB row is created client-side via POST /api/files (works locally too).
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
