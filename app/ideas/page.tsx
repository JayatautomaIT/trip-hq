'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { useSession } from '@/components/SessionProvider';
import { jget, jpost, jpatch, jdel } from '@/lib/client';

type Idea = {
  id: number;
  title: string;
  notes: string | null;
  url: string | null;
  category: string | null;
  status: string;
  pinned: boolean;
  created_by: string | null;
  votes: number;
  voted: boolean;
};

export default function IdeasPage() {
  return (
    <Protected>
      <Ideas />
    </Protected>
  );
}

function Ideas() {
  const { isAdmin } = useSession();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [f, setF] = useState({ title: '', category: '', url: '', notes: '' });
  const [busy, setBusy] = useState(false);

  const load = () => jget('/api/ideas').then((d) => setIdeas(d.ideas)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function add() {
    if (!f.title.trim()) return;
    setBusy(true);
    await jpost('/api/ideas', f);
    setF({ title: '', category: '', url: '', notes: '' });
    setBusy(false);
    load();
  }

  async function vote(id: number) {
    await jpost(`/api/ideas/${id}/vote`);
    load();
  }

  return (
    <div className="container">
      <h1>Ideas & Voting 💡</h1>
      <p className="page-sub">Pitch anything — bars, activities, restaurants. Everyone votes; the organizer pins what&apos;s locked in.</p>

      <div className="card">
        <div className="grid cols-2">
          <div><label>Idea</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Go-karting Saturday afternoon" /></div>
          <div><label>Category</label><input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Activity / Bar / Food…" /></div>
        </div>
        <div style={{ marginTop: 10 }}><label>Link (optional)</label><input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://…" /></div>
        <div style={{ marginTop: 10 }}><label>Notes (optional)</label><textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <div style={{ marginTop: 10 }}><button className="btn primary" onClick={add} disabled={busy}>+ Add idea</button></div>
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        {ideas.length === 0 && <p className="muted">No ideas yet — be the first.</p>}
        {ideas.map((i) => (
          <div key={i.id} className={`card ${i.pinned ? 'pinned-card' : ''}`}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <button className={`vote-btn ${i.voted ? 'voted' : ''}`} onClick={() => vote(i.id)} title="Toggle your vote">
                <span className="vote-count">{i.votes}</span>
                <span className="tiny">{i.voted ? '✓ voted' : 'vote'}</span>
              </button>
              <div style={{ flex: 1 }}>
                <div className="row">
                  <b>{i.title}</b>
                  {i.pinned && <span className="badge pin">📌 locked in</span>}
                  {i.status === 'decided' && !i.pinned && <span className="badge good">decided</span>}
                  {i.status === 'rejected' && <span className="badge bad">passed</span>}
                  {i.category && <span className="badge blue">{i.category}</span>}
                </div>
                {i.notes && <div className="small" style={{ marginTop: 4 }}>{i.notes}</div>}
                {i.url && (
                  <div className="small" style={{ marginTop: 4 }}>
                    <a href={i.url} target="_blank" rel="noreferrer">{i.url}</a>
                  </div>
                )}
                <div className="tiny muted" style={{ marginTop: 6 }}>added by {i.created_by || 'someone'}</div>
              </div>
            </div>
            {isAdmin && (
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn sm" onClick={() => jpatch('/api/ideas', { id: i.id, pinned: !i.pinned }).then(load)}>
                  {i.pinned ? 'Unpin' : '📌 Pin (lock in)'}
                </button>
                <button className="btn sm ghost" onClick={() => jpatch('/api/ideas', { id: i.id, status: i.status === 'decided' ? 'open' : 'decided' }).then(load)}>
                  {i.status === 'decided' ? 'Un-decide' : 'Mark decided'}
                </button>
                <button className="btn sm ghost" onClick={() => jpatch('/api/ideas', { id: i.id, status: i.status === 'rejected' ? 'open' : 'rejected' }).then(load)}>
                  {i.status === 'rejected' ? 'Un-pass' : 'Pass'}
                </button>
                <button className="btn sm danger" onClick={() => jdel('/api/ideas', { id: i.id }).then(load)}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
