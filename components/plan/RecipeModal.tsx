'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MealPlanParticipant, MealWithRecipe, RecipePickerItem } from '@/lib/types';
import type { BatchColor } from '@/lib/utils/batchColors';
import RecipeDetailView from './RecipeDetailView';
import RecipeReplaceView from './RecipeReplaceView';

type Props = {
  meal: MealWithRecipe;
  color: BatchColor | null;
  batchDays?: number;
  onClose: () => void;
  onReplace?: (newRecipe: RecipePickerItem) => Promise<void>;
  onDelete?: () => Promise<void>;
  participants?: MealPlanParticipant[];
  onPortionChange?: (participantId: string, servings: number) => Promise<void>;
};

export default function RecipeModal({ meal, color, batchDays = 1, onClose, onReplace, onDelete, participants = [], onPortionChange }: Props) {
  const [view, setView] = useState<'detail' | 'replace'>('detail');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const viewRef = useRef(view);
  const onCloseRef = useRef(onClose);
  viewRef.current = view;
  onCloseRef.current = onClose;

  const requestClose = useCallback(() => {
    if (viewRef.current === 'replace') setView('detail');
    else onCloseRef.current();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      requestClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      if (dialog.open) dialog.close();
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    };
  }, [requestClose]);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="modal-dialog fixed inset-0 z-[200] h-dvh w-full"
      aria-labelledby="recipe-modal-title"
    >
      <div
        className="flex h-full w-full items-end justify-center p-2 sm:items-center sm:p-4"
        onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}
      >
        <div className="modal-panel relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] sm:max-h-[88vh] sm:rounded-[1.75rem]" onClick={(event) => event.stopPropagation()}>
          <h2 id="recipe-modal-title" className="sr-only">Szczegóły posiłku</h2>
          {view === 'detail' ? (
            <RecipeDetailView
              meal={meal}
              color={color}
              batchDays={batchDays}
              onClose={requestClose}
              onOpenReplace={onReplace ? () => setView('replace') : undefined}
              onDelete={onDelete}
              participants={participants}
              onPortionChange={onPortionChange}
            />
          ) : (
            <RecipeReplaceView
              meal={meal}
              onBack={() => setView('detail')}
              onClose={requestClose}
              onReplace={onReplace!}
            />
          )}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
