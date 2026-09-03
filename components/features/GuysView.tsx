'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/components/SessionProvider';
import { jget, jpost, jpatch, jdel } from '@/lib/client';

type Guest = {
  code: string; name: string; rsvp: string; contact: string | null;
  pay_handle: string | null; diet: string | null;
};

const RSVPS = [
  ['yes', "I'm in"],
  ['maybe', 'Maybe'],
  ['no', "Can't make it"],
] as const;

export function GuysView() {
  const { session, isAdmin } = useSession();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [nf, setNf] = useState({ name: '', code: '', contact: '' });

  const load = () => jget('/api/guests').then((d) => setGuests(d.guests)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function addGuy() {
    const code = nf.code.trim() || nf.name.toLowerCase().replace(/\s+/g, '');
    if (!nf.name.trim() || !code) return;
    await jpost('/api/guests', { name: nf.name, code, contact: nf.contact });
    setNf({ name: '', code: '', contact: '' });
    load();
  }

  const counts = {
    yes: guests.filter((g) => g.rsvp === 'yes').length,
    maybe: guests.filter((g) => g.rsvp === 'maybe').length,
    no: guests.filter((g) => g.rsvp === 'no').length,
    pending: guests.filter((g) => g.rsvp === 'pending').length,
  };

  return (
    <div>
      <p className="page-sub">Set your own RSVP and details. {isAdmin ? 'As organizer you can edit anyone.' : ''}</p>

      <div className="card">
        <div className="row">
          <span className="badge good">✅ In: {counts.yes}</span>
          <span className="badge warn">🤔 Maybe: {counts.maybe}</span>
          <span className="badge bad">❌ Out: {counts.no}</span>
          <span className="badge">⏳ No reply: {counts.pending}</span>
        </div>
      </div>

      <MyDetails guests={guests} onSaved={load} />

      <div className="stack" style={{ marginTop: 14 }}>
        {guests.map((g) => {
          const isMe = g.code === session?.code;
          const canEdit = isMe || isAdmin;
          return (
            <div key={g.code} className="card">
              <div className="spread">
                <div>
                  <div className="row">
                    <b>{g.name}</b>
                    {isMe && <span className="badge blue">you</span>}
                    {g.rsvp === 'yes' && <span className="badge good">in</span>}
                    {g.rsvp === 'maybe' && <span className="badge warn">maybe</span>}
                    {g.rsvp === 'no' && <span className="badge bad">out</span>}
                    {g.rsvp === 'pending' && <span className="badge">no reply</span>}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 3 }}>
                    code: {g.code}{g.contact ? ` · ${g.contact}` : ''}{g.pay_handle ? ` · 💸 ${g.pay_handle}` : ''}
                  </div>
                  {g.diet && <div className="tiny" style={{ marginTop: 2 }}>🍽️ {g.diet}</div>}
                </div>
                {isAdmin && (
                  <button className="btn sm danger" onClick={() => jdel('/api/guests', { code: g.code }).then(load)}>Remove</button>
                )}
              </div>
              {canEdit && (
                <div className="row" style={{ marginTop: 10 }}>
                  {RSVPS.map(([val, label]) => (
                    <button
                      key={val}
                      className={`btn sm ${g.rsvp === val ? 'primary' : 'ghost'}`}
                      onClick={() => jpatch('/api/guests', { code: g.code, rsvp: val }).then(load)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 10 }}>Add a guy</h3>
          <div className="grid cols-3">
            <div><label>Name</label><input value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder="John Smith" /></div>
            <div><label>Login code</label><input value={nf.code} onChange={(e) => setNf({ ...nf, code: e.target.value })} placeholder="johnsmith (auto if blank)" /></div>
            <div><label>Contact (optional)</label><input value={nf.contact} onChange={(e) => setNf({ ...nf, contact: e.target.value })} placeholder="phone / email" /></div>
          </div>
          <div style={{ marginTop: 10 }}><button className="btn primary" onClick={addGuy}>Add</button></div>
          <p className="tiny muted" style={{ marginTop: 8 }}>Their login is the event code + this name code. Tell them both.</p>
        </div>
      )}
    </div>
  );
}

function MyDetails({ guests, onSaved }: { guests: Guest[]; onSaved: () => void }) {
  const { session } = useSession();
  const me = guests.find((g) => g.code === session?.code);
  const [handle, setHandle] = useState('');
  const [diet, setDiet] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (me) { setHandle(me.pay_handle || ''); setDiet(me.diet || ''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.pay_handle, me?.diet]);

  if (!me) return null;

  async function save() {
    await jpatch('/api/guests', { code: session!.code, pay_handle: handle, diet });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onSaved();
  }

  return (
    <div className="card pinned-card">
      <h3 style={{ marginBottom: 10 }}>My details</h3>
      <div className="grid cols-2">
        <div>
          <label>Payment handle (for settling up)</label>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@venmo / e-transfer email" />
        </div>
        <div>
          <label>Dietary notes (shows in meal planner)</label>
          <input value={diet} onChange={(e) => setDiet(e.target.value)} placeholder="e.g. no shellfish, veggie" />
        </div>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={save}>Save my details</button>
        {saved && <span className="badge good">Saved ✓</span>}
      </div>
    </div>
  );
}
