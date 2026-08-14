'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, type MotionProps, motion } from 'motion/react';
import {
  useAgent,
  useChat,
  useSessionContext,
  useSessionMessages,
} from '@livekit/components-react';
import { AgentChatTranscript } from '@/components/agents-ui/agent-chat-transcript';
import {
  AgentControlBar,
  type AgentControlBarControls,
} from '@/components/agents-ui/agent-control-bar';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { cn } from '@/lib/shadcn/utils';
import { TileLayout } from './tile-view';

const MotionMessage = motion.create(Shimmer);

const BOTTOM_VIEW_MOTION_PROPS: MotionProps = {
  variants: {
    visible: {
      opacity: 1,
      translateY: '0%',
    },
    hidden: {
      opacity: 0,
      translateY: '100%',
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.3,
    delay: 0.5,
    ease: 'easeOut',
  },
};

const CHAT_MOTION_PROPS: MotionProps = {
  variants: {
    hidden: {
      opacity: 0,
      transition: {
        ease: 'easeOut',
        duration: 0.3,
      },
    },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.2,
        ease: 'easeOut',
        duration: 0.3,
      },
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

const SHIMMER_MOTION_PROPS: MotionProps = {
  variants: {
    visible: {
      opacity: 1,
      transition: {
        ease: 'easeIn',
        duration: 0.5,
        delay: 0.8,
      },
    },
    hidden: {
      opacity: 0,
      transition: {
        ease: 'easeIn',
        duration: 0.5,
        delay: 0,
      },
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

interface FadeProps {
  top?: boolean;
  bottom?: boolean;
  className?: string;
}

export function Fade({ top = false, bottom = false, className }: FadeProps) {
  return (
    <div
      className={cn(
        'pointer-events-none h-4 bg-linear-to-b from-transparent to-transparent',
        top && 'bg-linear-to-b',
        bottom && 'bg-linear-to-t',
        className
      )}
    />
  );
}

export interface AgentSessionView_01Props {
  /**
   * Message shown above the controls before the first chat message is sent.
   *
   * @default 'Agent is listening, ask it a question'
   */
  preConnectMessage?: string;
  /**
   * Enables or disables the chat toggle and transcript input controls.
   *
   * @default true
   */
  supportsChatInput?: boolean;
  /**
   * Enables or disables camera controls in the bottom control bar.
   *
   * @default true
   */
  supportsVideoInput?: boolean;
  /**
   * Enables or disables screen sharing controls in the bottom control bar.
   *
   * @default true
   */
  supportsScreenShare?: boolean;
  /**
   * Shows a pre-connect buffer state with a shimmer message before messages appear.
   *
   * @default true
   */
  isPreConnectBufferEnabled?: boolean;

  /** Selects the visualizer style rendered in the main tile area. */
  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura' | 'plasma';
  /** Primary hex color used by supported audio visualizer variants. */
  audioVisualizerColor?: `#${string}`;
  /** Hue shift intensity used by certain visualizers. */
  audioVisualizerColorShift?: number;
  /** Number of bars to render when `audioVisualizerType` is `bar`. */
  audioVisualizerBarCount?: number;
  /** Number of rows in the visualizer when `audioVisualizerType` is `grid`. */
  audioVisualizerGridRowCount?: number;
  /** Number of columns in the visualizer when `audioVisualizerType` is `grid`. */
  audioVisualizerGridColumnCount?: number;
  /** Number of radial bars when `audioVisualizerType` is `radial`. */
  audioVisualizerRadialBarCount?: number;
  /** Base radius of the radial visualizer when `audioVisualizerType` is `radial`. */
  audioVisualizerRadialRadius?: number;
  /** Stroke width of the wave path when `audioVisualizerType` is `wave`. */
  audioVisualizerWaveLineWidth?: number;
  /** Optional class name merged onto the outer `<section>` container. */
  className?: string;
}

export function AgentSessionView_01({
  preConnectMessage = 'Agent is listening, ask it a question',
  supportsChatInput = true,
  supportsVideoInput = true,
  supportsScreenShare = true,
  isPreConnectBufferEnabled = true,

  audioVisualizerType,
  audioVisualizerColor,
  audioVisualizerColorShift,
  audioVisualizerBarCount,
  audioVisualizerGridRowCount,
  audioVisualizerGridColumnCount,
  audioVisualizerRadialBarCount,
  audioVisualizerRadialRadius,
  audioVisualizerWaveLineWidth,
  ref,
  className,
  ...props
}: React.ComponentProps<'section'> & AgentSessionView_01Props) {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const [chatOpen, setChatOpen] = useState(true);
  const [quickActionsCollapsed, setQuickActionsCollapsed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { state: agentState } = useAgent();

  const controls: AgentControlBarControls = {
    leave: true,
    microphone: true,
    chat: supportsChatInput,
    camera: supportsVideoInput,
    screenShare: supportsScreenShare,
  };

  const [liveRates, setLiveRates] = useState<any>(null);
  const { send } = useChat();

  const handleAction = async (prompt: string) => {
    try {
      await send(prompt);
    } catch (e) {
      // Catch empty/send errors
    }
  };

  const actions = [
    {
      title: 'Check Fees',
      desc: 'UPI & Card charges',
      prompt: 'What are the transaction charges for UPI and Credit Cards?',
    },
    {
      title: 'Report Lost Card',
      desc: 'Securely block card',
      prompt: 'I want to block my card because I lost it.',
    },
    {
      title: 'UPI Support',
      desc: 'Failed transfers help',
      prompt: 'My UPI transaction failed but money got debited.',
    },
  ];

  useEffect(() => {
    const lastMessage = messages.at(-1);
    const lastMessageIsLocal = lastMessage?.from?.isLocal === true;

    if (scrollAreaRef.current && lastMessageIsLocal) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const [tickets, setTickets] = useState<any[]>([]);

  // Hook into LiveKit room's dataReceived event to capture the exchange rate pushes & forget user events
  useEffect(() => {
    const room = session.room;
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        if (data.type === 'exchange_rates') {
          setLiveRates(data);
        } else if (data.type === 'forget_user') {
          localStorage.removeItem('bharatpay_user_id');
          localStorage.removeItem('bharatpay_user_name');
        } else if (data.type === 'ticket_created') {
          setTickets((prev) => [data, ...prev]);
        }
      } catch (e) {
        // Not a JSON or not exchange rate data
      }
    };

    room.on('dataReceived', handleDataReceived);
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [session.room]);

  const getStatusBadge = () => {
    if (!session.isConnected) return null;
    if (agentState === 'connecting') {
      return { text: 'Connecting... / जुड़ रहा है...', color: 'bg-[#FFAE5C] text-black' };
    }
    if (agentState === 'speaking') {
      return {
        text: 'Anisha is speaking... / अनीशा बोल रही है...',
        color: 'bg-green-600 text-white',
      };
    }
    if (agentState === 'listening') {
      return { text: 'Listening to you... / सुन रही हूँ...', color: 'bg-blue-600 text-white' };
    }
    return null;
  };
  const status = getStatusBadge();

  return (
    <section
      ref={ref}
      className={cn('relative z-10 h-full w-full overflow-hidden bg-transparent', className)}
      {...props}
    >
      <Fade top className="absolute inset-x-4 top-0 z-10 h-40" />

      {/* Status badge — sits BELOW the visualizer zone, above the transcript */}
      {status && (
        <div className="pointer-events-none absolute top-2 left-1/2 z-50 -translate-x-1/2">
          <div
            className={`animate-pulse rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg ${status.color}`}
          >
            {status.text}
          </div>
        </div>
      )}

      {/* Floating Left Side Column: Unified Exchange Rates & Quick Actions (prevent overlapping controls) */}
      <div className="absolute top-16 left-4 bottom-32 z-40 flex w-72 flex-col gap-4 overflow-y-auto pointer-events-none md:top-24 md:left-6 scrollbar-none">
        {/* Floating Live Currency Rates Card */}
        <AnimatePresence>
          {liveRates && (
            <motion.div
              initial={{ opacity: 0, x: -100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, scale: 0.9 }}
              className="pointer-events-auto w-full rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-2.5 w-2.5 rounded-full ${liveRates.fallback ? 'animate-pulse bg-amber-500' : 'animate-pulse bg-emerald-500'}`}
                  />
                  <h4 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                    {liveRates.fallback ? 'Cached Exchange Rates' : 'Live Exchange Rates'}
                  </h4>
                </div>
                <button
                  onClick={() => setLiveRates(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {Object.entries(liveRates.rates).map(([currency, rate]: [string, any]) => (
                  <div key={currency} className="flex justify-between text-sm">
                    <span className="font-semibold text-violet-400">1 {currency}</span>
                    <span className="font-bold text-slate-100">₹{rate} INR</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 border-t border-white/5 pt-2 text-right text-[10px] text-slate-500">
                {liveRates.date}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Quick Actions & Security Panel (Removed per request) */}

      {/* Floating Support Tickets Card */}
      </div>

      {/* Floating Support Tickets Card */}
      <AnimatePresence>
        {tickets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="absolute top-12 right-4 z-50 w-80 rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl backdrop-blur-xl md:top-24 md:right-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-violet-500" />
                <h4 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                  Escalated Tickets ({tickets.length})
                </h4>
              </div>
              <button
                onClick={() => setTickets([])}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-3 max-h-60 space-y-3 overflow-y-auto pr-1">
              {tickets.map((ticket, index) => {
                const urgencyColors: any = {
                  Low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                  Medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                  High: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                  Emergency: 'bg-red-500/20 text-red-400 border-red-500/30',
                };
                return (
                  <div
                    key={index}
                    className="space-y-1.5 rounded-xl border border-white/5 bg-white/5 p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-violet-400">
                        {ticket.ticket_id}
                      </span>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[9px] font-semibold',
                          urgencyColors[ticket.urgency] || 'bg-slate-500/20'
                        )}
                      >
                        {ticket.urgency}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-200">{ticket.summary}</p>
                    <div className="flex items-center justify-between text-[9px] text-slate-500">
                      <span>Followup: {ticket.followup_method}</span>
                      <span>{ticket.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* transcript */}

      <div
        className={cn(
          'absolute top-28 bottom-[135px] z-30 flex w-full flex-col pointer-events-auto transition-all duration-300 md:bottom-[170px]'
        )}
      >
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              {...CHAT_MOTION_PROPS}
              className="flex h-full w-full flex-col gap-4 space-y-3 transition-opacity duration-300 ease-out"
            >
              <AgentChatTranscript
                agentState={agentState}
                messages={messages}
                className="mx-auto w-full max-w-2xl overflow-y-auto pointer-events-auto [&_.is-user>div]:rounded-[22px] [&>div>div]:px-4 [&>div>div]:pt-10 md:[&>div>div]:px-6"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Tile layout */}
      <TileLayout
        chatOpen={chatOpen}
        audioVisualizerType={audioVisualizerType}
        audioVisualizerColor={audioVisualizerColor}
        audioVisualizerColorShift={audioVisualizerColorShift}
        audioVisualizerBarCount={audioVisualizerBarCount}
        audioVisualizerRadialBarCount={audioVisualizerRadialBarCount}
        audioVisualizerRadialRadius={audioVisualizerRadialRadius}
        audioVisualizerGridRowCount={audioVisualizerGridRowCount}
        audioVisualizerGridColumnCount={audioVisualizerGridColumnCount}
        audioVisualizerWaveLineWidth={audioVisualizerWaveLineWidth}
      />
      {/* Bottom */}
      <motion.div
        {...BOTTOM_VIEW_MOTION_PROPS}
        className="absolute inset-x-3 bottom-0 z-50 md:inset-x-12"
      >
        {/* Pre-connect message */}
        {isPreConnectBufferEnabled && (
          <AnimatePresence>
            {messages.length === 0 && (
              <MotionMessage
                key="pre-connect-message"
                duration={2}
                aria-hidden={messages.length > 0}
                {...SHIMMER_MOTION_PROPS}
                className="pointer-events-none mx-auto block w-full max-w-2xl pb-4 text-center text-sm font-semibold"
              >
                {preConnectMessage}
              </MotionMessage>
            )}
          </AnimatePresence>
        )}
        <div className="bg-background relative mx-auto max-w-2xl pb-3 md:pb-12">
          <Fade bottom className="absolute inset-x-0 top-0 h-4 -translate-y-full" />
          <AgentControlBar
            variant="livekit"
            controls={controls}
            isChatOpen={chatOpen}
            isConnected={session.isConnected}
            onDisconnect={session.end}
            onIsChatOpenChange={setChatOpen}
          />
        </div>
      </motion.div>
    </section>
  );
}
