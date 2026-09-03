'use client';

import { useEffect, useState } from 'react';
import { jget, jpost, jpatch, jdel } from '@/lib/client';

type ShopItem = {
  id: number; text: string; qty: string | null; checked: boolean;
  source: string | null; added_by: string | null;
};

export function ShoppingView() {
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
    <div>
      <p className="page-sub">Shared with everyone. Meal ingredients land here automatically.</p>

      <div className="card">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Group shopping list</h2>
          <span className="badge">{remaining} to buy</span>
        </div>
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
    </div>
  );
}
