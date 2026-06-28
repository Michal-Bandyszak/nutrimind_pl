'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ShoppingList } from '@/lib/types';
import ShoppingClient from './ShoppingClient';

type Props = {
  planId: string;
};

async function readShoppingList(planId: string): Promise<ShoppingList> {
  const res = await fetch(`/api/shopping/${planId}`, { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(typeof json.error === 'string' ? json.error : 'Nie udało się załadować listy zakupów.');
  }
  return json.data as ShoppingList;
}

export default function ShoppingPageClient({ planId }: Props) {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await readShoppingList(planId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować listy zakupów.');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  if (loading && !list) {
    return <ShoppingShellSkeleton />;
  }

  if (error && !list) {
    return (
      <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => void loadList()}
          className="mt-3 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (!list) {
    return null;
  }

  return <ShoppingClient list={list} />;
}

function ShoppingShellSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-[1.5rem] border border-border bg-white/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="h-3 w-24 rounded-full bg-gray-200" />
          <div className="h-3 w-20 rounded-full bg-gray-200" />
        </div>
        <div className="mt-3 h-2 rounded-full bg-gray-100" />
      </div>

      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index}>
          <div className="mb-2 h-4 w-28 rounded-full bg-gray-200" />
          <div className="overflow-hidden rounded-[1.5rem] border border-border bg-white/70">
            {Array.from({ length: 4 }).map((__, rowIndex) => (
              <div
                key={rowIndex}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <div className="h-4 w-32 rounded-full bg-gray-200" />
                <div className="h-4 w-16 rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
