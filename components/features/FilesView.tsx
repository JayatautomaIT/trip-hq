'use client';

import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { useSession } from '@/components/SessionProvider';
import { jget, jpost, jdel } from '@/lib/client';

type FileRow = {
  id: number;
  url: string;
  name: string | null;
  content_type: string | null;
  size: number | null;
  caption: string | null;
  added_by: string | null;
  guest_code: string | null;
};

function humanSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FilesView() {
  const { session, isAdmin } = useSession();
  const [files, setFiles] = useState<FileRow[]>([]);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => jget('/api/files').then((d) => setFiles(d.files)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function onUpload() {
    const list = inputRef.current?.files;
    if (!list || list.length === 0) return;
    setBusy(true);
    setStatus('');
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setStatus(`Uploading ${i + 1} of ${list.length}…`);
        const blob = await upload(file.name, file, { access: 'public', handleUploadUrl: '/api/files/upload' });
        await jpost('/api/files', {
          url: blob.url, pathname: blob.pathname, name: file.name,
          content_type: file.type, size: file.size,
          caption: list.length === 1 ? caption : '',
        });
      }
      setCaption('');
      if (inputRef.current) inputRef.current.value = '';
      setStatus('Done ✓');
      load();
    } catch (e: any) {
      setStatus(e?.message || 'Upload failed. (Is the Blob store set up on Vercel?)');
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(''), 4000);
    }
  }

  const images = files.filter((f) => (f.content_type || '').startsWith('image/'));
  const others = files.filter((f) => !(f.content_type || '').startsWith('image/'));

  return (
    <div>
      <p className="page-sub">Everything uploaded here or attached in chat shows up in this gallery.</p>

      <div className="card">
        <label>Add photos or files</label>
        <input ref={inputRef} type="file" multiple />
        <div style={{ marginTop: 10 }}>
          <label>Caption (optional, for a single file)</label>
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Boat rental confirmation" />
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={onUpload} disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
          {status && <span className="small muted">{status}</span>}
        </div>
        <p className="tiny muted" style={{ marginTop: 8 }}>Up to 25&nbsp;MB per file.</p>
      </div>

      {files.length === 0 && <p className="muted" style={{ marginTop: 16 }}>Nothing uploaded yet.</p>}

      {images.length > 0 && (
        <>
          <div className="day-head">Photos</div>
          <div className="grid cols-3">
            {images.map((f) => {
              const mine = f.guest_code === session?.code;
              return (
                <div key={f.id} className="card" style={{ padding: 8 }}>
                  <a href={f.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.caption || f.name || 'photo'} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                  </a>
                  {f.caption && <div className="small" style={{ marginTop: 6 }}>{f.caption}</div>}
                  <div className="spread" style={{ marginTop: 4 }}>
                    <span className="tiny muted">{f.added_by}</span>
                    {(mine || isAdmin) && <button className="btn sm ghost danger" onClick={() => jdel('/api/files', { id: f.id }).then(load)}>✕</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {others.length > 0 && (
        <>
          <div className="day-head">Files</div>
          <div className="stack">
            {others.map((f) => {
              const mine = f.guest_code === session?.code;
              return (
                <div key={f.id} className="card">
                  <div className="spread">
                    <div style={{ flex: 1 }}>
                      <a href={f.url} target="_blank" rel="noreferrer"><b>📎 {f.name || 'file'}</b></a>
                      <div className="tiny muted">{humanSize(f.size)} · {f.added_by}{f.caption ? ` · ${f.caption}` : ''}</div>
                    </div>
                    {(mine || isAdmin) && <button className="btn sm ghost danger" onClick={() => jdel('/api/files', { id: f.id }).then(load)}>✕</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
