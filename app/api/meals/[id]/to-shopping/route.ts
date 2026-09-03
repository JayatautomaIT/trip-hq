import { sql } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Push all of a meal's ingredients onto the shared shopping list.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const s = await requireSession();
    const id = Number(params.id);
    const meal = (await sql`SELECT title FROM meals WHERE id = ${id} AND trip_id = ${s.tripId}`) as any[];
    if (meal.length === 0) return bad('Meal not found.', 404);
    const ings = (await sql`SELECT text, qty FROM meal_ingredients WHERE meal_id = ${id}`) as any[];
    if (ings.length === 0) return bad('This meal has no ingredients yet.');
    const source = `Meal: ${meal[0].title}`;
    let added = 0;
    for (const ing of ings) {
      await sql`INSERT INTO shopping_items (trip_id, text, qty, source, added_by)
                VALUES (${s.tripId}, ${ing.text}, ${ing.qty || null}, ${source}, ${s.name})`;
      added++;
    }
    return ok({ added });
  });
}
