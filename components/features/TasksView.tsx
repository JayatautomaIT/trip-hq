'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from '@/components/SessionProvider';
import { jget, jpost, jpatch, jdel } from '@/lib/client';

type Task = { id: number; title: string; assignee: string | null; done: boolean; notes: string | null };
type Guest = { code: string; name: string };

export function TasksView() {
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

  const row = (t: Task) => (
    <div key={t.id} className="card">
      <div className="item" style={{ borderBottom: 'none', padding: 0 }}>
        <input type="checkbox" className="check" checked={t.done} onChange={() => jpatch('/api/tasks', { id: t.id, done: !t.done }).then(load)} />
        <div style={{ flex: 1 }}>
          <span className={t.done ? 'done' : ''} style={{ fontWeight: 600 }}>{t.title}</span>
          <div className="tiny muted">{t.assignee ? `on it: ${nameOf(t.assignee)}` : 'unassigned'}</div>
        </div>
        {isAdmin && (
          <div className="row">
            <select
              value={t.assignee || ''}
              onChange={(e) => jpatch('/api/tasks', { id: t.id, assignee: e.target.value || null }).then(load)}
              style={{ width: 'auto' }}
            >
              <option value="">— assign —</option>
              {guests.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
            </select>
            <button className="btn sm danger" onClick={() => jdel('/api/tasks', { id: t.id }).then(load)}>✕</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <p className="page-sub">Anyone can add a to-do; the organizer assigns it. The assignee ticks it off.</p>

      <div className="card">
        <div className="row">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book the Airbnb…" onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn primary" onClick={add}>Add</button>
        </div>
      </div>

      <div className="stack" style={{ marginTop: 14 }}>
        {open.length === 0 && <p className="muted">Nothing open. Nice.</p>}
        {open.map(row)}
      </div>

      {done.length > 0 && (
        <>
          <div className="day-head">Done</div>
          <div className="stack">{done.map(row)}</div>
        </>
      )}
    </div>
  );
}
