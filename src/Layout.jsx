/**
 * Layout.jsx — Purpulse Field App Shell
 * Provides: 5-tab bottom nav, Framer Motion route transitions, full safe-area support.
 *
 * Nav tabs: Jobs | Time | Chat | Support | Profile
 * Admin pages use AdminShell directly — no Layout wrapping.
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Briefcase, Clock, MessageCircle, HelpCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

import { useAppPreferences } from './hooks/useAppPreferences';

const NAV_ITEMS = [
  { page: 'Jobs',    path: '/Jobs',    icon: Briefcase,      label: 'Jobs'    },
  { page: 'TimeLog', path: '/TimeLog', icon: Clock,          label: 'Time'    },
  { page: 'Chat',    path: '/Chat',    icon: MessageCircle,  label: 'Chat'    },
  { page: 'Support', path: '/Support', icon: HelpCircle,     label: 'Support' },
  { page: 'Profile', path: '/Profile', icon: User,           label: 'Profile' },
];

// Pages that suppress all chrome (full-screen flows)
const HIDE_SHELL_PAGES = ['JobDetail', 'Onboarding'];

const pageVariants = {
  initial:  { opacity: 0, x: 24 },
  animate:  { opacity: 1, x: 0  },
  exit:     { opacity: 0, x: -24 },
};

const pageTransition = { type: 'tween', ease: 'easeInOut', duration: 0.22 };

export default function Layout({ children, currentPageName }) {
  const location  = useLocation();
  const hideShell = HIDE_SHELL_PAGES.includes(currentPageName);
  const hideNav   = hideShell;

  useAppPreferences();

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* ── Animated page content ─────────────────────── */}
      <main id="main-content" className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Bottom Tab Bar ────────────────────────────── */}
      {!hideNav && (
        <nav
          aria-label="Primary navigation"
          className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-100"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft:   'env(safe-area-inset-left)',
            paddingRight:  'env(safe-area-inset-right)',
          }}
        >
          <div className="max-w-2xl mx-auto flex">
            {NAV_ITEMS.map(item => {
              const Icon     = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-0.5 pt-2.5 pb-2 transition-colors min-h-[56px] justify-center',
                    isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                  )}
                >
                  <div className={cn(
                    'h-8 w-12 rounded-xl flex items-center justify-center transition-all',
                    isActive ? 'bg-slate-900' : 'bg-transparent'
                  )}>
                    <Icon className={cn('h-5 w-5', isActive ? 'text-white stroke-[2.5px]' : '')} aria-hidden="true" />
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold',
                    isActive ? 'text-slate-900 font-bold' : 'text-slate-400'
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}