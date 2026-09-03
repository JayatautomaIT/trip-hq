import { sql } from '@/lib/db';
import { requireSession, requireAdmin } from '@/lib/auth';
import { handle, ok, bad } from '@/lib/api';
import { computeBalances, settleUp, applySettlements, expenseTotal, type Expense } from '@/lib/money';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const expenseRows = (await sql`
      SELECT e.id, e.title, e.category, e.notes, e.created_at,
        COALESCE(
          (SELECT json_agg(json_build_object('guest_code', c.guest_code, 'amount_cents', c.amount_cents))
           FROM expense_contributions c WHERE c.expense_id = e.id),
          '[]'
        ) AS contributions,
        COALESCE(
          (SELECT json_agg(sp.guest_code) FROM expense_splits sp WHERE sp.expense_id = e.id),
          '[]'
        ) AS splitters
      FROM expenses e
      WHERE e.trip_id = ${s.tripId}
      ORDER BY e.created_at DESC`) as any[];

    const guests = (await sql`SELECT code, name, pay_handle FROM guests WHERE trip_id = ${s.tripId} ORDER BY sort, name`) as any[];
    const settlements = (await sql`SELECT id, from_code, to_code, amount_cents, note, created_at
                                   FROM settlements WHERE trip_id = ${s.tripId} ORDER BY created_at DESC`) as any[];
    const trip = (await sql`SELECT budget_per_person_cents FROM trips WHERE id = ${s.tripId}`) as any[];
    const budgetPerPerson = trip[0]?.budget_per_person_cents ?? null;

    const expenses: Expense[] = expenseRows.map((e) => ({
      id: e.id,
      title: e.title,
      contributions: e.contributions || [],
      splitters: e.splitters || [],
    }));

    const balances = computeBalances(expenses, guests);
    applySettlements(balances, settlements);
    const transfers = settleUp(balances);
    const total = expenses.reduce((sum, e) => sum + expenseTotal(e), 0);

    // Spending by category
    const byCategory: Record<string, number> = {};
    for (const e of expenseRows) {
      const cat = e.category || 'Uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + (e.contributions || []).reduce((a: number, c: any) => a + (c.amount_cents || 0), 0);
    }

    const withTotals = expenseRows.map((e) => ({
      ...e,
      total_cents: (e.contributions || []).reduce((a: number, c: any) => a + (c.amount_cents || 0), 0),
    }));

    const perPerson = guests.length ? Math.round(total / guests.length) : 0;

    return ok({
      expenses: withTotals, guests, balances, transfers, total,
      settlements, byCategory, budgetPerPerson, perPerson, guestCount: guests.length,
    });
  });
}

async function writeSubRows(expenseId: number, contributions: any[], splitters: string[]) {
  await sql`DELETE FROM expense_contributions WHERE expense_id = ${expenseId}`;
  await sql`DELETE FROM expense_splits WHERE expense_id = ${expenseId}`;
  for (const c of contributions || []) {
    if (c && c.guest_code && Number.isFinite(c.amount_cents) && c.amount_cents > 0) {
      await sql`INSERT INTO expense_contributions (expense_id, guest_code, amount_cents)
                VALUES (${expenseId}, ${c.guest_code}, ${c.amount_cents})`;
    }
  }
  for (const code of splitters || []) {
    await sql`INSERT INTO expense_splits (expense_id, guest_code) VALUES (${expenseId}, ${code})
              ON CONFLICT DO NOTHING`;
  }
}

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    if (!b.title) return bad('Need a title.');
    const rows = (await sql`
      INSERT INTO expenses (trip_id, title, category, notes)
      VALUES (${s.tripId}, ${b.title}, ${b.category || null}, ${b.notes || null})
      RETURNING id`) as any[];
    const id = rows[0].id;
    await writeSubRows(id, b.contributions, b.splitters);
    return ok({ id });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    if (!b.id) return bad('Need an id.');
    const owns = (await sql`SELECT id FROM expenses WHERE id = ${b.id} AND trip_id = ${s.tripId}`) as any[];
    if (owns.length === 0) return bad('Not found.', 404);
    await sql`UPDATE expenses SET
                title = COALESCE(${b.title ?? null}, title),
                category = ${b.category ?? null},
                notes = ${b.notes ?? null}
              WHERE id = ${b.id}`;
    if (b.contributions !== undefined || b.splitters !== undefined) {
      await writeSubRows(b.id, b.contributions || [], b.splitters || []);
    }
    return ok();
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const s = await requireAdmin();
    const b = await req.json().catch(() => ({}));
    await sql`DELETE FROM expenses WHERE id = ${b.id} AND trip_id = ${s.tripId}`;
    return ok();
  });
}
