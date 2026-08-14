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
      details: 'Function calling for multi-agent handoffs & scheme/loan lookup',
    },
    {
      name: 'Voice Activity Detector',
      provider: 'Silero VAD + LiveKit Turn Detector',
      status: 'Prewarmed',
      details: 'Accurate interruption handling & turn detection',
    },
  ];

  const specialistAgents = [
    {
      name: 'Anisha (Main Customer Support)',
      role: 'General Inquiries & Remittances',
      color: 'from-violet-600 to-fuchsia-600',
      badge: 'Main Triage Agent',
      desc: 'Handles transaction fees, card blocking, exchange rates, and routes queries to specialists.',
    },
    {
      name: 'Ankit (Scheme Specialist)',
      role: 'Government Scheme Specialist',
      color: 'from-emerald-600 to-teal-600',
      badge: 'Specialist Agent',
      desc: 'Expert on PM-Svanidhi, PM-JDY (Jan Dhan Yojana), and PM-SBY schemes & eligibility.',
    },
    {
      name: 'Rohan (Loan & Credit Specialist)',
      role: 'Credit & Interest Specialist',
      color: 'from-amber-600 to-orange-600',
      badge: 'Specialist Agent',
      desc: 'Calculates credit limits, provides personal/business loan terms, and interest rate guidance.',
    },
  ];

  const handoffTools = [
    {
      name: '@function_tool transfer_to_schemes_specialist',
      target: 'Ankit (Schemes)',
      desc: 'Transfers the caller to the Government Schemes Specialist for PM-Svanidhi, PM-JDY, PM-SBY.',
    },
    {
      name: '@function_tool transfer_to_loans_specialist',
      target: 'Rohan (Loans)',
      desc: 'Transfers the caller to the Loan & Credit Specialist for personal/business loans & limits.',
    },
    {
      name: '@function_tool transfer_to_main_agent',
      target: 'Anisha (Main)',
      desc: 'Transfers the caller back to the main customer support assistant when specialist work completes.',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6 md:p-8">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-bold tracking-wider text-violet-400 uppercase">
          🤖 Day 9 Multi-Agent Handoff Architecture
        </div>
        <h1 className="text-3xl font-extrabold text-white">Multi-Agent System & Specialist Routing</h1>
        <p className="mt-1 text-sm text-slate-400">
          Powered by Murf Falcon TTS, LiveKit Agents SDK & Dynamic Tool Handoffs
        </p>
      </div>

      {/* Multi-Agent Architecture Cards */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-md">
        <h3 className="border-b border-white/10 pb-3 text-xs font-bold tracking-wider text-slate-300 uppercase">
          👥 Active Voice Agents in Session
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {specialistAgents.map((agent, i) => (
            <div
              key={i}
              className="flex flex-col justify-between space-y-3 rounded-xl border border-white/5 bg-slate-900/50 p-5 transition-all hover:border-violet-500/30"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${agent.color} font-extrabold text-white shadow-md`}>
                  {agent.name.charAt(0)}
                </div>
                <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[9px] font-extrabold text-violet-300">
                  {agent.badge}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{agent.name}</h4>
                <p className="text-[10px] font-semibold text-violet-400">{agent.role}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{agent.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Specs */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-md">
        <h3 className="border-b border-white/10 pb-3 text-xs font-bold tracking-wider text-slate-300 uppercase">
          ⚡ Voice Pipeline Configuration
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
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

      {/* Handoff Tools */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-md">
        <h3 className="border-b border-white/10 pb-3 text-xs font-bold tracking-wider text-white uppercase">
          🔀 Registered Handoff & Session Tools
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {handoffTools.map((tool, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-white/5 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-violet-400">
                  {tool.name}
                </span>
              </div>
              <p className="text-xs text-slate-300">{tool.desc}</p>
              <div className="border-t border-white/5 pt-1 text-[10px] text-emerald-400 font-semibold">
                Target: {tool.target}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
