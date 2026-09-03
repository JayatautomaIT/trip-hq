import './globals.css';
import type { Metadata, Viewport } from 'next';
import { SessionProvider } from '@/components/SessionProvider';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { APP_NAME } from '@/lib/config';

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Trip & party planning HQ',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0e1117',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <TopBar />
          {children}
          <BottomNav />
        </SessionProvider>
      </body>
    </html>
  );
}
