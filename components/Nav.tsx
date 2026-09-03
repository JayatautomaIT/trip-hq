'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from './SessionProvider';
import { APP_NAME } from '@/lib/config';

const LINKS = [
  ['/', 'Home'],
  ['/schedule', 'Schedule'],
  ['/ideas', 'Ideas'],
  ['/poll', 'Dates'],
  ['/chat', 'Chat'],
  ['/notes', 'Notes'],
  ['/tasks', 'To-Do'],
  ['/meals', 'Meals'],
  ['/packing', 'Packing'],
  ['/files', 'Files'],
  ['/expenses', 'Money'],
  ['/info', 'Info'],
  ['/guys', 'The Guys'],
];

export function Nav() {
  const path = usePathname();
  const { session, isAdmin, logout } = useSession();

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
          <span>●</span> {session?.tripName || APP_NAME}
        </Link>
        {session && (
          <div className="nav-links">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} className={path === href ? 'active' : ''}>
                {label}
              </Link>
            ))}
          </div>
        )}
        <div className="who">
          {session ? (
            <>
              <span>{session.name}</span>
              {isAdmin && <span className="badge pin">ADMIN</span>}
              <button className="btn sm ghost" onClick={() => logout()}>Log out</button>
            </>
          ) : (
            <Link href="/login" className="btn sm">Log in</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
