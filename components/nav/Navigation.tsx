'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, BookOpen, ShoppingCart, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',          label: 'Plan',      icon: CalendarDays },
  { href: '/recipes',   label: 'Przepisy',  icon: BookOpen },
  { href: '/shopping',  label: 'Zakupy',    icon: ShoppingCart },
  { href: '/settings',  label: 'Ustawienia', icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* ——— Desktop sidebar (lg+) ——— */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-56 flex-col bg-white border-r border-border z-40">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-border">
          <span className="text-lg font-semibold tracking-tight text-gray-900">NutriMind</span>
          <span className="ml-1 text-base">🫒</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 text-xs text-gray-400 border-t border-border">
          Dieta śródziemnomorska
        </div>
      </aside>

      {/* ——— Mobile bottom bar (< lg) ——— */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-border">
        <div className="flex items-stretch h-16">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                  active ? 'text-teal-700' : 'text-gray-400'
                }`}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 2}
                  className={active ? 'text-teal-700' : 'text-gray-400'}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
        {/* Safe area spacer for iPhone home indicator */}
        <div className="h-safe-b" style={{ height: 'env(safe-area-inset-bottom)' }} />
      </nav>
    </>
  );
}
