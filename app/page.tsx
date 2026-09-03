'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Protected } from '@/components/Protected';
import { useSession } from '@/components/SessionProvider';
import { jget } from '@/lib/client';

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  return Math.floor(ms / 86400000);
}

const TILES = [
  ['/schedule', '🗓️', 'Schedule', 'The day-by-day plan'],
  ['/ideas', '💡', 'Ideas & Voting', 'Pitch it, vote on it'],
  ['/poll', '📅', 'Date Poll', 'Find the weekend that works'],
  ['/chat', '💬', 'Chat', 'Group chat → to-do / buy / bring'],
  ['/notes', '📝', 'Notes Board', 'Shared brain dump'],
  ['/tasks', '✅', 'To-Do', "Who's handling what"],
  ['/meals', '🍔', 'Meal Planner', 'Plan meals → shopping list'],
  ['/packing', '🎒', 'Packing & Shopping', 'Your list + the group list'],
  ['/files', '📸', 'Files & Photos', 'Share pics, tickets, PDFs'],
  ['/expenses', '💸', 'Money', 'Expenses & who owes what'],
  ['/info', '📍', 'Trip Info', 'Address, Wi-Fi, rides, rules'],
  ['/guys', '🧑‍🤝‍🧑', 'The Guys', 'Roster & RSVPs'],
];

export default function Home() {
  return (
    <Protected>
      <Dashboard />
    </Protected>
  );
}

function Dashboard() {
  const { session } = useSession();
  const [pins, setPins] = useState<{ label: string; kind: string; where: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const days = daysUntil(session?.tripDate ?? null);

  function shareSummary() {
    const lines = [
      `🍻 ${session?.tripName || 'Trip'}`,
      session?.tripDate ? `📅 ${session.tripDate}${days !== null && days > 0 ? ` — ${days} days to go` : ''}` : '',
      '',
      'Locked in so far:',
      ...(pins.length ? pins.map((p) => `✅ ${p.label}`) : ['(nothing pinned yet)']),
    ].filter((l) => l !== '');
    const text = lines.join('\n');
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  useEffect(() => {
    (async () => {
      try {
        const [ev, id, ml] = await Promise.all([
          jget('/api/events'),
          jget('/api/ideas'),
          jget('/api/meals'),
        ]);
        const p: { label: string; kind: string; where: string }[] = [];
        for (const e of ev.events) if (e.pinned) p.push({ label: e.title, kind: 'Event', where: '/schedule' });
        for (const i of id.ideas) if (i.pinned) p.push({ label: i.title, kind: 'Idea', where: '/ideas' });
        for (const m of ml.meals) if (m.pinned) p.push({ label: m.title, kind: 'Meal', where: '/meals' });
        setPins(p);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return (
    <div className="container">
      <div className="spread">
        <h1>Welcome, {session?.name?.split(' ')[0]} 🍻</h1>
        <button className="btn sm" onClick={shareSummary}>{copied ? 'Copied ✓' : '📋 Copy summary'}</button>
      </div>
      <p className="page-sub">{session?.tripName} — everything for the trip in one place.</p>

      {days !== null && (
        <div className="card">
          <div className="spread">
            <h2 style={{ margin: 0 }}>Countdown</h2>
            <span className="muted small">{session?.tripDate}</span>
          </div>
          <div className="count-wrap" style={{ marginTop: 12 }}>
            {days > 0 ? (
              <div className="count-box">
                <b>{days}</b>
                <span>days to go</span>
              </div>
            ) : days === 0 ? (
              <div className="count-box"><b>🎉</b><span>it&apos;s today!</span></div>
            ) : (
              <div className="count-box"><b>{Math.abs(days)}</b><span>days ago</span></div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h2>✅ Locked in</h2>
        {pins.length === 0 ? (
          <p className="muted small">Nothing pinned yet. The organizer pins things once they&apos;re decided.</p>
        ) : (
          <div className="stack">
            {pins.map((p, i) => (
              <Link key={i} href={p.where} className="item" style={{ textDecoration: 'none', color: 'var(--text)' }}>
                <span className="badge pin">📌 {p.kind}</span>
                <span>{p.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <h2 style={{ marginTop: 22 }}>Jump to</h2>
      <div className="grid cols-2">
        {TILES.map(([href, icon, title, sub]) => (
          <Link key={href} href={href} className="card" style={{ textDecoration: 'none', color: 'var(--text)' }}>
            <div className="row">
              <span style={{ fontSize: 26 }}>{icon}</span>
              <div>
                <h3>{title}</h3>
                <div className="muted small">{sub}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
