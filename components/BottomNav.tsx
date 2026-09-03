'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from './SessionProvider';

const ITEMS = [
  ['/', '🏠', 'Home'],
  ['/plan', '🗓️', 'Plan'],
  ['/board', '💬', 'Board'],
  ['/lists', '✅', 'Lists'],
  ['/crew', '👥', 'Crew'],
];

export function BottomNav() {
  const path = usePathname();
  const { session } = useSession();
  if (!session) return null; // hidden on the login screen

  return (
    <nav className="bottom-nav">
      {ITEMS.map(([href, icon, label]) => {
        const active = path === href;
        return (
          <Link key={href} href={href} className={`bn-item ${active ? 'active' : ''}`}>
            <span className="bn-icon">{icon}</span>
            <span className="bn-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
