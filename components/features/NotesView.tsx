'use client';

import { useEffect, useRef, useState } from 'react';
import { jget, jpost, jpatch, jdel } from '@/lib/client';

type Note = {
  id: number;
  title: string;
  body: string;
  color: string;
  pinned: boolean;
  updated_by: string | null;
};

const COLORS = ['yellow', 'blue', 'green', 'pink'];
const SWATCH: Record<string, string> = {
  yellow: '#e8c552', blue: '#5aa9e6', green: '#5bc98d', pink: '#e67ea6',
};

export function NotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const editingRef = useRef(false); // pause polling while someone is typing

  const load = async () => {
    if (editingRef.current) return;
    try {
      const d = await jget('/api/notes');
      setNotes(d.notes);
    } catch {/* ignore */}
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  async function addNote() {
    await jpost('/api/notes', { title: '', body: '', color: 'yellow' });
    editingRef.current = false;
    load();
  }

  function update(id: number, patch: Partial<Note>) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }

  async function save(n: Note) {
    editingRef.current = false;
    await jpatch('/api/notes', { id: n.id, title: n.title, body: n.body, color: n.color });
    load();
  }

  const pinned = notes.filter((n) => n.pinned);
  const rest = notes.filter((n) => !n.pinned);

  const card = (n: Note) => (
    <div key={n.id} className={`note ${n.color}`}>
      <input
        value={n.title}
        placeholder="Title"
        style={{ fontWeight: 700 }}
        onFocus={() => (editingRef.current = true)}
        onChange={(e) => update(n.id, { title: e.target.value })}
        onBlur={() => save(n)}
      />
      <textarea
        value={n.body}
        placeholder="Write something…"
        style={{ flex: 1, minHeight: 90 }}
        onFocus={() => (editingRef.current = true)}
        onChange={(e) => update(n.id, { body: e.target.value })}
        onBlur={() => save(n)}
      />
      <div className="spread">
        <div className="row" style={{ gap: 4 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { update(n.id, { color: c }); jpatch('/api/notes', { id: n.id, color: c }); }}
              title={c}
              style={{
                width: 16, height: 16, borderRadius: 999, cursor: 'pointer', padding: 0,
                border: n.color === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                background: SWATCH[c],
              }}
            />
          ))}
        </div>
        <div className="row" style={{ gap: 4 }}>
          <button
            className="btn sm ghost"
            title={n.pinned ? 'Unpin from the top' : 'Pin to the top as trip info'}
            onClick={() => { update(n.id, { pinned: !n.pinned }); jpatch('/api/notes', { id: n.id, pinned: !n.pinned }).then(load); }}
          >
            {n.pinned ? '📌' : '📍'}
          </button>
          <button className="btn sm ghost danger" onClick={() => jdel('/api/notes', { id: n.id }).then(load)}>✕</button>
        </div>
      </div>
      {n.updated_by && <div className="tiny muted">last edit: {n.updated_by}</div>}
    </div>
  );

  return (
    <div>
      <div className="spread">
        <p className="page-sub" style={{ margin: 0 }}>Shared scratchpad. Pin a note (📍) to keep it at the top as trip info — address, Wi-Fi, house rules.</p>
        <button className="btn primary" onClick={addNote}>+ Note</button>
      </div>

      {notes.length === 0 && <p className="muted" style={{ marginTop: 14 }}>No notes yet. Add the first one.</p>}

      {pinned.length > 0 && (
        <>
          <div className="day-head">📌 Trip info</div>
          <div className="grid cols-3">{pinned.map(card)}</div>
        </>
      )}

      {rest.length > 0 && (
        <>
          {pinned.length > 0 && <div className="day-head">Notes</div>}
          <div className="grid cols-3" style={{ marginTop: pinned.length > 0 ? 0 : 14 }}>{rest.map(card)}</div>
        </>
      )}
    </div>
  );
}
