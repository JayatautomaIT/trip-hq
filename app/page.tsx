'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Protected } from '@/components/Protected';
import { useSession } from '@/components/SessionProvider';
import { jget, jpatch } from '@/lib/client';
import { dollarsToCents, centsToDollars } from '@/lib/money';

type Pin = { label: string; kind: string; where: string };

const norm = (v: any) => (v ? String(v).slice(0, 10) : '');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
function dayLabel(d: string | null) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const ms = new Date(dateStr + 'T00:00:00').getTime() - new Date().getTime();
  return Math.floor(ms / 86400000);
}

export default function Home() {
  return (
    <Protected>
      <Dashboard />
    </Protected>
  );
}

function Dashboard() {
  const { session, isAdmin } = useSession();
  const [pins, setPins] = useState<Pin[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [nextMeal, setNextMeal] = useState<any>(null);
  const [openTodos, setOpenTodos] = useState<{ count: number; first: string[] }>({ count: 0, first: [] });
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const days = daysUntil(session?.tripDate ?? null);

  useEffect(() => {
    (async () => {
      try {
        const [ev, id, ml, tk, nt] = await Promise.all([
          jget('/api/events'), jget('/api/ideas'), jget('/api/meals'),
          jget('/api/tasks'), jget('/api/notes'),
        ]);
        const p: Pin[] = [];
        for (const e of ev.events) if (e.pinned) p.push({ label: e.title, kind: 'Event', where: '/plan' });
        for (const m of ml.meals) if (m.pinned) p.push({ label: m.title, kind: 'Meal', where: '/plan' });
        for (const i of id.ideas) if (i.pinned) p.push({ label: i.title, kind: 'Idea', where: '/board' });
        for (const n of nt.notes) if (n.pinned && n.title) p.push({ label: n.title, kind: 'Info', where: '/board' });
        setPins(p);

        const t = todayStr();
        const upcoming = ev.events.filter((e: any) => !e.day || norm(e.day) >= t);
        setNextEvent(upcoming[0] || null);
        const meals = ml.meals.filter((m: any) => !m.day || norm(m.day) >= t);
        setNextMeal(meals[0] || null);

        const open = tk.tasks.filter((x: any) => !x.done);
        setOpenTodos({ count: open.length, first: open.slice(0, 3).map((x: any) => x.title) });
      } catch {/* ignore */}
    })();
  }, []);

  function shareSummary() {
    const lines = [
      `🍻 ${session?.tripName || 'Trip'}`,
      session?.tripDate ? `📅 ${session.tripDate}${days !== null && days > 0 ? ` — ${days} days to go` : ''}` : '',
      '',
      'Locked in so far:',
      ...(pins.length ? pins.map((p) => `✅ ${p.label}`) : ['(nothing pinned yet)']),
    ].filter((l) => l !== '');
    navigator.clipboard?.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="container">
      <div className="spread">
        <h1>Hey {session?.name?.split(' ')[0]} 🍻</h1>
        <div className="row">
          <button className="btn sm" onClick={shareSummary}>{copied ? 'Copied ✓' : '📋 Share'}</button>
          {isAdmin && (
            <button className="btn sm ghost" title="Organizer settings" onClick={() => setShowSettings((s) => !s)}>⚙️</button>
          )}
        </div>
      </div>
      <p className="page-sub">{session?.tripName}</p>

      {isAdmin && showSettings && <EventSettings onClose={() => setShowSettings(false)} />}

      {days !== null && (
        <div className="card">
          <div className="spread">
            <div>
              <div className="small muted">Countdown</div>
              <div className="big-num">
                {days > 0 ? `${days} days` : days === 0 ? "It's today! 🎉" : `${Math.abs(days)} days ago`}
              </div>
            </div>
            <span className="muted small">{session?.tripDate}</span>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Up next</h2>
        {!nextEvent && !nextMeal && openTodos.count === 0 && (
          <p className="muted small">Nothing scheduled yet. Head to Plan to start adding.</p>
        )}
        <div className="stack">
          {nextEvent && (
            <Link href="/plan" className="item" style={{ textDecoration: 'none', color: 'var(--text)' }}>
              <span className="badge blue">🗓️ Event</span>
              <span style={{ flex: 1 }}>
                <b>{nextEvent.title}</b>
                <span className="tiny muted"> {dayLabel(norm(nextEvent.day))} {nextEvent.start_time || ''}</span>
              </span>
            </Link>
          )}
          {nextMeal && (
            <Link href="/plan" className="item" style={{ textDecoration: 'none', color: 'var(--text)' }}>
              <span className="badge blue">🍔 {nextMeal.slot || 'Meal'}</span>
              <span style={{ flex: 1 }}>
                <b>{nextMeal.title}</b>
                <span className="tiny muted"> {dayLabel(norm(nextMeal.day))}</span>
              </span>
            </Link>
          )}
          {openTodos.count > 0 && (
            <Link href="/lists" className="item" style={{ textDecoration: 'none', color: 'var(--text)' }}>
              <span className="badge warn">✅ {openTodos.count} open</span>
              <span style={{ flex: 1 }} className="small">{openTodos.first.join(' · ')}</span>
            </Link>
          )}
        </div>
      </div>

      <div className="card">
        <h2>📌 Locked in</h2>
        {pins.length === 0 ? (
          <p className="muted small">Nothing pinned yet. Pin things once they&apos;re decided.</p>
        ) : (
          <div className="stack">
            {pins.map((p, i) => (
              <Link key={i} href={p.where} className="item" style={{ textDecoration: 'none', color: 'var(--text)' }}>
                <span className="badge pin">{p.kind}</span>
                <span>{p.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventSettings({ onClose }: { onClose: () => void }) {
  const { refresh } = useSession();
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    jget('/api/trip').then((d) => {
      setName(d.trip.name || '');
      setDate(d.trip.trip_date ? String(d.trip.trip_date).slice(0, 10) : '');
      setBudget(d.trip.budget_per_person_cents != null ? centsToDollars(d.trip.budget_per_person_cents) : '');
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  async function save() {
    await jpatch('/api/trip', {
      name,
      trip_date: date || null,
      budget_per_person_cents: budget ? dollarsToCents(budget) : null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    refresh();
  }

  return (
    <div className="card pinned-card">
      <div className="spread">
        <h3 style={{ margin: 0 }}>⚙️ Organizer settings</h3>
        <button className="btn sm ghost" onClick={onClose}>Close</button>
      </div>
      <div className="grid cols-3" style={{ marginTop: 10 }}>
        <div><label>Event name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label>Trip date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label>Budget / person ($)</label><input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="500" /></div>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={save}>Save</button>
        {saved && <span className="badge good">Saved ✓</span>}
      </div>
    </div>
  );
}
