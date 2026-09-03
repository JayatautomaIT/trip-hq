'use client';

import { Protected } from '@/components/Protected';
import { Tabs } from '@/components/Tabs';
import { ChatView } from '@/components/features/ChatView';
import { IdeasView } from '@/components/features/IdeasView';
import { NotesView } from '@/components/features/NotesView';
import { FilesView } from '@/components/features/FilesView';

export default function BoardPage() {
  return (
    <Protected>
      <div className="container">
        <h1>Board 💬</h1>
        <Tabs
          tabs={[
            { key: 'chat', label: 'Chat', content: <ChatView /> },
            { key: 'ideas', label: 'Ideas', content: <IdeasView /> },
            { key: 'notes', label: 'Notes', content: <NotesView /> },
            { key: 'files', label: 'Files', content: <FilesView /> },
          ]}
        />
      </div>
    </Protected>
  );
}
