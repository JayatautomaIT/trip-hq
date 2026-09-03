'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/SessionProvider';
import { APP_NAME } from '@/lib/config';

export default function LoginPage() {
  const { session, isAdmin, login, logout, unlockAdmin, lockAdmin } = useSession();
  const router = useRouter();
  const [eventCode, setEventCode] = useState('');
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(eventCode, code);
      router.push('/');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function doUnlock(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await unlockAdmin(pass);
      setPass('');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 460 }}>
      <div className="card">
        <h1>{APP_NAME} 🍻</h1>
        {!session ? (
          <>
            <p className="page-sub">
              Enter the <b>event code</b> the organizer gave you, then your <b>name code</b> —
              your first + last name, all lowercase, no spaces (e.g. <code>mikesmith</code>).
            </p>
            <form onSubmit={doLogin} className="stack">
              <div>
                <label>Event code</label>
                <input
                  autoFocus
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value)}
                  placeholder="e.g. vegas2026"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
              <div>
                <label>Your name code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="firstnamelastname"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
              {err && <p className="badge bad">{err}</p>}
              <button className="btn primary" disabled={busy}>{busy ? '…' : 'Enter'}</button>
            </form>
          </>
        ) : (
          <>
            <p className="page-sub">
              Logged in as <b>{session.name}</b> for <b>{session.tripName}</b>.
            </p>
            <div className="row">
              <button className="btn" onClick={() => router.push('/')}>Go to plans →</button>
              <button className="btn ghost" onClick={() => logout()}>Log out</button>
            </div>

            <div className="divider" />

            {isAdmin ? (
              <div className="stack">
                <p className="badge pin">ADMIN MODE ON — you can edit finances, schedule &amp; pins.</p>
                <button className="btn sm ghost" onClick={() => lockAdmin()}>Turn off admin mode</button>
              </div>
            ) : (
              <form onSubmit={doUnlock} className="stack">
                <label>Organizer? Enter the admin passcode to unlock editing.</label>
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="admin passcode"
                />
                {err && <p className="badge bad">{err}</p>}
                <button className="btn blue" disabled={busy}>Unlock admin</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
