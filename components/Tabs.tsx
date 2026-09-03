'use client';

import { useState } from 'react';

export type Tab = { key: string; label: string; content: React.ReactNode };

// Pill tabs used inside each bottom-nav section.
export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) || tabs[0];
  return (
    <>
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab ${active === t.key ? 'active' : ''}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </>
  );
}
