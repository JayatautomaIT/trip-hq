'use client';

import { useEffect, useMemo, useState } from 'react';
import { Protected } from '@/components/Protected';
import { useSession } from '@/components/SessionProvider';
import { jget, jpost, jpatch, jdel } from '@/lib/client';

type Task = { id: number; title: string; assignee: string | null; done: boolean; notes: string | null };
type Guest = { code: string; name: string };

export default function TasksPage() {
  return (
    <Protected>
      <Tasks />
    </Protected>
  );
}

function Tasks() {
  const { isAdmin } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [title, setTitle] = useState('');

  const load = () => {
    jget('/api/tasks').then((d) => setTasks(d.tasks)).catch(() => {});
    jget('/api/guests').then((d) => setGuests(d.guests)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const nameOf = useMemo(() => {
    const m: Record<string, string> = {};
    for (const g of guests) m[g.code] = g.name;
    return (c: string | null) => (c ? m[c] || c : null);
  }, [guests]);

  async function add() {
    if (!title.trim()) return;
    await jpost('/api/tasks', { title });
    setTitle('');
    load();
  }

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="container">
      <h1>To-Do &amp; Assignments ✅</h1>
      <p className="page-sub">Who&apos;s handling what. Anyone can add a task; the organizer assigns people. The assignee ticks it off.</p>

      <div className="card">
        <div className="row">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book the Airbnb…" onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn primary" onClick={add}>Add</button>
        </div>
      </div>

      <div className="stack" style={{ marginTop: 14 }}>
        {open.length === 0 && <p className="muted">Nothing open. Nice.</p>}
        {open.map((t) => <TaskRow key={t.id} t={t} guests={guests} nameOf={nameOf} isAdmin={isAdmin} onChange={load} />)}
      </div>

      {done.length > 0 && (
        <>
          <div className="day-head">Done</div>
          <div className="stack">
            {done.map((t) => <TaskRow key={t.id} t={t} guests={guests} nameOf={nameOf} isAdmin={isAdmin} onChange={load} />)}
          </div>
        </>
      )}
    </div>
  );
}

function TaskRow({ t, guests, nameOf, isAdmin, onChange }: {
  t: Task; guests: Guest[]; nameOf: (c: string | null) => string | null; isAdmin: boolean; onChange: () => void;
}) {
  return (
    <div className="card">
      <div className="item" style={{ borderBottom: 'none', padding: 0 }}>
        <input type="checkbox" className="check" checked={t.done} onChange={() => jpatch('/api/tasks', { id: t.id, done: !t.done }).then(onChange)} />
        <div style={{ flex: 1 }}>
          <span className={t.done ? 'done' : ''} style={{ fontWeight: 600 }}>{t.title}</span>
          <div className="tiny muted">{t.assignee ? `on it: ${nameOf(t.assignee)}` : 'unassigned'}</div>
        </div>
        {isAdmin && (
          <div className="row">
            <select
              value={t.assignee || ''}
              onChange={(e) => jpatch('/api/tasks', { id: t.id, assignee: e.target.value || null }).then(onChange)}
              style={{ width: 'auto' }}
            >
              <option value="">— assign —</option>
              {guests.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
            </select>
            <button className="btn sm danger" onClick={() => jdel('/api/tasks', { id: t.id }).then(onChange)}>✕</button>
          </div>
        )}
      </div>
    </div>
  );
}
