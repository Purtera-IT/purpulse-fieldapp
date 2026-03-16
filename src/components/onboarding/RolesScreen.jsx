/**
 * RolesScreen
 * Shown during onboarding (and accessible from Support) — shows the user their
 * assigned role and what capabilities that role unlocks.
 *
 * Roles:
 *   view_only    → read job list, no editing, no evidence capture
 *   field_tech   → full job + evidence + time tracking, no admin tools
 *   supervisor   → field_tech + can approve/lock time entries, view all technicians' jobs
 *   admin        → supervisor + AdminQC, device management, user management
 */
import React from 'react';
import { Eye, Wrench, ShieldCheck, Crown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES = [
  {
    key: 'view_only',
    icon: Eye,
    label: 'View Only',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    activeBg: 'bg-slate-900',
    desc: 'Read-only access to job list and details.',
    caps: [
      { label: 'View job list',          ok: true  },
      { label: 'View job details',       ok: true  },
      { label: 'Capture evidence',       ok: false },
      { label: 'Track time',             ok: false },
      { label: 'Chat with dispatcher',   ok: false },
      { label: 'Approve time entries',   ok: false },
    ],
  },
  {
    key: 'field_tech',
    icon: Wrench,
    label: 'Field Tech',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    activeBg: 'bg-blue-600',
    desc: 'Full job execution: capture, time tracking, runbook, chat.',
    caps: [
      { label: 'View job list',          ok: true  },
      { label: 'View job details',       ok: true  },
      { label: 'Capture evidence',       ok: true  },
      { label: 'Track time',             ok: true  },
      { label: 'Chat with dispatcher',   ok: true  },
      { label: 'Approve time entries',   ok: false },
    ],
  },
  {
    key: 'supervisor',
    icon: ShieldCheck,
    label: 'Supervisor',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    activeBg: 'bg-emerald-600',
    desc: 'Field tech + approve and lock time entries, view all team jobs.',
    caps: [
      { label: 'View job list',          ok: true  },
      { label: 'View job details',       ok: true  },
      { label: 'Capture evidence',       ok: true  },
      { label: 'Track time',             ok: true  },
      { label: 'Chat with dispatcher',   ok: true  },
      { label: 'Approve time entries',   ok: true  },
    ],
  },
  {
    key: 'admin',
    icon: Crown,
    label: 'Admin',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    activeBg: 'bg-amber-600',
    desc: 'Full platform access including QC console, device management, and user roles.',
    caps: [
      { label: 'View job list',          ok: true  },
      { label: 'View job details',       ok: true  },
      { label: 'Capture evidence',       ok: true  },
      { label: 'Track time',             ok: true  },
      { label: 'Chat with dispatcher',   ok: true  },
      { label: 'Approve time entries',   ok: true  },
    ],
    extra: ['AdminQC console', 'Device management', 'User role assignment'],
  },
];

export default function RolesScreen({ currentRole, onNext, isOnboarding = true }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Your role & permissions</h2>
        <p className="text-sm text-slate-500 mt-1">
          Your access level is set by your administrator. Contact them to request a role change.
        </p>
      </div>

      <div className="space-y-3">
        {ROLES.map(role => {
          const Icon = role.icon;
          const isActive = role.key === currentRole;
          return (
            <div key={role.key}
              className={cn('rounded-2xl border-2 p-4 transition-all',
                isActive ? 'border-slate-900 bg-white shadow-md' : 'border-slate-100 bg-white opacity-60'
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0', role.bg)}>
                  <Icon className={cn('h-5 w-5', role.color)} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-slate-900">{role.label}</p>
                    {isActive && (
                      <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full">YOUR ROLE</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{role.desc}</p>
                </div>
              </div>

              {isActive && (
                <div className="grid grid-cols-2 gap-1.5">
                  {role.caps.map((cap, i) => (
                    <div key={i} className={cn('flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5',
                      cap.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'
                    )}>
                      {cap.ok
                        ? <Check className="h-3 w-3 flex-shrink-0" />
                        : <X className="h-3 w-3 flex-shrink-0" />
                      }
                      <span className="font-semibold text-[11px]">{cap.label}</span>
                    </div>
                  ))}
                  {role.extra?.map((e, i) => (
                    <div key={`extra-${i}`} className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg px-2.5 py-1.5">
                      <Check className="h-3 w-3 flex-shrink-0" />
                      <span className="font-semibold text-[11px]">{e}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isOnboarding && (
        <button onClick={onNext}
          className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold text-base active:opacity-80"
        >
          Continue to Tutorial →
        </button>
      )}
    </div>
  );
}