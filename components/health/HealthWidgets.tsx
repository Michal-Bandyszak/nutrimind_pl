'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { RoutineItem, PointsCategory } from '@/lib/data/healthData';

const SECTION_COLORS = {
  teal:   { bar: 'bg-teal-500',   badge: 'bg-teal-50 text-teal-700' },
  amber:  { bar: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700' },
  violet: { bar: 'bg-violet-400', badge: 'bg-violet-50 text-violet-700' },
};

export function Section({
  title, badge, pct, color = 'teal', children,
}: {
  title: string;
  badge?: string;
  pct?: number;
  color?: keyof typeof SECTION_COLORS;
  children: React.ReactNode;
}) {
  const c = SECTION_COLORS[color];
  return (
    <div className="panel-surface rounded-[1.5rem] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        <div className="flex items-center gap-2">
          {pct !== undefined && (
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
          )}
          {badge && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>{badge}</span>
          )}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function RoutineList({ items, done, onToggle }: {
  items: RoutineItem[];
  done: string[];
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const checked = done.includes(item.id);
        const isExpanded = expanded === item.id;
        return (
          <li key={item.id} className="rounded-[1.1rem] border border-border overflow-hidden">
            <div className="flex items-start gap-3 p-3">
              <button
                onClick={() => onToggle(item.id)}
                className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  checked
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'border-gray-300 hover:border-teal-400 bg-white'
                }`}
              >
                {checked && <Check size={11} strokeWidth={3} />}
              </button>
              <span className={`flex-1 text-sm leading-snug transition-colors ${checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {item.label}
              </span>
              {item.detail && (
                <button
                  onClick={() => setExpanded(isExpanded ? null : item.id)}
                  className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              )}
            </div>
            {item.detail && isExpanded && (
              <div className="px-3 pb-3 pt-0">
                <p className="text-xs text-gray-500 bg-gray-50/80 rounded-xl px-3 py-2 leading-relaxed">{item.detail}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function PointsRow({ category, value, onChange }: {
  category: PointsCategory;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[1.1rem] border border-border overflow-hidden bg-white/40">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="flex-1 text-sm font-medium text-gray-700">{category.label}</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => onChange(value === n ? null : n)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                (value ?? 0) >= n
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-400 hover:bg-teal-100 hover:text-teal-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-gray-300 hover:text-gray-500 transition-colors"
        >
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-1">
          {category.levels.map((desc, i) => (
            <p key={i} className={`text-xs flex items-start gap-2 ${(value ?? 0) > i ? 'text-teal-700' : 'text-gray-400'}`}>
              <span className={`shrink-0 w-4 h-4 rounded-full text-[10px] flex items-center justify-center mt-0.5 ${(value ?? 0) > i ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</span>
              {desc}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScaleSelector({
  label, value, onChange, colors, labels,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  colors: string[];
  labels?: string[];
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(value === n ? null : n)}
            title={labels?.[n - 1]}
            className={`flex-1 h-8 rounded-lg transition-all ${
              value === n
                ? `${colors[n - 1]} text-white shadow-sm scale-105`
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          />
        ))}
      </div>
      {value && labels && (
        <p className="text-xs text-gray-400 mt-1">{labels[value - 1]}</p>
      )}
    </div>
  );
}
