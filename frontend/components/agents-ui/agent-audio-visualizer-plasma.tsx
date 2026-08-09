'use client';

import React, { useEffect, useRef } from 'react';
import type { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';
import type { AgentState, TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { useVoiceAssistant } from '@livekit/components-react';
import { cn } from '@/lib/shadcn/utils';

interface PlasmaOrbProps {
  state?: AgentState;
  audioTrack?: LocalAudioTrack | RemoteAudioTrack | TrackReferenceOrPlaceholder;
  color?: `#${string}`;
  className?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  return [255, 153, 51];
}

export function AgentAudioVisualizerPlasma({
  state = 'connecting',
  audioTrack,
  color = '#FF9933',
  className,
}: PlasmaOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const volumeRef = useRef(0);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const [r, g, b] = hexToRgb(color);

    const PARTICLES_COUNT = 60;
    const orbitalParticles = Array.from({ length: PARTICLES_COUNT }, (_, i) => ({
      angle: (i / PARTICLES_COUNT) * Math.PI * 2,
      baseRadius: 0.5 + Math.random() * 0.4,
      speed: 0.005 + Math.random() * 0.008,
      size: 1 + Math.random() * 2,
      wobbleSpeed: 2 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2
    }));

    const audioTrackObj =
      audioTrack &&
      'publication' in audioTrack &&
      audioTrack.publication?.track
        ? (audioTrack.publication.track as LocalAudioTrack | RemoteAudioTrack)
        : audioTrack;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let buffer: Uint8Array | null = null;

    if (audioTrackObj && typeof window !== 'undefined') {
      try {
        const mediaStreamTrack = (audioTrackObj as any).mediaStreamTrack || audioTrackObj;
        if (mediaStreamTrack instanceof MediaStreamTrack) {
          const stream = new MediaStream([mediaStreamTrack]);
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioCtx = new AudioContextClass();
          const source = audioCtx.createMediaStreamSource(stream);
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          buffer = new Uint8Array(analyser.frequencyBinCount);
          source.connect(analyser);
        }
      } catch (err) {
        console.error("Failed to initialize Web Audio Analyser: ", err);
      }
    }

    function getVolume(): number {
      if (analyser && buffer) {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        return sum / (buffer.length * 255);
      }
      return 0;
    }

    let t = 0;
    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const maxR = Math.min(W, H) * 0.44;
      const currentState = stateRef.current;

      const rawVol = getVolume();
      volumeRef.current = volumeRef.current * 0.8 + rawVol * 0.2;
      const vol = volumeRef.current;

      const isSpeaking = currentState === 'speaking';
      const isThinking = currentState === 'thinking';
      const isListening = currentState === 'listening';

      // Clear screen to keep it fully transparent
      ctx.clearRect(0, 0, W, H);

      // Core portal glow
      const portalGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.5);
      portalGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.15 + vol * 0.6})`);
      portalGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = portalGrad;
      ctx.fill();

      // Draw cyber circle segments
      const segmentCount = 120;
      const angleStep = (Math.PI * 2) / segmentCount;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.25);

      for (let i = 0; i < segmentCount; i++) {
        const angle = i * angleStep;
        // Frequency-like modulation
        const modulation = Math.sin(angle * 12 + t * 5) * (isSpeaking ? 18 * vol : 3);
        const radius = maxR * 0.65 + modulation;
        const length = 4 + (isSpeaking ? vol * 45 : 0) + Math.sin(t * 2 + i) * 2;
        
        const x1 = Math.cos(angle) * radius;
        const y1 = Math.sin(angle) * radius;
        const x2 = Math.cos(angle) * (radius + length);
        const y2 = Math.sin(angle) * (radius + length);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.2 + (i % 2 === 0 ? 0.65 : 0.25) * (isSpeaking ? 1.0 : 0.5)})`;
        ctx.lineWidth = i % 4 === 0 ? 2.5 : 1;
        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        ctx.shadowBlur = i % 8 === 0 ? 8 + vol * 15 : 0;
        ctx.stroke();
      }
      ctx.restore();

      // Outer tech target rings
      ctx.shadowBlur = 0;
      const targetRingR = maxR * 0.82;
      ctx.beginPath();
      ctx.arc(cx, cy, targetRingR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Thinking loading spinner
      if (isThinking) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 1.5);
        ctx.beginPath();
        ctx.arc(0, 0, maxR * 0.45, 0, Math.PI * 0.45);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.95)`;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();
      }

      // Orbiting particles with laser connections
      for (const p of orbitalParticles) {
        p.angle += p.speed * (1 + vol * 6);
        const wobble = 1 + Math.sin(t * p.wobbleSpeed + p.phase) * (0.04 + vol * 0.1);
        const currentRadius = maxR * p.baseRadius * wobble;
        const px = cx + Math.cos(p.angle) * currentRadius;
        const py = cy + Math.sin(p.angle) * currentRadius;

        const alpha = isSpeaking ? 0.9 : isListening ? 0.55 : 0.25;
        ctx.beginPath();
        ctx.arc(px, py, p.size * (1 + vol * 2.2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        ctx.shadowBlur = 4 + vol * 12;
        ctx.fill();
      }

      t += 0.016;
      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      if (audioCtx) {
        audioCtx.close();
      }
    };
  }, [color, audioTrack]);

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-3xl"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
      />
      <canvas
        ref={canvasRef}
        width={450}
        height={450}
        className="relative z-10 w-full h-full"
      />
    </div>
  );
}

export function AgentPlasmaVisualizer({
  color = '#FF9933',
  className,
}: {
  color?: `#${string}`;
  className?: string;
}) {
  const { state, audioTrack } = useVoiceAssistant();
  return (
    <AgentAudioVisualizerPlasma
      state={state}
      audioTrack={audioTrack}
      color={color}
      className={className}
    />
  );
}
