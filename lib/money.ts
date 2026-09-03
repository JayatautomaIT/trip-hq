// All money is stored as integer cents to avoid floating-point errors.

export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function dollarsToCents(input: string): number {
  const n = Math.round(parseFloat(String(input).replace(/[^0-9.\-]/g, '')) * 100);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${centsToDollars(Math.abs(cents))}`;
}

export type Contribution = { guest_code: string; amount_cents: number };

export type Expense = {
  id: number;
  title: string;
  contributions: Contribution[]; // who paid, and how much (can be several)
  splitters: string[];           // guest codes sharing this expense equally
};

export type Guest = { code: string; name: string };

// Total actually paid toward an expense.
export function expenseTotal(e: Expense): number {
  return e.contributions.reduce((s, c) => s + (c.amount_cents || 0), 0);
}

// Compute each guy's net balance across all expenses.
// balance = (everything he paid) - (his share of everything he's part of).
// Positive = he's owed money; negative = he owes.
export function computeBalances(expenses: Expense[], guests: Guest[]) {
  const balance: Record<string, number> = {};
  for (const g of guests) balance[g.code] = 0;
  const ensure = (code: string) => {
    if (balance[code] === undefined) balance[code] = 0;
  };

  for (const e of expenses) {
    // Credit each contributor for what they put in.
    for (const c of e.contributions) {
      ensure(c.guest_code);
      balance[c.guest_code] += c.amount_cents || 0;
    }

    // Split the total among the responsible guys, as evenly as cents allow.
    const total = expenseTotal(e);
    const splitters = e.splitters.slice();
    if (splitters.length === 0 || total === 0) continue;

    const base = Math.floor(total / splitters.length);
    let remainder = total - base * splitters.length;
    for (const code of splitters) {
      ensure(code);
      const share = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      balance[code] -= share;
    }
  }
  return balance;
}

export type Settlement = { from_code: string; to_code: string; amount_cents: number };

// Apply real payments people have already made. Paying someone back reduces
// what you owe (raises your balance) and reduces what they're owed.
export function applySettlements(balance: Record<string, number>, settlements: Settlement[]) {
  for (const s of settlements) {
    if (balance[s.from_code] === undefined) balance[s.from_code] = 0;
    if (balance[s.to_code] === undefined) balance[s.to_code] = 0;
    balance[s.from_code] += s.amount_cents;
    balance[s.to_code] -= s.amount_cents;
  }
  return balance;
}

// Greedy "who pays whom" so everyone ends at zero with few transfers.
export function settleUp(balance: Record<string, number>) {
  const debtors: { code: string; amt: number }[] = [];
  const creditors: { code: string; amt: number }[] = [];
  for (const [code, amt] of Object.entries(balance)) {
    if (amt < 0) debtors.push({ code, amt: -amt });
    else if (amt > 0) creditors.push({ code, amt });
  }
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const transfers: { from: string; to: string; cents: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0) transfers.push({ from: debtors[i].code, to: creditors[j].code, cents: pay });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return transfers;
}
