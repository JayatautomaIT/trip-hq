'use client';

// Tiny fetch helpers for the browser. Always send/expect JSON.
async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.error) || 'Something went wrong.');
  return data;
}

export const jget = (p: string) => api(p);
export const jpost = (p: string, body?: unknown) =>
  api(p, { method: 'POST', body: JSON.stringify(body || {}) });
export const jpatch = (p: string, body?: unknown) =>
  api(p, { method: 'PATCH', body: JSON.stringify(body || {}) });
export const jdel = (p: string, body?: unknown) =>
  api(p, { method: 'DELETE', body: JSON.stringify(body || {}) });
