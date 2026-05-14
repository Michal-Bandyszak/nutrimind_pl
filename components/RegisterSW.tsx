'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // In dev, stale SW caches can serve old Next.js chunks and break tab navigation.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => undefined);

      if ('caches' in window) {
        caches.keys()
          .then((keys) => Promise.all(keys
            .filter((k) => k.startsWith('nutrimind-'))
            .map((k) => caches.delete(k))))
          .catch(() => undefined);
      }
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('[SW] Registration failed:', err));
  }, []);

  return null;
}
