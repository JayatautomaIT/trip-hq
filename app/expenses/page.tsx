'use client';

import { useEffect, useMemo, useState } from 'react';
import { Protected } from '@/components/Protected';
import { useSession } from '@/components/SessionProvider';
import { jget, jpost, jpatch, jdel } from '@/lib/client';
import { formatMoney, dollarsToCents, centsToDollars } from '@/lib/money';

type Guest = { code: string; name: string; pay_handle?: string | null };
type Contribution = { guest_code: string; amount_cents: number };
type Settlement = { id: number; from_code: string; to_code: string; amount_cents: number; note: string | null };
type Expense = {
  id: number;
  title: string;
  category: string | null;
  notes: string | null;
  contributions: Contribution[];
  splitters: string[];
  total_cents: number;
};
type Data = {
  expenses: Expense[];
  guests: Guest[];
  balances: Record<string, number>;
  transfers: { from: string; to: string; cents: number }[];
  total: number;
  settlements: Settlement[];
  byCategory: Record<string, number>;
  budgetPerPerson: number | null;
  perPerson: number;
  guestCount: number;
};

export default function ExpensesPage() {
  return (
    <Protected>
      <Expenses />
    </Protected>
  );
}

function Expenses() {
  const { isAdmin } = useSession();
  const [data, setData] = useState<Data | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  const load = () => jget('/api/expenses').then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const nameOf = useMemo(() => {
    const m: Record<string, string> = {};
    for (const g of data?.guests || []) m[g.code] = g.name;
    return (code: string) => m[code] || code;
  }, [data]);

  const handleOf = useMemo(() => {
    const m: Record<string, string> = {};
    for (const g of data?.guests || []) if (g.pay_handle) m[g.code] = g.pay_handle;
    return (code: string) => m[code] || '';
  }, [data]);

  if (!data) return <div className="container"><p className="muted">Loading…</p></div>;

  const catEntries = Object.entries(data.byCategory).sort((a, b) => b[1] - a[1]);
  const catMax = catEntries.length ? Math.max(...catEntries.map((c) => c[1])) : 0;

  return (
    <div className="container">
      <h1>Money 💸</h1>
      <p className="page-sub">
        Each expense lists who chipped in and who&apos;s splitting it. Balances update automatically.
        {isAdmin ? '' : ' Only the organizer can edit.'}
      </p>

      {/* Totals / budget */}
      <div className="card">
        <div className="grid cols-3">
          <div className="card" style={{ padding: 12 }}>
            <div className="small muted">Total spent</div>
            <div className="big-num">{formatMoney(data.total)}</div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="small muted">Per person ({data.guestCount})</div>
            <div className="big-num">{formatMoney(data.perPerson)}</div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="small muted">Budget / person</div>
            {data.budgetPerPerson != null ? (
              <>
                <div className="big-num">{formatMoney(data.budgetPerPerson)}</div>
                <div className={`small ${data.perPerson > data.budgetPerPerson ? 'neg' : 'pos'}`}>
                  {data.perPerson > data.budgetPerPerson
                    ? `${formatMoney(data.perPerson - data.budgetPerPerson)} over`
                    : `${formatMoney(data.budgetPerPerson - data.perPerson)} left`}
                </div>
              </>
            ) : (
              <div className="tiny muted">Set it on the Trip Info page.</div>
            )}
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {catEntries.length > 0 && (
        <div className="card">
          <h2>Where it&apos;s going</h2>
          <div className="stack">
            {catEntries.map(([cat, cents]) => (
              <div key={cat}>
                <div className="spread small"><span>{cat}</span><b>{formatMoney(cents)}</b></div>
                <div style={{ height: 8, background: 'var(--panel-2)', borderRadius: 999, overflow: 'hidden', marginTop: 3 }}>
                  <div style={{ height: '100%', width: `${catMax ? (cents / catMax) * 100 : 0}%`, background: 'var(--accent)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Balances */}
      <div className="card">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Balances</h2>
          <span className="muted small">after {data.settlements.length} recorded payment(s)</span>
        </div>
        <div className="grid cols-3" style={{ marginTop: 12 }}>
          {data.guests.map((g) => {
            const bal = data.balances[g.code] || 0;
            return (
              <div key={g.code} className="card" style={{ padding: 12 }}>
                <div className="small muted">{g.name}</div>
                <div className={bal > 0 ? 'pos' : bal < 0 ? 'neg' : ''} style={{ fontSize: 18, fontWeight: 800 }}>
                  {bal > 0 ? `is owed ${formatMoney(bal)}` : bal < 0 ? `owes ${formatMoney(-bal)}` : 'all square'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="divider" />
        <h3 style={{ marginBottom: 8 }}>Who pays whom to settle up</h3>
        {data.transfers.length === 0 ? (
          <p className="muted small">Everyone&apos;s even. 🎉</p>
        ) : (
          <div className="stack">
            {data.transfers.map((t, i) => (
              <div key={i} className="row">
                <span className="badge bad">{nameOf(t.from)}</span>
                <span>→ pays →</span>
                <span className="badge good">{nameOf(t.to)}</span>
                {handleOf(t.to) && <span className="tiny muted">{handleOf(t.to)}</span>}
                <b>{formatMoney(t.cents)}</b>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recorded payments */}
      <Settlements data={data} nameOf={nameOf} isAdmin={isAdmin} onChange={load} />

      {/* Admin: add */}
      {isAdmin && !adding && <button className="btn primary" style={{ marginTop: 14 }} onClick={() => setAdding(true)}>+ Add expense</button>}
      {isAdmin && adding && (
        <ExpenseForm guests={data.guests} onDone={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />
      )}

      {/* Expense list */}
      <div className="stack" style={{ marginTop: 16 }}>
        {data.expenses.length === 0 && <p className="muted">No expenses logged yet.</p>}
        {data.expenses.map((e) =>
          editing === e.id ? (
            <ExpenseForm key={e.id} guests={data.guests} expense={e} onDone={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
          ) : (
            <div key={e.id} className="card">
              <div className="spread">
                <div className="row">
                  <b>{e.title}</b>
                  {e.category && <span className="badge blue">{e.category}</span>}
                </div>
                <b>{formatMoney(e.total_cents)}</b>
              </div>
              <div className="small" style={{ marginTop: 6 }}>
                <span className="muted">Paid by: </span>
                {e.contributions.length === 0 ? <span className="muted">nobody yet</span> :
                  e.contributions.map((c, i) => (
                    <span key={i}>{i > 0 ? ', ' : ''}{nameOf(c.guest_code)} {formatMoney(c.amount_cents)}</span>
                  ))}
              </div>
              <div className="small" style={{ marginTop: 3 }}>
                <span className="muted">Split among ({e.splitters.length}): </span>
                {e.splitters.length === 0 ? <span className="muted">no one</span> : e.splitters.map(nameOf).join(', ')}
              </div>
              {e.notes && <div className="tiny muted" style={{ marginTop: 4 }}>{e.notes}</div>}
              {isAdmin && (
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn sm ghost" onClick={() => setEditing(e.id)}>Edit</button>
                  <button className="btn sm danger" onClick={() => jdel('/api/expenses', { id: e.id }).then(load)}>Delete</button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ExpenseForm({
  guests, expense, onDone, onCancel,
}: {
  guests: Guest[];
  expense?: Expense;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(expense?.title || '');
  const [category, setCategory] = useState(expense?.category || '');
  const [notes, setNotes] = useState(expense?.notes || '');
  const [contribs, setContribs] = useState<{ guest_code: string; amount: string }[]>(
    expense?.contributions.length
      ? expense.contributions.map((c) => ({ guest_code: c.guest_code, amount: centsToDollars(c.amount_cents) }))
      : [{ guest_code: guests[0]?.code || '', amount: '' }]
  );
  const [splitters, setSplitters] = useState<Set<string>>(
    new Set(expense?.splitters?.length ? expense.splitters : guests.map((g) => g.code))
  );
  const [busy, setBusy] = useState(false);

  const total = contribs.reduce((s, c) => s + dollarsToCents(c.amount), 0);

  function setContrib(idx: number, patch: Partial<{ guest_code: string; amount: string }>) {
    setContribs((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function toggleSplit(code: string) {
    setSplitters((prev) => {
      const n = new Set(prev);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });
  }

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    const payload = {
      title,
      category,
      notes,
      contributions: contribs
        .map((c) => ({ guest_code: c.guest_code, amount_cents: dollarsToCents(c.amount) }))
        .filter((c) => c.guest_code && c.amount_cents > 0),
      splitters: Array.from(splitters),
    };
    if (expense) await jpatch('/api/expenses', { id: expense.id, ...payload });
    else await jpost('/api/expenses', payload);
    setBusy(false);
    onDone();
  }

  return (
    <div className="card pinned-card">
      <h3 style={{ marginBottom: 10 }}>{expense ? 'Edit expense' : 'New expense'}</h3>
      <div className="grid cols-2">
        <div><label>What for</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bottle service" /></div>
        <div><label>Category</label><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Club / Food / Lodging…" /></div>
      </div>

      <div style={{ marginTop: 14 }}>
        <label>Who paid (you can add more than one)</label>
        <div className="stack">
          {contribs.map((c, idx) => (
            <div key={idx} className="row">
              <select style={{ flex: 2 }} value={c.guest_code} onChange={(e) => setContrib(idx, { guest_code: e.target.value })}>
                {guests.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
              </select>
              <div className="row" style={{ flex: 1, minWidth: 110, gap: 4 }}>
                <span className="muted">$</span>
                <input inputMode="decimal" value={c.amount} onChange={(e) => setContrib(idx, { amount: e.target.value })} placeholder="0.00" />
              </div>
              {contribs.length > 1 && (
                <button className="btn sm ghost danger" onClick={() => setContribs((p) => p.filter((_, i) => i !== idx))}>✕</button>
              )}
            </div>
          ))}
        </div>
        <button className="btn sm ghost" style={{ marginTop: 6 }} onClick={() => setContribs((p) => [...p, { guest_code: guests[0]?.code || '', amount: '' }])}>
          + Another payer
        </button>
        <div className="small muted" style={{ marginTop: 6 }}>Item total: <b>{formatMoney(total)}</b></div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="spread">
          <label style={{ margin: 0 }}>Who&apos;s splitting this?</label>
          <div className="row">
            <button className="btn sm ghost" onClick={() => setSplitters(new Set(guests.map((g) => g.code)))}>All</button>
            <button className="btn sm ghost" onClick={() => setSplitters(new Set())}>None</button>
          </div>
        </div>
        <div className="grid cols-3" style={{ marginTop: 8 }}>
          {guests.map((g) => (
            <label key={g.code} className="row" style={{ cursor: 'pointer', margin: 0 }}>
              <input type="checkbox" className="check" checked={splitters.has(g.code)} onChange={() => toggleSplit(g.code)} />
              <span>{g.name}</span>
            </label>
          ))}
        </div>
        {splitters.size > 0 && total > 0 && (
          <div className="small muted" style={{ marginTop: 8 }}>
            ≈ {formatMoney(Math.round(total / splitters.size))} each
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}><label>Notes (optional)</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={save} disabled={busy}>Save</button>
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function Settlements({ data, nameOf, isAdmin, onChange }: {
  data: Data; nameOf: (c: string) => string; isAdmin: boolean; onChange: () => void;
}) {
  const [from, setFrom] = useState(data.guests[0]?.code || '');
  const [to, setTo] = useState(data.guests[1]?.code || '');
  const [amount, setAmount] = useState('');

  async function record() {
    const cents = dollarsToCents(amount);
    if (!from || !to || from === to || cents <= 0) return;
    await jpost('/api/settlements', { from_code: from, to_code: to, amount_cents: cents });
    setAmount('');
    onChange();
  }

  if (!isAdmin && data.settlements.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h2>Payments made</h2>
      <p className="tiny muted" style={{ marginTop: -6 }}>Log money that&apos;s actually changed hands so the balances above update.</p>

      {isAdmin && (
        <div className="row" style={{ marginBottom: 10 }}>
          <select style={{ flex: 1 }} value={from} onChange={(e) => setFrom(e.target.value)}>
            {data.guests.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
          </select>
          <span className="muted">paid</span>
          <select style={{ flex: 1 }} value={to} onChange={(e) => setTo(e.target.value)}>
            {data.guests.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
          </select>
          <div className="row" style={{ gap: 4 }}>
            <span className="muted">$</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ width: 90 }} />
          </div>
          <button className="btn primary" onClick={record}>Log</button>
        </div>
      )}

      {data.settlements.length === 0 ? (
        <p className="muted small">No payments recorded yet.</p>
      ) : (
        data.settlements.map((st) => (
          <div key={st.id} className="item">
            <span style={{ flex: 1 }} className="small">{nameOf(st.from_code)} paid {nameOf(st.to_code)} <b>{formatMoney(st.amount_cents)}</b></span>
            {isAdmin && <button className="btn sm ghost danger" onClick={() => jdel('/api/settlements', { id: st.id }).then(onChange)}>✕</button>}
          </div>
        ))
      )}
    </div>
  );
}
