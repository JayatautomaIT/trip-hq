'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { useSession } from '@/components/SessionProvider';
import { jget, jpost, jpatch, jdel } from '@/lib/client';

type Vote = { guest_code: string; choice: string };
type PollDate = { id: number; label: string; votes: Vote[] };

export default function PollPage() {
  return (
    <Protected>
      <Poll />
    </Protected>
  );
}

function Poll() {
  const { isAdmin } = useSession();
  const [dates, setDates] = useState<PollDate[]>([]);
  const [me, setMe] = useState('');
  const [label, setLabel] = useState('');

  const load = () => jget('/api/poll').then((d) => { setDates(d.dates); setMe(d.me); }).catch(() => {});
  useEffect(() => { load(); }, []);

  async function addDate() {
    if (!label.trim()) return;
    await jpost('/api/poll', { label });
    setLabel('');
    load();
  }
  async function vote(pollDateId: number, choice: string) {
    await jpatch('/api/poll', { poll_date_id: pollDateId, choice });
    load();
  }

  const counts = (d: PollDate) => ({
    yes: d.votes.filter((v) => v.choice === 'yes').length,
    maybe: d.votes.filter((v) => v.choice === 'maybe').length,
    no: d.votes.filter((v) => v.choice === 'no').length,
  });
  const score = (d: PollDate) => { const c = counts(d); return c.yes * 2 + c.maybe; };
  const best = dates.length ? Math.max(...dates.map(score)) : 0;

  return (
    <div className="container">
      <h1>Date Poll 📅</h1>
      <p className="page-sub">Mark which options work for you. The best-supported date floats to the top.</p>

      {isAdmin && (
        <div className="card">
          <label>Add a candidate date/window</label>
          <div className="row">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Fri Jun 19 – Sun Jun 21" onKeyDown={(e) => e.key === 'Enter' && addDate()} />
            <button className="btn primary" onClick={addDate}>Add</button>
          </div>
        </div>
      )}

      {dates.length === 0 && <p className="muted" style={{ marginTop: 14 }}>No dates to vote on yet.</p>}

      <div className="stack" style={{ marginTop: 14 }}>
        {[...dates].sort((a, b) => score(b) - score(a)).map((d) => {
          const c = counts(d);
          const mine = d.votes.find((v) => v.guest_code === me)?.choice;
          const isBest = dates.length > 1 && score(d) === best && best > 0;
          return (
            <div key={d.id} className={`card ${isBest ? 'pinned-card' : ''}`}>
              <div className="spread">
                <div className="row">
                  <b>{d.label}</b>
                  {isBest && <span className="badge pin">🏆 front-runner</span>}
                </div>
                {isAdmin && <button className="btn sm danger" onClick={() => jdel('/api/poll', { id: d.id }).then(load)}>✕</button>}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <span className="badge good">✅ {c.yes}</span>
                <span className="badge warn">🤔 {c.maybe}</span>
                <span className="badge bad">❌ {c.no}</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className={`btn sm ${mine === 'yes' ? 'primary' : 'ghost'}`} onClick={() => vote(d.id, 'yes')}>Works</button>
                <button className={`btn sm ${mine === 'maybe' ? 'blue' : 'ghost'}`} onClick={() => vote(d.id, 'maybe')}>Maybe</button>
                <button className={`btn sm ${mine === 'no' ? '' : 'ghost'} ${mine === 'no' ? 'danger' : ''}`} onClick={() => vote(d.id, 'no')}>Can&apos;t</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
