'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { HEALTH_TIPS } from '@/lib/data/healthData';

export default function TipsTab() {
  const [openCat, setOpenCat] = useState<string | null>('sleep');

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 pb-1">
        Oparte na materiałach Sports-Med: Strategia 1%, Rutyny na Stabilizację Dopaminy, Złota Piątka.
      </p>
      {HEALTH_TIPS.map((cat) => {
        const isOpen = openCat === cat.id;
        return (
          <div key={cat.id} className="panel-surface rounded-[1.5rem] overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/60 transition-colors"
              onClick={() => setOpenCat(isOpen ? null : cat.id)}
            >
              <span className="text-lg">{cat.emoji}</span>
              <span className="flex-1 text-sm font-semibold text-gray-800">{cat.label}</span>
              <span className="text-xs text-gray-400">{cat.tips.length} porad</span>
              {isOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
            </button>
            {isOpen && (
              <div className="border-t border-border divide-y divide-border">
                {cat.tips.map((tip, i) => (
                  <div key={i} className="px-4 py-3.5">
                    <p className="text-sm font-medium text-gray-800 mb-1">{tip.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{tip.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
