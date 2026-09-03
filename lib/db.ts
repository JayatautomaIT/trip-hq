import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Lazily create the Neon client so importing this module never throws
// (e.g. during the build if DATABASE_URL isn't present yet).
let _client: NeonQueryFunction<false, false> | null = null;
function client() {
  if (!_client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set. Add it in .env.local and in Vercel.');
    _client = neon(url);
  }
  return _client;
}

// Tagged-template query helper: sql`SELECT * FROM guests WHERE id = ${id}`
// Values are always parameterized, so this is safe from SQL injection.
// Resolves to an array of row objects.
export const sql = (strings: TemplateStringsArray, ...values: unknown[]): Promise<any[]> =>
  (client() as any)(strings, ...values);
