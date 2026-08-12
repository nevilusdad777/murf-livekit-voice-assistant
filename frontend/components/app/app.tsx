'use client';

import { useMemo } from 'react';
import { TokenSource } from 'livekit-client';
import { useSession, useChat, useSessionContext } from '@livekit/components-react';
import { useState, useEffect } from 'react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { ViewController } from '@/components/app/view-controller';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
import { getSandboxTokenSource } from '@/lib/utils';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();

  return null;
}

const BharatLogo = () => (
  <svg className="w-8 h-8 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
    { title: 'Check Fees', desc: 'Ask about transaction charges', prompt: 'What are the transaction charges for UPI and Credit Cards?' },
    { title: 'Report Lost Card', desc: 'Securely block your card', prompt: 'I want to block my card because I lost it.' },
    { title: 'UPI Support', desc: 'Help with failed transfers', prompt: 'My UPI transaction failed but money got debited.' }
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
    <aside className="w-80 h-full bg-white/70 dark:bg-slate-950/80 backdrop-blur-xl border-r border-violet-100/30 dark:border-slate-900 p-5 flex flex-col shadow-2xl z-20 hidden lg:flex overflow-y-auto">
      {/* Top Brand Logo */}
      <div className="flex items-center gap-3 mb-6">
        <BharatLogo />
        <h1 className="text-lg font-extrabold bg-gradient-to-r from-violet-500 to-fuchsia-400 bg-clip-text text-transparent">{companyName}</h1>
      </div>

      {/* Security Status Shield */}
      <div className="mb-6 p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Security Shield Active</h4>
            <p className="text-[10px] text-emerald-500">Compliance & Anti-Fraud online</p>
          </div>
        </div>
        <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      
      {/* Quick Actions */}
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Actions</h2>
      <div className="space-y-2.5 mb-6">
        {actions.map((action, i) => (
          <div
            key={i}
            onClick={() => handleAction(action.prompt)}
            className="p-3 rounded-xl bg-violet-50/50 dark:bg-slate-900/50 border border-violet-100/30 dark:border-slate-800/80 hover:shadow-lg hover:border-violet-500/20 hover:bg-violet-500/5 dark:hover:bg-violet-500/5 transition-all cursor-pointer group active:scale-[0.98]"
          >
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-violet-400 transition-colors">{action.title}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{action.desc}</p>
          </div>
        ))}
      </div>

      {/* Active Escalated Tickets Dashboard Section */}
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Human Escalations ({tickets.length})</h2>
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-60 pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {tickets.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
            No active escalations. Everything is running smoothly.
          </div>
        ) : (
          tickets.map((ticket, index) => {
            const urgencyColors: any = {
              Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
              Emergency: 'bg-red-500/10 text-red-400 border-red-500/20'
            };
            return (
              <div key={ticket.ticket_id} className="p-2.5 rounded-xl border border-white/5 bg-slate-900/40 dark:bg-slate-950/40 space-y-1 hover:border-violet-500/20 transition-all">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold text-violet-400">{ticket.ticket_id}</span>
                  <span className={cn("text-[8px] px-1.5 py-0.5 rounded-md border font-extrabold", urgencyColors[ticket.urgency] || 'bg-slate-500/10')}>
                    {ticket.urgency}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 line-clamp-2 leading-relaxed">{ticket.summary}</p>
                <div className="flex justify-between items-center text-[8px] text-slate-500 mt-1">
                  <span>Name: {ticket.user_name}</span>
                  <span>Method: {ticket.followup_method}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Bottom info */}
      <div className="mt-4 pt-3 border-t border-violet-100/10 dark:border-slate-900">
        <div className="p-3 bg-violet-500/5 rounded-xl border border-violet-500/10 text-center">
          <p className="text-[10px] text-violet-400 font-semibold">Bharat Pay System Live</p>
        </div>
      </div>
    </aside>
  );
}

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('Guest');

  useEffect(() => {
    let id = localStorage.getItem('bharatpay_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('bharatpay_user_id', id);
    }
    setUserId(id);

    let name = localStorage.getItem('bharatpay_user_name');
    if (!name) {
      name = 'Guest';
    }
    setUserName(name);
  }, []);

  const tokenSource = useMemo(() => {
    if (!userId) return null;
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(appConfig)
      : TokenSource.endpoint(`/api/token?userId=${userId}&userName=${encodeURIComponent(userName)}`);
  }, [appConfig, userId, userName]);

  const session = useSession(
    tokenSource,
    {
      ...(appConfig.agentName ? { agentName: appConfig.agentName } : {}),
      agentConnectTimeoutMilliseconds: 45000,
    }
  );

  const handleNameChange = (newName: string) => {
    setUserName(newName);
    localStorage.setItem('bharatpay_user_name', newName);
  };

  if (!userId) return null; // Hydration guard

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <main className="flex h-svh w-full bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/30 dark:from-slate-950 dark:to-slate-900 overflow-hidden">
        <DashboardSidebar companyName={appConfig.companyName} />

        {/* Main Content (Agent) */}
        <div className="flex-1 h-full relative flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent pointer-events-none" />
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
