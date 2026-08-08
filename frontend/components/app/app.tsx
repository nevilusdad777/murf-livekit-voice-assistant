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
  <svg className="w-8 h-8 text-[#FF9933]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

  return (
    <aside className="w-80 h-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-r border-orange-200 dark:border-slate-800 p-6 flex flex-col shadow-xl z-20 hidden md:flex">
      <div className="flex items-center gap-3 mb-8">
        <BharatLogo />
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{companyName}</h1>
      </div>
      
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h2>
      <div className="space-y-3">
        {actions.map((action, i) => (
          <div
            key={i}
            onClick={() => handleAction(action.prompt)}
            className="p-4 rounded-xl bg-orange-50 dark:bg-slate-800/50 border border-orange-100 dark:border-slate-700 hover:shadow-md hover:bg-orange-100 dark:hover:bg-slate-800 transition-all cursor-pointer group active:scale-[0.98]"
          >
            <h3 className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#FF9933] transition-colors">{action.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{action.desc}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-auto">
        <div className="p-4 bg-[#FF9933]/10 rounded-xl border border-[#FF9933]/20">
          <p className="text-xs text-[#FF9933] font-medium text-center">Powered by Murf Falcon & LiveKit</p>
        </div>
      </div>
    </aside>
  );
}

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const tokenSource = useMemo(() => {
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(appConfig)
      : TokenSource.endpoint('/api/token');
  }, [appConfig]);

  const session = useSession(
    tokenSource,
    {
      ...(appConfig.agentName ? { agentName: appConfig.agentName } : {}),
      agentConnectTimeoutMilliseconds: 45000,
    }
  );

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <main className="flex h-svh w-full bg-gradient-to-br from-orange-50 to-orange-100 dark:from-slate-900 dark:to-slate-950 overflow-hidden">
        <DashboardSidebar companyName={appConfig.companyName} />

        {/* Main Content (Agent) */}
        <div className="flex-1 h-full relative flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-300/20 via-transparent to-transparent pointer-events-none" />
          <ViewController appConfig={appConfig} />
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
