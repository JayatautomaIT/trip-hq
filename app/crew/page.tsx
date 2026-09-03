'use client';

import { Protected } from '@/components/Protected';
import { Tabs } from '@/components/Tabs';
import { GuysView } from '@/components/features/GuysView';
import { MoneyView } from '@/components/features/MoneyView';

export default function CrewPage() {
  return (
    <Protected>
      <div className="container">
        <h1>Crew 👥</h1>
        <Tabs
          tabs={[
            { key: 'guys', label: 'The Guys', content: <GuysView /> },
            { key: 'money', label: 'Money', content: <MoneyView /> },
          ]}
        />
      </div>
    </Protected>
  );
}
