'use client';

import { useMemo } from 'react';
import { useEffect, useState } from 'react';
import { TokenSource } from 'livekit-client';
import { useChat, useSession, useSessionContext } from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { ViewController } from '@/components/app/view-controller';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
import { cn } from '@/lib/shadcn/utils';
import { getSandboxTokenSource } from '@/lib/utils';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();

  return null;
}

const BharatLogo = () => (
  <svg
    className="h-8 w-8 text-violet-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <line x1="6" y1="15" x2="6.01" y2="15" />
    <line x1="10" y1="15" x2="14" y2="15" />
  </svg>
);

interface DashboardSidebarProps {
  companyName: string;
}

function DashboardSidebar({ companyName }: DashboardSidebarProps) {
  const { isConnected, start } = useSessionContext();
  const { send } = useChat();
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && pendingPrompt) {
      send(pendingPrompt);
      setPendingPrompt(null);
    }
  }, [isConnected, pendingPrompt, send]);

  const handleAction = async (prompt: string) => {
    if (isConnected) {
      await send(prompt);
    } else {
      setPendingPrompt(prompt);
      await start();
    }
  };

  const actions = [
    {
      title: 'Check Fees',
      desc: 'Ask about transaction charges',
      prompt: 'What are the transaction charges for UPI and Credit Cards?',
    },
    {
      title: 'Report Lost Card',
      desc: 'Securely block your card',
      prompt: 'I want to block my card because I lost it.',
    },
    {
      title: 'UPI Support',
      desc: 'Help with failed transfers',
      prompt: 'My UPI transaction failed but money got debited.',
    },
  ];

  const [tickets, setTickets] = useState<any[]>([]);

  // Poll the local Python ticket API server every 3 seconds to keep tickets updated
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch('http://localhost:8085/tickets');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setTickets(data);
          }
        }
      } catch (err) {
        // Silent catch if backend is starting
      }
    };

    fetchTickets();
    const interval = setInterval(fetchTickets, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="z-20 flex hidden h-full w-80 flex-col overflow-y-auto border-r border-violet-100/30 bg-white/70 p-5 shadow-2xl backdrop-blur-xl lg:flex dark:border-slate-900 dark:bg-slate-950/80">
      {/* Top Brand Logo */}
      <div className="mb-6 flex items-center gap-3">
        <BharatLogo />
        <h1 className="bg-gradient-to-r from-violet-500 to-fuchsia-400 bg-clip-text text-lg font-extrabold text-transparent">
          {companyName}
        </h1>
      </div>

      {/* Security Status Shield */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 shadow-xs dark:bg-emerald-500/5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Security Shield Active
            </h4>
            <p className="text-[10px] text-emerald-500">Compliance & Anti-Fraud online</p>
          </div>
        </div>
        <svg
          className="h-5 w-5 text-emerald-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      </div>

      {/* Quick Actions */}
      <h2 className="mb-3 text-xs font-bold tracking-widest text-slate-400 uppercase">
        Quick Actions
      </h2>
      <div className="mb-6 space-y-2.5">
        {actions.map((action, i) => (
          <div
            key={i}
            onClick={() => handleAction(action.prompt)}
            className="group cursor-pointer rounded-xl border border-violet-100/30 bg-violet-50/50 p-3 transition-all hover:border-violet-500/20 hover:bg-violet-500/5 hover:shadow-lg active:scale-[0.98] dark:border-slate-800/80 dark:bg-slate-900/50 dark:hover:bg-violet-500/5"
          >
            <h3 className="text-xs font-bold text-slate-800 transition-colors group-hover:text-violet-400 dark:text-slate-200">
              {action.title}
            </h3>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{action.desc}</p>
          </div>
        ))}
      </div>

      {/* Active Escalated Tickets Dashboard Section */}
      <h2 className="mb-3 text-xs font-bold tracking-widest text-slate-400 uppercase">
        Human Escalations ({tickets.length})
      </h2>
      <div className="scrollbar-thin scrollbar-thumb-slate-800 max-h-60 flex-1 space-y-2.5 overflow-y-auto pr-1.5">
        {tickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-400 dark:border-slate-800">
            No active escalations. Everything is running smoothly.
          </div>
        ) : (
          tickets.map((ticket, index) => {
            const urgencyColors: any = {
              Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
              Emergency: 'bg-red-500/10 text-red-400 border-red-500/20',
            };
            return (
              <div
                key={ticket.ticket_id}
                className="space-y-1 rounded-xl border border-white/5 bg-slate-900/40 p-2.5 transition-all hover:border-violet-500/20 dark:bg-slate-950/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-violet-400">
                    {ticket.ticket_id}
                  </span>
                  <span
                    className={cn(
                      'rounded-md border px-1.5 py-0.5 text-[8px] font-extrabold',
                      urgencyColors[ticket.urgency] || 'bg-slate-500/10'
                    )}
                  >
                    {ticket.urgency}
                  </span>
                </div>
                <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-300">
                  {ticket.summary}
                </p>
                <div className="mt-1 flex items-center justify-between text-[8px] text-slate-500">
                  <span>Name: {ticket.user_name}</span>
                  <span>Method: {ticket.followup_method}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom info */}
      <div className="mt-4 border-t border-violet-100/10 pt-3 dark:border-slate-900">
        <div className="rounded-xl border border-violet-500/10 bg-violet-500/5 p-3 text-center">
          <p className="text-[10px] font-semibold text-violet-400">Nexus Pay System Live</p>
        </div>
      </div>
    </aside>
  );
}

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('Guest');

  useEffect(() => {
    let id = localStorage.getItem('bharatpay_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('bharatpay_user_id', id);
    }
    let name = localStorage.getItem('bharatpay_user_name') || 'Guest';
    
    setUserId(id);
    setUserName(name);
    setMounted(true);
  }, []);

  const tokenSource = useMemo(() => {
    if (!userId) return '';
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(appConfig)
      : TokenSource.endpoint(
          `/api/token?userId=${userId}&userName=${encodeURIComponent(userName)}`
        );
  }, [appConfig, userId, userName]);

  const session = useSession(tokenSource, {
    ...(appConfig.agentName ? { agentName: appConfig.agentName } : {}),
    agentConnectTimeoutMilliseconds: 45000,
  });

  const handleNameChange = (newName: string) => {
    setUserName(newName);
    localStorage.setItem('bharatpay_user_name', newName);
  };

  if (!mounted || !userId) return null; // Hydration guard

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <main className="flex h-svh w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/30 dark:from-slate-950 dark:to-slate-900">
        {/* Main Content (Agent) */}
        <div
          className={cn(
            'relative flex h-full flex-1 flex-col items-center',
            !session.isConnected ? 'overflow-y-auto py-8' : 'justify-center overflow-hidden'
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
          <ViewController
            appConfig={appConfig}
            userName={userName}
            onNameChange={handleNameChange}
          />
        </div>
      </main>
      <StartAudioButton label="Start Audio" />
      <Toaster
        icons={{
          warning: <WarningIcon weight="bold" />,
        }}
        position="top-center"
        className="toaster group"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </AgentSessionProvider>
  );
}
