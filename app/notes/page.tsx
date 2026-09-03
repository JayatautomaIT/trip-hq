'use client';

import { useEffect, useRef, useState } from 'react';
import { Protected } from '@/components/Protected';
import { jget, jpost, jpatch, jdel } from '@/lib/client';

type Note = { id: number; title: string; body: string; color: string; updated_by: string | null };
const COLORS = ['yellow', 'blue', 'green', 'pink'];

export default function NotesPage() {
  return (
    <Protected>
      <Notes />
    </Protected>
  );
}

function Notes() {
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
    const t = setInterval(load, 6000); // near-live: refresh every 6s when idle
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

  async function remove(id: number) {
    await jdel('/api/notes', { id });
    load();
  }

  return (
    <div className="container">
      <div className="spread">
        <h1>Notes Board 📝</h1>
        <button className="btn primary" onClick={addNote}>+ Note</button>
      </div>
      <p className="page-sub">Shared scratchpad — everyone can add and edit. Auto-refreshes every few seconds.</p>

      {notes.length === 0 && <p className="muted">No notes yet. Add the first one.</p>}

      <div className="grid cols-3">
        {notes.map((n) => (
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
                      width: 16, height: 16, borderRadius: 999, cursor: 'pointer',
                      border: n.color === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                      background: c === 'yellow' ? '#e8c552' : c === 'blue' ? '#5aa9e6' : c === 'green' ? '#5bc98d' : '#e67ea6',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
              <button className="btn sm ghost danger" onClick={() => remove(n.id)}>✕</button>
            </div>
            {n.updated_by && <div className="tiny muted">last edit: {n.updated_by}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
