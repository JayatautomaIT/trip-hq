'use client';

import { Protected } from '@/components/Protected';
import { Tabs } from '@/components/Tabs';
import { ScheduleView } from '@/components/features/ScheduleView';
import { MealsView } from '@/components/features/MealsView';

export default function PlanPage() {
  return (
    <Protected>
      <div className="container">
        <h1>Plan 🗓️</h1>
        <Tabs
          tabs={[
            { key: 'schedule', label: 'Schedule', content: <ScheduleView /> },
            { key: 'meals', label: 'Meals', content: <MealsView /> },
          ]}
        />
      </div>
    </Protected>
  );
}
