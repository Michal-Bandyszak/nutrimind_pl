import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/nav/Navigation';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NutriMind',
  description: 'Planowanie posiłków z gotowaniem wsadowym',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={inter.variable}>
      <body className="font-sans antialiased bg-surface text-gray-900">
        {/* Desktop: left sidebar (lg+). Mobile: bottom nav. */}
        <Navigation />
        {/* Main content: right of sidebar on desktop, above bottom nav on mobile */}
        <main className="lg:pl-56 pb-20 lg:pb-0 min-h-dvh">
          {children}
        </main>
      </body>
    </html>
  );
}
