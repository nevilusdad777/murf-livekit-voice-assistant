'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Gear, House, Info, List, Ticket, Users } from '@phosphor-icons/react';
import { cn } from '@/lib/shadcn/utils';

// Navigation items for the sidebar
const navItems = [
  { href: '/', label: 'Dashboard', icon: <House weight="fill" className="h-5 w-5" /> },
  { href: '/tickets', label: 'Tickets', icon: <Ticket weight="fill" className="h-5 w-5" /> },
  { href: '/agents', label: 'Agents', icon: <Users weight="fill" className="h-5 w-5" /> },
  { href: '/logs', label: 'Logs', icon: <FileText weight="fill" className="h-5 w-5" /> },
  { href: '/settings', label: 'Settings', icon: <Gear weight="fill" className="h-5 w-5" /> },
  { href: '/about', label: 'Help', icon: <Info weight="fill" className="h-5 w-5" /> },
];

/**
 * Collapsible sidebar component.
 * On desktop (`md` breakpoint) it is always visible and fixed to the left.
 * On mobile it can be toggled via the hamburger button.
 */
export const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Hamburger button – only visible on mobile */}
      <button
        className="fixed top-4 left-4 z-50 rounded-md bg-slate-800/80 p-2 text-white transition-colors hover:bg-slate-700 md:hidden"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation menu"
      >
        <List size={24} weight="bold" />
      </button>

      {/* Dark overlay when sidebar is open on mobile */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/30 transition-opacity duration-200 md:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar itself */}
      <nav
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 transform border-r border-white/5 bg-slate-950/95 p-6 backdrop-blur-md transition-transform duration-200 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          'flex flex-col'
        )}
      >
        <div className="mb-8 flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-sm font-extrabold tracking-widest text-transparent">
            NEXUS PAY
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-2 rounded-md border px-3 py-2 transition-all duration-200',
                    isActive
                      ? 'border-violet-500/20 bg-violet-500/10 font-semibold text-white'
                      : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                  )}
                  onClick={() => setOpen(false)} // close on navigation (mobile)
                >
                  <span
                    className={cn(
                      'transition-colors duration-200',
                      isActive ? 'text-violet-400' : 'text-slate-500 group-hover:text-violet-300'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};
