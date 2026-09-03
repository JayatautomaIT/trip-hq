'use client';

import Link from 'next/link';
import { useSession } from './SessionProvider';
import { APP_NAME } from '@/lib/config';

export function TopBar() {
  const { session, isAdmin, logout } = useSession();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
          <span>●</span> {session?.tripName || APP_NAME}
        </Link>
        <div className="who">
          {session ? (
            <>
              {isAdmin && <span className="badge pin">ADMIN</span>}
              <span className="small muted">{session.name.split(' ')[0]}</span>
              <button className="btn sm ghost" onClick={() => logout()}>Log out</button>
            </>
          ) : (
            <Link href="/login" className="btn sm">Log in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
