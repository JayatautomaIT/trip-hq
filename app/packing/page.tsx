'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { jget, jpost, jpatch, jdel } from '@/lib/client';

type Item = { id: number; text: string; checked: boolean; public: boolean };
type ShopItem = { id: number; text: string; checked: boolean; qty: string | null; source: string | null; added_by: string | null };
type SharedItem = { id: number; text: string; guest_code: string; name: string };

export default function PackingPage() {
  return (
    <Protected>
      <div className="container">
        <h1>Packing & Shopping 🎒</h1>
        <p className="page-sub">Your packing list is private — flip the 👁 on an item to show the group you&apos;re bringing it. The shopping list is shared.</p>
        <div className="grid cols-2">
          <PersonalList />
          <SharedList />
        </div>
        <EveryonesBringing />
      </div>
    </Protected>
  );
}

function PersonalList() {
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState('');
  const load = () => jget('/api/packing').then((d) => setItems(d.items)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function add() {
    if (!text.trim()) return;
    await jpost('/api/packing', { text });
    setText('');
    load();
  }

  const remaining = items.filter((i) => !i.checked).length;

  return (
    <div className="card">
      <div className="spread">
        <h2 style={{ margin: 0 }}>My packing list</h2>
        <span className="badge">{remaining} to pack</span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 0' }}>Private to you. 👁 = shown on the group board.</p>
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
            title={i.public ? 'Shown to the group — click to make private' : 'Private — click to show the group'}
            onClick={() => jpatch('/api/packing', { id: i.id, public: !i.public }).then(load)}
          >
            {i.public ? '👁 shared' : '👁'}
          </button>
          <button className="btn sm ghost danger" onClick={() => jdel('/api/packing', { id: i.id }).then(load)}>✕</button>
        </div>
      ))}
    </div>
  );
}

function SharedList() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [text, setText] = useState('');
  const [qty, setQty] = useState('');
  const load = () => jget('/api/shopping').then((d) => setItems(d.items)).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  async function add() {
    if (!text.trim()) return;
    await jpost('/api/shopping', { text, qty });
    setText(''); setQty('');
    load();
  }

  const remaining = items.filter((i) => !i.checked).length;

  return (
    <div className="card">
      <div className="spread">
        <h2 style={{ margin: 0 }}>Group shopping list</h2>
        <span className="badge">{remaining} to buy</span>
      </div>
      <p className="tiny muted" style={{ margin: '4px 0 0' }}>Shared with everyone. Meal ingredients land here too.</p>
      <div className="row" style={{ margin: '10px 0' }}>
        <input style={{ flex: 2 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Beer, ice, buns…" onKeyDown={(e) => e.key === 'Enter' && add()} />
        <input style={{ flex: 1, minWidth: 70 }} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="qty" onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn primary" onClick={add}>Add</button>
      </div>
      {items.length === 0 && <p className="muted small">Empty. Add items or send ingredients from the meal planner.</p>}
      {items.map((i) => (
        <div key={i.id} className="item">
          <input type="checkbox" className="check" checked={i.checked} onChange={() => jpatch('/api/shopping', { id: i.id, checked: !i.checked }).then(load)} />
          <span style={{ flex: 1 }} className={i.checked ? 'done' : ''}>
            {i.text}{i.qty ? <span className="muted"> — {i.qty}</span> : null}
            {i.source && <span className="tiny muted"> · {i.source}</span>}
          </span>
          <button className="btn sm ghost danger" onClick={() => jdel('/api/shopping', { id: i.id }).then(load)}>✕</button>
        </div>
      ))}
      {items.some((i) => i.checked) && (
        <div style={{ marginTop: 10 }}>
          <button className="btn sm ghost" onClick={() => jdel('/api/shopping', { clearChecked: true }).then(load)}>Clear checked-off items</button>
        </div>
      )}
    </div>
  );
}

function EveryonesBringing() {
  const [items, setItems] = useState<SharedItem[]>([]);
  const load = () => jget('/api/packing/shared').then((d) => setItems(d.items)).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  const byGuest: Record<string, { name: string; items: string[] }> = {};
  for (const i of items) {
    (byGuest[i.guest_code] ||= { name: i.name, items: [] }).items.push(i.text);
  }
  const guys = Object.values(byGuest);

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h2 style={{ margin: 0 }}>What everyone&apos;s bringing 👀</h2>
      <p className="tiny muted" style={{ margin: '4px 0 10px' }}>Only items people chose to share. Check before you double-pack the speaker.</p>
      {guys.length === 0 ? (
        <p className="muted small">Nobody&apos;s shared anything yet. Flip the 👁 on one of your items above.</p>
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
  );
}
