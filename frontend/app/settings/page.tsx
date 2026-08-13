'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-6 md:p-8">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-bold tracking-wider text-violet-400 uppercase">
          ⚙️ Nexus Pay Configuration
        </div>
        <h1 className="text-3xl font-extrabold text-white">System & Voice Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure TTS voice models, WebSocket endpoints, and LiveKit credentials
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-md"
      >
        <div className="space-y-4">
          <h3 className="border-b border-white/10 pb-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
            🎙️ Murf Falcon TTS Parameters
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Selected Voice
              </label>
              <select className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-xs text-white outline-none focus:border-violet-500">
                <option value="en-IN-Anisha">Anisha (Indian English - Warm & Professional)</option>
                <option value="hi-IN-Kavya">Kavya (Hindi - Natural Regional)</option>
                <option value="en-US-Marcus">Marcus (US English - Direct Financial)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Streaming Latency Mode
              </label>
              <select className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-xs text-white outline-none focus:border-violet-500">
                <option value="falcon-sub200">Murf Falcon Ultra-Low Latency (Sub-200ms)</option>
                <option value="falcon-high-quality">Murf Falcon High Fidelity</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-white/10 pt-4">
          <h3 className="border-b border-white/10 pb-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
            🌐 LiveKit Server & Endpoints
          </h3>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Backend Analytics Endpoint
              </label>
              <input
                type="text"
                defaultValue="http://localhost:8085"
                className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 font-mono text-xs text-white outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                LiveKit WebSockets URL
              </label>
              <input
                type="text"
                defaultValue="ws://localhost:7880"
                className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 font-mono text-xs text-white outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          {saved ? (
            <span className="animate-pulse text-xs font-bold text-emerald-400">
              ✓ Settings saved successfully!
            </span>
          ) : (
            <span className="text-xs text-slate-500">Press save to persist changes.</span>
          )}

          <Button
            type="submit"
            className="rounded-xl bg-violet-600 px-6 py-3 text-xs font-bold text-white transition-all hover:bg-violet-500"
          >
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
