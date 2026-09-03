'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { jget, jpost } from '@/lib/client';

type Session = {
  code: string;
  name: string;
  tripId: number;
  tripCode: string;
  tripName: string;
  tripDate: string | null;
} | null;

type Ctx = {
  session: Session;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (eventCode: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  unlockAdmin: (passcode: string) => Promise<void>;
  lockAdmin: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await jget('/api/session');
      setSession(data.session);
      setIsAdmin(!!data.isAdmin);
    } catch {
      setSession(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (eventCode: string, code: string) => {
    await jpost('/api/session', { action: 'login', eventCode, code });
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await jpost('/api/session', { action: 'logout' });
    await refresh();
  }, [refresh]);

  const unlockAdmin = useCallback(async (passcode: string) => {
    await jpost('/api/session', { action: 'admin-unlock', passcode });
    await refresh();
  }, [refresh]);

  const lockAdmin = useCallback(async () => {
    await jpost('/api/session', { action: 'admin-lock' });
    await refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider
      value={{ session, isAdmin, loading, refresh, login, logout, unlockAdmin, lockAdmin }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
