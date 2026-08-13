'use client';

import React, { useEffect, useState } from 'react';

export default function LogsPage() {
  const [analytics, setAnalytics] = useState<any>({
    history: [],
    total: 0,
    successful: 0,
    failed: 0,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('http://localhost:8085/analytics');
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (e) {}
    };
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 3000);
    return () => clearInterval(interval);
  }, []);

  const history = analytics.history || [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6 md:p-8">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-bold tracking-wider text-violet-400 uppercase">
          📜 Call Session History Logs
        </div>
        <h1 className="text-3xl font-extrabold text-white">Call Logs & Audit Trail</h1>
        <p className="mt-1 text-sm text-slate-400">
          Detailed transcript records, execution time, channels, and failure reasons
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Recorded Calls</span>
          <p className="mt-1 text-3xl font-extrabold text-white">{analytics.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] p-4">
          <span className="text-xs font-bold text-emerald-400 uppercase">Successful Calls</span>
          <p className="mt-1 text-3xl font-extrabold text-emerald-400">{analytics.successful}</p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.02] p-4">
          <span className="text-xs font-bold text-rose-400 uppercase">Failed Calls</span>
          <p className="mt-1 text-3xl font-extrabold text-rose-400">{analytics.failed}</p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-md">
        <h3 className="border-b border-white/10 pb-3 text-sm font-bold tracking-wider text-white uppercase">
          Detailed Call Execution History
        </h3>

        {history.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No call history records stored in SQLite database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                  <th className="px-4 py-3">Call ID</th>
                  <th className="px-4 py-3">Start Time</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Actions Executed</th>
                  <th className="px-4 py-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((call: any) => (
                  <tr key={call.call_id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono font-bold text-violet-400">
                      {call.call_id}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {call.start_time?.replace('T', ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${call.channel === 'SIP' ? 'border border-amber-500/20 bg-amber-500/10 text-amber-400' : 'border border-blue-500/20 bg-blue-500/10 text-blue-400'}`}
                      >
                        {call.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">{call.duration} sec</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase ${call.outcome === 'Success' ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border border-rose-500/20 bg-rose-500/10 text-rose-400'}`}
                      >
                        {call.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{call.actions_taken || 'None'}</td>
                    <td className="px-4 py-3 text-slate-400 italic">
                      {call.outcome === 'Failed' ? call.failure_reason : 'Completed query'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
