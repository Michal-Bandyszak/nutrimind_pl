'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MealPlanParticipant, MealWithRecipe, RecipeWithIngredients } from '@/lib/types';
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
  participants?: MealPlanParticipant[];
  onPortionChange?: (participantId: string, servings: number) => Promise<void>;
};

export default function RecipeModal({ meal, color, batchDays = 1, onClose, onReplace, onDelete, participants = [], onPortionChange }: Props) {
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
      className="modal-scrim fixed inset-0 z-[200] flex items-end justify-center p-2 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="modal-panel relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] sm:max-h-[88vh] sm:rounded-[1.75rem]"
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
            participants={participants}
            onPortionChange={onPortionChange}
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
