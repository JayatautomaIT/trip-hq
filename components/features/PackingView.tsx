'use client';

import { useEffect, useState } from 'react';
import { jget, jpost, jpatch, jdel } from '@/lib/client';

type Item = { id: number; text: string; checked: boolean; public: boolean };
type SharedItem = { id: number; text: string; guest_code: string; name: string };

export function PackingView() {
  const [items, setItems] = useState<Item[]>([]);
  const [shared, setShared] = useState<SharedItem[]>([]);
  const [text, setText] = useState('');

  const load = () => {
    jget('/api/packing').then((d) => setItems(d.items)).catch(() => {});
    jget('/api/packing/shared').then((d) => setShared(d.items)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  async function add() {
    if (!text.trim()) return;
    await jpost('/api/packing', { text });
    setText('');
    load();
  }

  const remaining = items.filter((i) => !i.checked).length;

  const byGuest: Record<string, { name: string; items: string[] }> = {};
  for (const i of shared) (byGuest[i.guest_code] ||= { name: i.name, items: [] }).items.push(i.text);
  const guys = Object.values(byGuest);

  return (
    <div>
      <p className="page-sub">Your list is private. Tap 👁 on an item to show the group you&apos;re bringing it.</p>

      <div className="card">
        <div className="spread">
          <h2 style={{ margin: 0 }}>My packing list</h2>
          <span className="badge">{remaining} to pack</span>
        </div>
        <div className="row" style={{ margin: '10px 0' }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Boxers, charger, sunglasses…" onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn primary" onClick={add}>Add</button>
        </div>
        {items.length === 0 && <p className="muted small">Nothing here yet — just for you.</p>}
        {items.map((i) => (
          <div key={i.id} className="item">
            <input type="checkbox" className="check" checked={i.checked} onChange={() => jpatch('/api/packing', { id: i.id, checked: !i.checked }).then(load)} />
            <span style={{ flex: 1 }} className={i.checked ? 'done' : ''}>{i.text}</span>
            <button
              className={`btn sm ${i.public ? 'blue' : 'ghost'}`}
              title={i.public ? 'Shared with the group — tap to make private' : 'Private — tap to show the group'}
              onClick={() => jpatch('/api/packing', { id: i.id, public: !i.public }).then(load)}
            >
              {i.public ? '👁 shared' : '👁'}
            </button>
            <button className="btn sm ghost danger" onClick={() => jdel('/api/packing', { id: i.id }).then(load)}>✕</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 style={{ margin: 0 }}>What everyone&apos;s bringing</h2>
        <p className="tiny muted" style={{ margin: '4px 0 10px' }}>Only shared items. Check before you double-pack the speaker.</p>
        {guys.length === 0 ? (
          <p className="muted small">Nobody&apos;s shared anything yet.</p>
        ) : (
          <div className="grid cols-3">
            {guys.map((g, i) => (
              <div key={i} className="card" style={{ padding: 12 }}>
                <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>{g.name}</div>
                {g.items.map((t, j) => <div key={j} className="small">• {t}</div>)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
