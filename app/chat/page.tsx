'use client';

import { useEffect, useRef, useState } from 'react';
import { Protected } from '@/components/Protected';
import { useSession } from '@/components/SessionProvider';
import { jget, jpost, jdel } from '@/lib/client';

type Msg = { id: number; guest_code: string; name: string; body: string; created_at: string };

export default function ChatPage() {
  return (
    <Protected>
      <Chat />
    </Protected>
  );
}

function Chat() {
  const { session, isAdmin } = useSession();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [toast, setToast] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef(false);

  const load = async () => {
    try {
      const d = await jget('/api/chat');
      setMsgs(d.messages);
    } catch {/* ignore */}
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); };

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText('');
    await jpost('/api/chat', { body });
    load();
  }

  async function convert(kind: 'todo' | 'buy' | 'bring', body: string) {
    if (kind === 'todo') { await jpost('/api/tasks', { title: body }); flash('Added to the to-do list ✓'); }
    if (kind === 'buy') { await jpost('/api/shopping', { text: body }); flash('Added to the shopping list ✓'); }
    if (kind === 'bring') { await jpost('/api/packing', { text: body }); flash('Added to your packing list ✓'); }
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1>Chat 💬</h1>
      <p className="page-sub">Group chat. Hit a button under any message to turn it into a to-do, shopping item, or something to pack.</p>

      <div className="card" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {msgs.length === 0 && <p className="muted small">No messages yet. Start the conversation.</p>}
        <div className="stack">
          {msgs.map((m) => {
            const mine = m.guest_code === session?.code;
            return (
              <div key={m.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <div className="spread">
                  <span className="small" style={{ fontWeight: 700, color: mine ? 'var(--accent)' : 'var(--accent-2)' }}>{m.name}</span>
                  <span className="tiny muted">{new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <div style={{ margin: '2px 0 6px', whiteSpace: 'pre-wrap' }}>{m.body}</div>
                <div className="row">
                  <button className="btn sm ghost" onClick={() => convert('todo', m.body)}>→ To-do</button>
                  <button className="btn sm ghost" onClick={() => convert('buy', m.body)}>→ Buy</button>
                  <button className="btn sm ghost" onClick={() => convert('bring', m.body)}>→ Bring</button>
                  {(mine || isAdmin) && <button className="btn sm ghost danger" onClick={() => jdel('/api/chat', { id: m.id }).then(load)}>✕</button>}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <textarea
          style={{ minHeight: 44 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => (typingRef.current = true)}
          onBlur={() => (typingRef.current = false)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message the group…  (Enter to send)"
        />
        <button className="btn primary" onClick={send}>Send</button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
