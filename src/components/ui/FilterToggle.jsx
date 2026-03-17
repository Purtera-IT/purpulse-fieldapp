/**
 * FilterToggle — compact 28px filter chip set.
 * Replaces large pill chips with rectangular enterprise-style toggles.
 */
import React from 'react';
import { cn } from '@/lib/utils';

export default function FilterToggle({ options, value, onChange, className }) {
  return (
    <div className={cn('flex gap-1 flex-wrap', className)}>
      {options.map(opt => {
        const active = value === opt.value;
        const Icon   = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1 h-7 px-2.5 rounded-[4px] text-[11px] font-semibold transition-colors whitespace-nowrap border',
              active
                ? 'bg-[#0F1724] text-white border-[#0F1724]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            )}
            aria-pressed={active}
          >
            {Icon && <Icon className="h-3 w-3 flex-shrink-0" />}
            {opt.label}
            {opt.count != null && (
              <span className={cn(
                'ml-0.5 text-[10px] font-bold',
                active ? 'text-white/70' : 'text-slate-400'
              )}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}