'use client';

import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { useSession } from '@/components/SessionProvider';
import { jget, jpost, jdel } from '@/lib/client';

type Msg = {
  id: number;
  guest_code: string;
  name: string;
  body: string;
  created_at: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
};

export function ChatView() {
  const { session, isAdmin } = useSession();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [toast, setToast] = useState('');
  const [pending, setPending] = useState<{ id: number; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); };

  async function onPickFile() {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const blob = await upload(f.name, f, { access: 'public', handleUploadUrl: '/api/files/upload' });
      const res = await jpost('/api/files', {
        url: blob.url, pathname: blob.pathname, name: f.name, content_type: f.type, size: f.size,
      });
      setPending({ id: res.id, name: f.name });
    } catch (e: any) {
      flash(e?.message || 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function send() {
    const body = text.trim();
    if (!body && !pending) return;
    setText('');
    const fileId = pending?.id;
    setPending(null);
    await jpost('/api/chat', { body, file_id: fileId });
    load();
  }

  async function convert(kind: string, m: Msg) {
    const body = m.body || m.file_name || '';
    if (kind === 'note') { await jpost('/api/notes', { title: `From ${m.name}`, body }); flash('Saved to Notes ✓'); }
    if (kind === 'idea') { await jpost('/api/ideas', { title: body }); flash('Added to Ideas ✓'); }
    if (kind === 'todo') { await jpost('/api/tasks', { title: body }); flash('Added to To-Do ✓'); }
    if (kind === 'buy') { await jpost('/api/shopping', { text: body }); flash('Added to Shopping ✓'); }
    if (kind === 'bring') { await jpost('/api/packing', { text: body }); flash('Added to your Packing list ✓'); }
  }

  return (
    <div>
      <p className="page-sub">Anything said here can become a note, idea, or list item — just tap a button under the message.</p>

      <div className="card chat-scroll">
        {msgs.length === 0 && <p className="muted small">No messages yet. Start the conversation.</p>}
        <div className="stack">
          {msgs.map((m) => {
            const mine = m.guest_code === session?.code;
            const isImage = (m.file_type || '').startsWith('image/');
            return (
              <div key={m.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <div className="spread">
                  <span className="small" style={{ fontWeight: 700, color: mine ? 'var(--accent)' : 'var(--accent-2)' }}>{m.name}</span>
                  <span className="tiny muted">
                    {new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                {m.body && <div style={{ margin: '2px 0 6px', whiteSpace: 'pre-wrap' }}>{m.body}</div>}
                {m.file_url && (
                  <div style={{ margin: '4px 0 6px' }}>
                    {isImage ? (
                      <a href={m.file_url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.file_url} alt={m.file_name || 'photo'} style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 10, display: 'block' }} />
                      </a>
                    ) : (
                      <a href={m.file_url} target="_blank" rel="noreferrer" className="badge blue">📎 {m.file_name || 'file'}</a>
                    )}
                  </div>
                )}
                <div className="row">
                  <button className="btn sm ghost" onClick={() => convert('note', m)}>→ Note</button>
                  <button className="btn sm ghost" onClick={() => convert('idea', m)}>→ Idea</button>
                  <button className="btn sm ghost" onClick={() => convert('todo', m)}>→ To-do</button>
                  <button className="btn sm ghost" onClick={() => convert('buy', m)}>→ Buy</button>
                  <button className="btn sm ghost" onClick={() => convert('bring', m)}>→ Bring</button>
                  {(mine || isAdmin) && <button className="btn sm ghost danger" onClick={() => jdel('/api/chat', { id: m.id }).then(load)}>✕</button>}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {pending && (
        <div className="row" style={{ marginTop: 8 }}>
          <span className="badge blue">📎 {pending.name}</span>
          <button className="btn sm ghost danger" onClick={() => setPending(null)}>remove</button>
        </div>
      )}

      <div className="row" style={{ marginTop: 10 }}>
        <input ref={fileRef} type="file" onChange={onPickFile} style={{ display: 'none' }} />
        <button className="btn" onClick={() => fileRef.current?.click()} disabled={uploading} title="Attach a photo or file">
          {uploading ? '…' : '📎'}
        </button>
        <textarea
          style={{ minHeight: 44, flex: 1 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message the group…  (Enter to send)"
        />
        <button className="btn primary" onClick={send}>Send</button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
