import { sql } from '@/lib/db';
import { requireSession, requireAdmin } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ownsMeal(tripId: number, mealId: number) {
  const r = (await sql`SELECT id FROM meals WHERE id = ${mealId} AND trip_id = ${tripId}`) as any[];
  return r.length > 0;
}

// Everyone logged in can build the meal plan together.
export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const rows = await sql`
      SELECT m.id, m.day, m.slot, m.title, m.location, m.notes, m.pinned, m.sort,
             COALESCE(
               json_agg(json_build_object('id', mi.id, 'text', mi.text, 'qty', mi.qty)
                        ORDER BY mi.id) FILTER (WHERE mi.id IS NOT NULL),
               '[]'
             ) AS ingredients
      FROM meals m
      LEFT JOIN meal_ingredients mi ON mi.meal_id = m.id
      WHERE m.trip_id = ${s.tripId}
      GROUP BY m.id
      ORDER BY m.day NULLS LAST, m.sort, m.slot`;
    return ok({ meals: rows });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    if (!b.title) return bad('Need a title.');
    const rows = (await sql`
      INSERT INTO meals (trip_id, day, slot, title, location, notes)
      VALUES (${s.tripId}, ${b.day || null}, ${b.slot || null}, ${b.title}, ${b.location || null}, ${b.notes || null})
      RETURNING id`) as any[];
    const id = rows[0].id;
    if (Array.isArray(b.ingredients)) {
      for (const ing of b.ingredients) {
        if (ing && ing.text) {
          await sql`INSERT INTO meal_ingredients (meal_id, text, qty) VALUES (${id}, ${ing.text}, ${ing.qty || null})`;
        }
      }
    }
    return ok({ id });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    if (!b.id) return bad('Need an id.');
    if (!(await ownsMeal(s.tripId, b.id))) return bad('Meal not found.', 404);

    // Pinning ("decided") is an admin action.
    if (b.pinned !== undefined) {
      await requireAdmin();
      await sql`UPDATE meals SET pinned = ${!!b.pinned} WHERE id = ${b.id}`;
      return ok();
    }

    if (b.addIngredient?.text) {
      await sql`INSERT INTO meal_ingredients (meal_id, text, qty)
                VALUES (${b.id}, ${b.addIngredient.text}, ${b.addIngredient.qty || null})`;
      return ok();
    }
    if (b.removeIngredient) {
      await sql`DELETE FROM meal_ingredients WHERE id = ${b.removeIngredient} AND meal_id = ${b.id}`;
      return ok();
    }

    await sql`UPDATE meals SET
                day = ${b.day ?? null},
                slot = ${b.slot ?? null},
                title = COALESCE(${b.title ?? null}, title),
                location = ${b.location ?? null},
                notes = ${b.notes ?? null}
              WHERE id = ${b.id}`;
    return ok();
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const b = await req.json().catch(() => ({}));
    await sql`DELETE FROM meals WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}
