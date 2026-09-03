'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { useSession } from '@/components/SessionProvider';
import { jget, jpost, jpatch, jdel } from '@/lib/client';

type Ev = {
  id: number;
  day: string | null;
  start_time: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  pinned: boolean;
};

const norm = (v: any) => (v ? String(v).slice(0, 10) : '');
function dayLabel(d: string | null) {
  if (!d) return 'Unscheduled';
  const date = new Date(norm(d) + 'T00:00:00');
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function SchedulePage() {
  return (
    <Protected>
      <Schedule />
    </Protected>
  );
}

function Schedule() {
  const { isAdmin } = useSession();
  const [events, setEvents] = useState<Ev[]>([]);
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  const load = () => jget('/api/events').then((d) => setEvents(d.events)).catch(() => {});
  useEffect(() => { load(); }, []);

  const groups: Record<string, Ev[]> = {};
  for (const e of events) {
    const k = norm(e.day) || 'zzz';
    (groups[k] ||= []).push(e);
  }
  const keys = Object.keys(groups).sort();

  return (
    <div className="container">
      <h1>Schedule</h1>
      <p className="page-sub">The plan, day by day. {isAdmin ? 'You can edit and pin the locked-in ones.' : 'Only the organizer edits this.'}</p>

      {isAdmin && editing !== 'new' && (
        <button className="btn primary" onClick={() => setEditing('new')}>+ Add event</button>
      )}
      {isAdmin && editing === 'new' && (
        <EventForm onDone={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
      )}

      {keys.length === 0 && <p className="muted" style={{ marginTop: 16 }}>Nothing on the schedule yet.</p>}

      {keys.map((k) => (
        <div key={k}>
          <div className="day-head">{dayLabel(k === 'zzz' ? null : k)}</div>
          <div className="card">
            {groups[k].map((e) => (
              <div key={e.id} className="item" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  {editing === e.id ? (
                    <EventForm ev={e} onDone={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
                  ) : (
                    <>
                      <div className="row">
                        {e.start_time && <span className="badge blue">{e.start_time}</span>}
                        <b>{e.title}</b>
                        {e.pinned && <span className="badge pin">📌 locked in</span>}
                      </div>
                      {e.location && <div className="small muted">📍 {e.location}</div>}
                      {e.notes && <div className="small" style={{ marginTop: 4 }}>{e.notes}</div>}
                    </>
                  )}
                </div>
                {isAdmin && editing !== e.id && (
                  <div className="row">
                    <button className="btn sm ghost" onClick={() => jpatch('/api/events', { id: e.id, pinned: !e.pinned }).then(load)}>
                      {e.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button className="btn sm ghost" onClick={() => setEditing(e.id)}>Edit</button>
                    <button className="btn sm danger" onClick={() => jdel('/api/events', { id: e.id }).then(load)}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventForm({ ev, onDone, onCancel }: { ev?: Ev; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    day: norm(ev?.day),
    start_time: ev?.start_time || '',
    title: ev?.title || '',
    location: ev?.location || '',
    notes: ev?.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.title) return;
    setBusy(true);
    const payload = { ...f, day: f.day || null };
    if (ev) await jpatch('/api/events', { id: ev.id, ...payload });
    else await jpost('/api/events', payload);
    setBusy(false);
    onDone();
  }

  return (
    <div className="card" style={{ margin: '10px 0' }}>
      <div className="grid cols-2">
        <div><label>Day</label><input type="date" value={f.day} onChange={(e) => set('day', e.target.value)} /></div>
        <div><label>Time</label><input value={f.start_time} onChange={(e) => set('start_time', e.target.value)} placeholder="7:30 PM" /></div>
      </div>
      <div style={{ marginTop: 10 }}><label>What</label><input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Dinner at the steakhouse" /></div>
      <div style={{ marginTop: 10 }}><label>Where</label><input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="Location" /></div>
      <div style={{ marginTop: 10 }}><label>Notes</label><textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={save} disabled={busy}>Save</button>
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
