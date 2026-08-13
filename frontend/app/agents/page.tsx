'use client';

import React from 'react';

export default function AgentsPage() {
  const pipelineSpecs = [
    {
      name: 'Text-To-Speech (TTS)',
      provider: 'Murf Falcon TTS',
      status: 'Online (Sub-200ms streaming)',
      details: 'High-speed regional English & Hindi voice generation',
    },
    {
      name: 'Speech-To-Text (STT)',
      provider: 'Deepgram Nova-3',
      status: 'Active',
      details: 'Real-time multi-lingual transcription with low latency',
    },
    {
      name: 'Large Language Model',
      provider: 'Google Gemini 2.5 Flash',
      status: 'Active',
      details: 'Function calling for exchange rates, profile saving & escalations',
    },
    {
      name: 'Voice Activity Detector',
      provider: 'Silero VAD + LiveKit Turn Detector',
      status: 'Prewarmed',
      details: 'Accurate interruption handling & turn detection',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6 md:p-8">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-bold tracking-wider text-violet-400 uppercase">
          🤖 AI Voice Pipeline Config
        </div>
        <h1 className="text-3xl font-extrabold text-white">Agent Voice System & Models</h1>
        <p className="mt-1 text-sm text-slate-400">
          Anisha — Powered by Murf Falcon TTS and LiveKit Agents SDK
        </p>
      </div>

      {/* Active Agent Card */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-lg font-extrabold text-white shadow-lg">
              A
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Anisha (Financial Assistant)</h2>
              <p className="text-xs text-slate-400">
                Primary Voice Agent • Outbound & Inbound Enabled
              </p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
            ● READY / LIVE
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 md:grid-cols-4">
          {pipelineSpecs.map((spec, i) => (
            <div key={i} className="space-y-1 rounded-xl border border-white/5 bg-slate-900/50 p-4">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {spec.name}
              </span>
              <h3 className="text-sm font-bold text-violet-400">{spec.provider}</h3>
              <span className="inline-block text-[10px] font-semibold text-emerald-400">
                {spec.status}
              </span>
              <p className="pt-1 text-[11px] leading-tight text-slate-400">{spec.details}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Available Tools */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-md">
        <h3 className="border-b border-white/10 pb-3 text-sm font-bold tracking-wider text-white uppercase">
          🛠️ Registered Function Tools
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2 rounded-xl border border-white/5 bg-slate-900/50 p-4">
            <span className="font-mono text-xs font-bold text-violet-400">
              @function_tool save_profile
            </span>
            <p className="text-xs text-slate-400">
              Saves customer memory & preference profiles to persistent storage.
            </p>
          </div>
          <div className="space-y-2 rounded-xl border border-white/5 bg-slate-900/50 p-4">
            <span className="font-mono text-xs font-bold text-violet-400">
              @function_tool get_exchange_rates
            </span>
            <p className="text-xs text-slate-400">
              Fetches live currency exchange rates for USD, EUR, GBP, AED to INR.
            </p>
          </div>
          <div className="space-y-2 rounded-xl border border-white/5 bg-slate-900/50 p-4">
            <span className="font-mono text-xs font-bold text-violet-400">
              @function_tool create_escalation
            </span>
            <p className="text-xs text-slate-400">
              Creates human escalation support ticket when caller asks for human help.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
