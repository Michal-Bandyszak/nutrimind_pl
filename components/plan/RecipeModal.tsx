'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MealWithRecipe, RecipeWithIngredients } from '@/lib/types';
import type { BatchColor } from '@/lib/utils/batchColors';
import RecipeDetailView from './RecipeDetailView';
import RecipeReplaceView from './RecipeReplaceView';

type Props = {
  meal: MealWithRecipe;
  color: BatchColor | null;
  batchDays?: number;
  onClose: () => void;
  onReplace?: (newRecipe: RecipeWithIngredients) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export default function RecipeModal({ meal, color, batchDays = 1, onClose, onReplace, onDelete }: Props) {
  const [view, setView] = useState<'detail' | 'replace'>('detail');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (view === 'replace') setView('detail');
        else onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, view]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      className="modal-scrim fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="modal-panel relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem]"
        onClick={(e) => e.stopPropagation()}
      >
        {view === 'detail' ? (
          <RecipeDetailView
            meal={meal}
            color={color}
            batchDays={batchDays}
            onClose={onClose}
            onOpenReplace={onReplace ? () => setView('replace') : undefined}
            onDelete={onDelete}
          />
        ) : (
          <RecipeReplaceView
            meal={meal}
            onBack={() => setView('detail')}
            onClose={onClose}
            onReplace={onReplace!}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
