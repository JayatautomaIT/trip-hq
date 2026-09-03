'use client';

import Link from 'next/link';
import { useSession } from './SessionProvider';

// Wrap any page's content so only logged-in guys can see it.
export function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  if (loading) {
    return (
      <div className="container">
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="container">
        <div className="card center">
          <h2>Members only 🔒</h2>
          <p className="muted">Enter your name-code to see the plans.</p>
          <Link href="/login" className="btn primary">Log in</Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
