'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import type { ShoppingList, ShoppingIngredient } from '@/lib/types';

type Props = { list: ShoppingList };

export default function ShoppingClient({ list }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [leftoversOpen, setLeftoversOpen] = useState(true);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const [copied, setCopied] = useState(false);

  const totalChecked = checked.size;
  const total = list.totalItems;

  function exportAsText(): string {
    const lines: string[] = [`🛒 Lista zakupów — ${list.planName}`, ''];
    for (const cat of list.categories) {
      lines.push(`${cat.emoji} ${cat.label}`);
      for (const item of cat.items) {
        const pkg = item.packageLabel && item.packagesNeeded
          ? ` (${item.packagesNeeded} × ${item.packageLabel})`
          : '';
        lines.push(`  ☐ ${item.name} — ${item.displayAmount}${pkg}`);
      }
      lines.push('');
    }
    return lines.join('\n').trim();
  }

  async function handleCopy() {
    const text = exportAsText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress bar + export */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Postęp zakupów</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-teal-600 transition-colors"
            >
              {copied ? <Check size={13} className="text-teal-600" /> : <Copy size={13} />}
              {copied ? 'Skopiowano!' : 'Kopiuj listę'}
            </button>
            <span>{totalChecked} / {total}</span>
          </div>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-600 rounded-full transition-all duration-300"
            style={{ width: total > 0 ? `${(totalChecked / total) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Leftovers panel */}
      {list.leftovers.length > 0 && (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 overflow-hidden shadow-sm">
          <button
            onClick={() => setLeftoversOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-3 text-left"
          >
            <AlertTriangle size={15} className="text-amber-500 shrink-0" />
            <span className="text-sm font-semibold text-amber-800 flex-1">
              Zostanie Ci {list.leftovers.length} {list.leftovers.length === 1 ? 'produkt' : 'produkty/produktów'} po tygodniu
            </span>
            {leftoversOpen
              ? <ChevronUp size={15} className="text-amber-400 shrink-0" />
              : <ChevronDown size={15} className="text-amber-400 shrink-0" />
            }
          </button>
          {leftoversOpen && (
            <div className="border-t border-amber-200 divide-y divide-amber-100">
              {list.leftovers.map((item) => (
                <div key={item.name} className="flex items-baseline justify-between px-4 py-2.5">
                  <div>
                    <span className="text-sm text-amber-900">{item.name}</span>
                    {item.packageInfo && (
                      <span className="text-xs text-amber-500 ml-2">({item.packageInfo})</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-amber-700 ml-4 shrink-0">
                    zostanie {item.leftoverDisplay}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Categories */}
      {list.categories.map((cat) => (
        <section key={cat.category}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">{cat.emoji}</span>
            <h2 className="text-sm font-semibold text-gray-700">{cat.label}</h2>
            <span className="text-xs text-gray-400 ml-auto">{cat.items.length}</span>
          </div>

          <div className="panel-surface rounded-[1.5rem] overflow-hidden divide-y divide-border">
            {cat.items.map((item) => (
              <ShoppingRow
                key={item.ingredientId}
                item={item}
                checked={checked.has(item.ingredientId)}
                onToggle={() => toggle(item.ingredientId)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Reset button */}
      {totalChecked > 0 && (
        <button
          onClick={() => setChecked(new Set())}
          className="btn-secondary w-full py-2.5 text-sm rounded-2xl transition-colors"
        >
          Resetuj zaznaczenia
        </button>
      )}
    </div>
  );
}

function ShoppingRow({
  item,
  checked,
  onToggle,
}: {
  item: ShoppingIngredient;
  checked: boolean;
  onToggle: () => void;
}) {
  const hasWaste = item.leftoverG !== null && item.leftoverG > 10;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${checked ? 'bg-gray-50/90' : 'hover:bg-gray-50/60'}`}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <div className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${checked ? 'bg-teal-600 border-teal-600' : 'border-gray-300'}`}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-white">
            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-sm font-medium ${checked ? 'line-through text-gray-300' : 'text-gray-800'}`}>
            {item.name}
          </span>
          <span className={`text-sm shrink-0 ${checked ? 'text-gray-300' : 'text-gray-600'}`}>
            {item.displayAmount}
          </span>
        </div>

        {/* Package info + leftover */}
        {item.packageLabel && item.packagesNeeded && (
          <p className="text-xs text-gray-400 mt-0.5">
            {item.packagesNeeded} × {item.packageLabel}
            {hasWaste && item.leftoverDisplay && (
              <span className="ml-2 text-amber-500 font-medium">
                (zostanie {item.leftoverDisplay})
              </span>
            )}
          </p>
        )}

        {/* Usage hint */}
        <p className="text-xs text-gray-300 mt-0.5 truncate">
          {[...new Set(item.usedIn.map((u) => u.recipeName))].slice(0, 2).join(', ')}
        </p>
      </div>
    </div>
  );
}
