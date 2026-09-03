'use client';

import { Protected } from '@/components/Protected';
import { Tabs } from '@/components/Tabs';
import { PackingView } from '@/components/features/PackingView';
import { ShoppingView } from '@/components/features/ShoppingView';
import { TasksView } from '@/components/features/TasksView';

export default function ListsPage() {
  return (
    <Protected>
      <div className="container">
        <h1>Lists ✅</h1>
        <Tabs
          tabs={[
            { key: 'packing', label: 'Packing', content: <PackingView /> },
            { key: 'shopping', label: 'Shopping', content: <ShoppingView /> },
            { key: 'todo', label: 'To-Do', content: <TasksView /> },
          ]}
        />
      </div>
    </Protected>
  );
}
