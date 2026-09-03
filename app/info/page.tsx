'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { useSession } from '@/components/SessionProvider';
import { jget, jpost, jpatch, jdel } from '@/lib/client';
import { dollarsToCents, centsToDollars } from '@/lib/money';

type Section = { id: number; label: string; body: string | null };

export default function InfoPage() {
  return (
    <Protected>
      <Info />
    </Protected>
  );
}

function Info() {
  const { isAdmin, refresh } = useSession();
  const [sections, setSections] = useState<Section[]>([]);
  const [nl, setNl] = useState('');

  const load = () => jget('/api/info').then((d) => setSections(d.sections)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function addSection() {
    if (!nl.trim()) return;
    await jpost('/api/info', { label: nl });
    setNl('');
    load();
  }

  return (
    <div className="container">
      <h1>Trip Info 📍</h1>
      <p className="page-sub">Address, Wi-Fi, house rules, rides, rooming, emergency contacts — the stuff everyone asks for.</p>

      {isAdmin && <EventSettings onSaved={refresh} />}

      <div className="stack">
        {sections.map((s) => <SectionCard key={s.id} section={s} isAdmin={isAdmin} onChange={load} />)}
      </div>

      {isAdmin && (
        <div className="card" style={{ marginTop: 14 }}>
          <label>Add a section</label>
          <div className="row">
            <input value={nl} onChange={(e) => setNl(e.target.value)} placeholder="e.g. Flights, Dress code…" onKeyDown={(e) => e.key === 'Enter' && addSection()} />
            <button className="btn primary" onClick={addSection}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({ section, isAdmin, onChange }: { section: Section; isAdmin: boolean; onChange: () => void }) {
  const [body, setBody] = useState(section.body || '');
  const [label, setLabel] = useState(section.label);
  const [dirty, setDirty] = useState(false);

  return (
    <div className="card">
      {isAdmin ? (
        <input value={label} onChange={(e) => { setLabel(e.target.value); setDirty(true); }} style={{ fontWeight: 700, marginBottom: 8 }} />
      ) : (
        <h3 style={{ marginBottom: 8 }}>{section.label}</h3>
      )}
      {isAdmin ? (
        <textarea value={body} onChange={(e) => { setBody(e.target.value); setDirty(true); }} />
      ) : (
        <div style={{ whiteSpace: 'pre-wrap' }} className={section.body ? '' : 'muted'}>{section.body || 'Nothing here yet.'}</div>
      )}
      {isAdmin && (
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn sm primary" disabled={!dirty} onClick={() => jpatch('/api/info', { id: section.id, label, body }).then(() => { setDirty(false); onChange(); })}>Save</button>
          <button className="btn sm danger" onClick={() => jdel('/api/info', { id: section.id }).then(onChange)}>Delete</button>
        </div>
      )}
    </div>
  );
}

function EventSettings({ onSaved }: { onSaved: () => void }) {
  const [trip, setTrip] = useState<{ name: string; trip_date: string | null; budget_per_person_cents: number | null } | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    jget('/api/trip').then((d) => {
      setTrip(d.trip);
      setName(d.trip.name || '');
      setDate(d.trip.trip_date ? String(d.trip.trip_date).slice(0, 10) : '');
      setBudget(d.trip.budget_per_person_cents != null ? centsToDollars(d.trip.budget_per_person_cents) : '');
    }).catch(() => {});
  }, []);

  if (!trip) return null;

  async function save() {
    await jpatch('/api/trip', {
      name,
      trip_date: date || null,
      budget_per_person_cents: budget ? dollarsToCents(budget) : null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onSaved();
  }

  return (
    <div className="card pinned-card">
      <h3 style={{ marginBottom: 10 }}>Event settings (organizer)</h3>
      <div className="grid cols-3">
        <div><label>Event name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label>Trip date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label>Budget / person ($)</label><input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 500" /></div>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={save}>Save settings</button>
        {saved && <span className="badge good">Saved ✓</span>}
      </div>
    </div>
  );
}
