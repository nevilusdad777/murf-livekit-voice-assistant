'use client';

import React from 'react';

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-6 md:p-8">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-bold tracking-wider text-violet-400 uppercase">
          📖 Documentation & Architecture
        </div>
        <h1 className="text-3xl font-extrabold text-white">Help & System Overview</h1>
        <p className="mt-1 text-sm text-slate-400">
          Nexus Pay — Powered by Murf Falcon, LiveKit Agents, and Deepgram Nova-3
        </p>
      </div>

      <div className="space-y-6 rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-md">
        <h3 className="border-b border-white/10 pb-2 text-sm font-bold tracking-wider text-white uppercase">
          🚀 Architecture Diagram
        </h3>

        <div className="space-y-3 rounded-xl border border-white/5 bg-slate-900/60 p-4 font-mono text-xs text-violet-300">
          <p>
            User Voice / SIP Call ➔ Deepgram Nova-3 (STT) ➔ Google Gemini 2.5 (LLM & Tools) ➔ Murf
            Falcon (Streaming TTS) ➔ WebRTC Audio output
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
            Key Features
          </h4>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <span className="font-bold text-emerald-400">✓</span>
              <span>
                <strong>Sub-200ms Streaming Voice:</strong> Murf Falcon generates realistic voice
                tokens with natural cadence.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="font-bold text-emerald-400">✓</span>
              <span>
                <strong>Human Escalation Handoff:</strong> When a user asks for human help, a ticket
                is created instantly in SQLite.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="font-bold text-emerald-400">✓</span>
              <span>
                <strong>Day 8 Call Analytics Dashboard:</strong> Full real-time visualization of
                success vs. failure counts and trends.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
