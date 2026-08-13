'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { WarningIcon } from '@phosphor-icons/react';
import CallAnalyticsGraph from '@/components/app/call-analytics-graph';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

const BharatIcon = () => (
  <svg
    className="h-12 w-12 text-violet-400"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <line x1="6" y1="15" x2="6.01" y2="15" />
    <line x1="10" y1="15" x2="14" y2="15" />
  </svg>
);

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void | Promise<void>;
  hasConnected?: boolean;
  userName?: string;
  onNameChange?: (name: string) => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  hasConnected,
  userName = 'Guest',
  onNameChange = () => {},
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    total: 0,
    successful: 0,
    failed: 0,
    success_rate: 0,
    reasons: {},
    history: [],
  });

  // Poll tickets and call analytics from backend server every 3 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Tickets
        const resTickets = await fetch('http://localhost:8085/tickets');
        if (resTickets.ok) {
          const data = await resTickets.json();
          if (Array.isArray(data)) {
            setTickets(data);
          }
        }

        // Analytics
        const resAnalytics = await fetch('http://localhost:8085/analytics');
        if (resAnalytics.ok) {
          const data = await resAnalytics.json();
          setAnalytics(data);
        }
      } catch (err) {
        // Silent catch
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    try {
      await onStartCall();
    } catch (e: any) {
      if (e?.message?.includes('NotAllowedError') || e?.name === 'NotAllowedError') {
        toast.custom(
          (id) => (
            <Alert onClick={() => toast.dismiss(id)} className="bg-accent w-full md:w-[364px]">
              <WarningIcon weight="bold" />
              <AlertTitle>Microphone Access Denied</AlertTitle>
              <AlertDescription>
                Please allow microphone access by clicking the lock icon in your browser's address
                bar, then try again.
              </AlertDescription>
            </Alert>
          ),
          { duration: 8000 }
        );
      }
    }
  };

  const featureCards = [
    {
      title: 'Transaction Support',
      desc: 'Check charges & transaction status',
      icon: (
        <svg
          className="h-5 w-5 text-violet-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      title: 'Card Protection',
      desc: 'Securely block lost or stolen cards',
      icon: (
        <svg
          className="h-5 w-5 text-violet-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
    },
    {
      title: 'Live Exchange Rates',
      desc: 'Real-time conversion & remittances',
      icon: (
        <svg
          className="h-5 w-5 text-violet-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: 'Human Escalation',
      desc: 'Secure anti-fraud handoff for safety',
      icon: (
        <svg
          className="h-5 w-5 text-violet-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div
      ref={ref}
      className="mx-auto flex w-full max-w-5xl flex-col items-center space-y-12 overflow-y-auto px-4 py-8 select-none"
    >
      {/* Brand Header */}
      <div className="flex w-full items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500 shadow-lg shadow-violet-500/50" />
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-sm font-extrabold tracking-widest text-transparent">
            NEXUS PAY
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
          BUILT WITH{' '}
          <span className="border-b border-violet-500 text-violet-400">LIVEKIT AGENTS</span>
        </div>
      </div>

      {/* Welcome Block */}
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center space-y-6 text-center">
        {/* Pulsing Avatar */}
        <div className="group relative">
          <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-xl transition-transform duration-500 group-hover:scale-110" />
          <div className="relative flex h-24 w-24 animate-pulse items-center justify-center rounded-full border-2 border-violet-500/30 bg-slate-950 shadow-2xl">
            <BharatIcon />
          </div>
        </div>

        {/* Badges and Titles */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1 text-[10px] font-bold tracking-wider text-violet-400 uppercase">
            💳 Financial Services AI Assistant • Day 8 Analytics Dashboard
          </div>

          <h1 className="flex items-center justify-center gap-3 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
            Nexus Pay
            <span className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
              नेक्सस पे
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-400">
            Your 24/7 AI Financial Voice Assistant. Smart payment support with{' '}
            <span className="font-semibold text-violet-400">Human Escalation Dispatch</span> and
            real-time performance analytics.
          </p>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[10px] font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Status: Ready — Click below to start voice call
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid w-full grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((card, i) => (
            <div
              key={i}
              className="flex flex-col items-center space-y-2 rounded-2xl border border-white/5 bg-slate-900/30 p-5 text-center backdrop-blur-md transition-all duration-300 hover:border-violet-500/20 hover:bg-slate-900/50"
            >
              <div className="mb-1 rounded-xl border border-violet-500/15 bg-violet-500/10 p-2.5">
                {card.icon}
              </div>
              <h3 className="text-sm font-bold text-slate-200">{card.title}</h3>
              <p className="text-[11px] leading-relaxed text-slate-500">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Start Talking Button */}
        <div className="pt-6 pb-2">
          <Button
            size="lg"
            onClick={handleStart}
            className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-6 text-sm font-bold tracking-wide text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300 hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] active:scale-[0.98]"
          >
            🤖 {hasConnected ? 'Start Again / फिर से शुरू करें' : startButtonText}
          </Button>
        </div>
      </div>

      <CallAnalyticsGraph analytics={analytics} />
      {/* Call Analytics Dashboard Card */}
      <div className="w-full max-w-4xl space-y-6 rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 animate-pulse text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
              📊 Call Analytics Command Dashboard
            </h3>
          </div>
          <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[9px] font-extrabold tracking-widest text-violet-400 uppercase">
            LIVE ANALYTICS ACTIVE
          </span>
        </div>

        {/* Grid of Main KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="flex flex-col justify-between rounded-xl border border-white/5 bg-white/5 p-4">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Total Calls
            </span>
            <span className="mt-2 text-3xl font-extrabold text-white">{analytics.total}</span>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-emerald-500/15 bg-emerald-500/[0.02] p-4">
            <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
              Successful Calls
            </span>
            <span className="mt-2 text-3xl font-extrabold text-emerald-400">
              {analytics.successful}
            </span>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-rose-500/15 bg-rose-500/[0.02] p-4">
            <span className="text-[10px] font-bold tracking-wider text-rose-400 uppercase">
              Failed Calls
            </span>
            <span className="mt-2 text-3xl font-extrabold text-rose-400">{analytics.failed}</span>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-violet-500/15 bg-violet-500/[0.02] p-4">
            <span className="text-[10px] font-bold tracking-wider text-violet-400 uppercase">
              Success Rate
            </span>
            <span className="mt-2 text-3xl font-extrabold text-violet-400">
              {analytics.success_rate}%
            </span>
          </div>
        </div>

        {/* Advanced Stats: Failure reasons distribution */}
        {analytics.failed > 0 && (
          <div className="space-y-3 rounded-xl border border-white/5 bg-slate-900/30 p-4">
            <h4 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Failure Cause Distribution
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-2 text-xs">
                <span className="text-slate-400">Incomplete Calls</span>
                <span className="font-bold text-slate-200">
                  {analytics.reasons['Incomplete'] || 0}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-2 text-xs">
                <span className="text-slate-400">Declined Consent</span>
                <span className="font-bold text-slate-200">
                  {analytics.reasons['Declined'] || 0}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-2 text-xs">
                <span className="text-slate-400">Security Violations</span>
                <span className="font-bold text-rose-400">
                  {analytics.reasons['Security Violation'] || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Live Call History List */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Recent Call History Log
          </h4>
          {analytics.history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
              No recent call history logs found. Complete a call session to populate.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                    <th className="px-3 py-2.5">Call ID / Time</th>
                    <th className="px-3 py-2.5">Channel</th>
                    <th className="px-3 py-2.5">Duration</th>
                    <th className="px-3 py-2.5">Outcome</th>
                    <th className="px-3 py-2.5">Actions Taken</th>
                    <th className="px-3 py-2.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {analytics.history.map((call: any) => (
                    <tr key={call.call_id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-3 py-3">
                        <div
                          className="max-w-[140px] truncate font-mono font-bold text-violet-400"
                          title={call.call_id}
                        >
                          {call.call_id}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {call.start_time.split('T')[0]}{' '}
                          {call.start_time.split('T')[1].substring(0, 5)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'rounded border px-2 py-0.5 text-[10px] font-semibold',
                            call.channel === 'SIP'
                              ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                              : 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                          )}
                        >
                          {call.channel}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-300">{call.duration}s</td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[9px] font-extrabold tracking-wider uppercase',
                            call.outcome === 'Success'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                              : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                          )}
                        >
                          {call.outcome}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-400">{call.actions_taken}</td>
                      <td className="px-3 py-3">
                        {call.outcome === 'Failed' ? (
                          <span className="text-[10px] text-rose-400/90 italic">
                            {call.failure_reason}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-emerald-400/90">
                            Completed task
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Persistent Bottom Dashboard Support Tickets Panel */}
      <div className="w-full max-w-4xl">
        <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.02] p-5 shadow-2xl backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between border-b border-red-500/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                🚨 Human Escalation Requests ({tickets.length})
              </h3>
            </div>
            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-[9px] font-extrabold tracking-widest text-red-400 uppercase">
              LIVE DISPATCH ACTIVE
            </span>
          </div>

          {tickets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs leading-relaxed text-slate-500">
              No active human escalations found. Everything is secure.
            </div>
          ) : (
            <div className="grid max-h-80 grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
              {tickets.map((ticket) => {
                const urgencyColors: any = {
                  Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                  Emergency: 'bg-red-500/10 text-red-400 border-red-500/20',
                };
                return (
                  <div
                    key={ticket.ticket_id}
                    className="space-y-2 rounded-xl border border-white/5 bg-slate-900/40 p-4 transition-all hover:border-violet-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-violet-400">
                        🎟️ Ticket: {ticket.ticket_id}
                      </span>
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-[9px] font-extrabold',
                          urgencyColors[ticket.urgency] || 'bg-slate-500/10'
                        )}
                      >
                        {ticket.urgency} URGENCY
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200">{ticket.summary}</p>
                    <div className="flex items-center justify-between border-t border-white/5 pt-1 text-[10px] text-slate-400">
                      <span>👤 Caller: {ticket.user_name}</span>
                      <span>📞 Followup: {ticket.followup_method}</span>
                      <span className="font-medium text-emerald-400">Status: {ticket.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
