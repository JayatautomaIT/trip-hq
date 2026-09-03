'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { useSession } from '@/components/SessionProvider';
import { jget, jpost, jpatch, jdel } from '@/lib/client';

type Ingredient = { id: number; text: string; qty: string | null };
type Meal = {
  id: number;
  day: string | null;
  slot: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  pinned: boolean;
  ingredients: Ingredient[];
};

const SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const norm = (v: any) => (v ? String(v).slice(0, 10) : '');
function dayLabel(d: string | null) {
  if (!d) return 'Anytime';
  return new Date(norm(d) + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function MealsPage() {
  return (
    <Protected>
      <Meals />
    </Protected>
  );
}

function Meals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [diets, setDiets] = useState<{ name: string; diet: string }[]>([]);
  const [toast, setToast] = useState('');
  const [f, setF] = useState({ day: '', slot: 'Dinner', title: '', location: '' });

  const load = () => jget('/api/meals').then((d) => setMeals(d.meals)).catch(() => {});
  useEffect(() => {
    load();
    jget('/api/guests').then((d) => setDiets(d.guests.filter((g: any) => g.diet).map((g: any) => ({ name: g.name, diet: g.diet })))).catch(() => {});
  }, []);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  async function add() {
    if (!f.title.trim()) return;
    await jpost('/api/meals', { ...f, day: f.day || null });
    setF({ day: f.day, slot: f.slot, title: '', location: '' });
    load();
  }

  const groups: Record<string, Meal[]> = {};
  for (const m of meals) (groups[norm(m.day) || 'zzz'] ||= []).push(m);
  const keys = Object.keys(groups).sort();

  return (
    <div className="container">
      <h1>Meal Planner 🍔</h1>
      <p className="page-sub">Plan meals together. Add ingredients to any meal, then send them to the shared shopping list.</p>

      {diets.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(255,207,92,0.4)' }}>
          <h3 style={{ marginBottom: 6 }}>🍽️ Dietary notes</h3>
          {diets.map((d, i) => <div key={i} className="small">• <b>{d.name}</b>: {d.diet}</div>)}
          <p className="tiny muted" style={{ marginTop: 6 }}>Guys set these on the Guys page.</p>
        </div>
      )}

      <div className="card">
        <div className="grid cols-2">
          <div><label>Day</label><input type="date" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></div>
          <div>
            <label>Meal</label>
            <select value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })}>
              {SLOTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 10 }}><label>What are we eating?</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Steak night" /></div>
        <div style={{ marginTop: 10 }}><label>Where / who&apos;s cooking</label><input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Airbnb — Mike grilling" /></div>
        <div style={{ marginTop: 10 }}><button className="btn primary" onClick={add}>+ Add meal</button></div>
      </div>

      {meals.length === 0 && <p className="muted" style={{ marginTop: 16 }}>No meals planned yet.</p>}

      {keys.map((k) => (
        <div key={k}>
          <div className="day-head">{dayLabel(k === 'zzz' ? null : k)}</div>
          <div className="stack">
            {groups[k].map((m) => <MealCard key={m.id} meal={m} onChange={load} onFlash={flash} />)}
          </div>
        </div>
      ))}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function MealCard({ meal, onChange, onFlash }: { meal: Meal; onChange: () => void; onFlash: (m: string) => void }) {
  const { isAdmin } = useSession();
  const [ing, setIng] = useState({ text: '', qty: '' });

  async function addIngredient() {
    if (!ing.text.trim()) return;
    await jpatch('/api/meals', { id: meal.id, addIngredient: { text: ing.text, qty: ing.qty } });
    setIng({ text: '', qty: '' });
    onChange();
  }

  async function toShopping() {
    const r = await jpost(`/api/meals/${meal.id}/to-shopping`).catch((e) => { onFlash(e.message); return null; });
    if (r) onFlash(`Added ${r.added} item(s) to the shopping list ✓`);
  }

  return (
    <div className={`card ${meal.pinned ? 'pinned-card' : ''}`}>
      <div className="spread">
        <div className="row">
          {meal.slot && <span className="badge blue">{meal.slot}</span>}
          <b>{meal.title}</b>
          {meal.pinned && <span className="badge pin">📌 locked in</span>}
        </div>
        <div className="row">
          {isAdmin && (
            <button className="btn sm ghost" onClick={() => jpatch('/api/meals', { id: meal.id, pinned: !meal.pinned }).then(onChange)}>
              {meal.pinned ? 'Unpin' : 'Pin'}
            </button>
          )}
          <button className="btn sm danger" onClick={() => jdel('/api/meals', { id: meal.id }).then(onChange)}>✕</button>
        </div>
      </div>
      {meal.location && <div className="small muted" style={{ marginTop: 4 }}>👨‍🍳 {meal.location}</div>}

      <div className="divider" />
      <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>Ingredients</div>
      {meal.ingredients.length === 0 && <div className="tiny muted">None yet.</div>}
      {meal.ingredients.map((i) => (
        <div key={i.id} className="item" style={{ padding: '5px 2px' }}>
          <span style={{ flex: 1 }}>{i.text}{i.qty ? <span className="muted"> — {i.qty}</span> : null}</span>
          <button className="btn sm ghost danger" onClick={() => jpatch('/api/meals', { id: meal.id, removeIngredient: i.id }).then(onChange)}>✕</button>
        </div>
      ))}

      <div className="row" style={{ marginTop: 8 }}>
        <input style={{ flex: 2 }} value={ing.text} onChange={(e) => setIng({ ...ing, text: e.target.value })} placeholder="Add ingredient" onKeyDown={(e) => e.key === 'Enter' && addIngredient()} />
        <input style={{ flex: 1, minWidth: 80 }} value={ing.qty} onChange={(e) => setIng({ ...ing, qty: e.target.value })} placeholder="qty" onKeyDown={(e) => e.key === 'Enter' && addIngredient()} />
        <button className="btn sm" onClick={addIngredient}>Add</button>
      </div>
      {meal.ingredients.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button className="btn sm blue" onClick={toShopping}>🛒 Add ingredients to shopping list</button>
        </div>
      )}
    </div>
  );
}
