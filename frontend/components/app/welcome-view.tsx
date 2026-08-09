import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { WarningIcon } from '@phosphor-icons/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function WelcomeWaveform() {
  return (
    <div className="flex items-center justify-center gap-1.5 h-16 mb-6">
      {[...Array(6)].map((_, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-violet-500 to-indigo-400 animate-bounce"
          style={{
            height: `${24 + Math.sin(i) * 16}px`,
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1.2s'
          }}
        />
      ))}
    </div>
  );
}

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
                Please allow microphone access by clicking the lock icon in your browser's address bar, then try again.
              </AlertDescription>
            </Alert>
          ),
          { duration: 8000 }
        );
      }
    }
  };

  const isReturningUser = userName && userName !== 'Guest';

  return (
    <div ref={ref}>
      <section className="bg-transparent flex flex-col items-center justify-center text-center w-full max-w-lg mx-auto p-12 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-violet-500/20 shadow-2xl relative overflow-hidden group">
        <div className="absolute -inset-px bg-gradient-to-br from-violet-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <WelcomeWaveform />

        <div className="space-y-2 mb-6">
          <p className="text-foreground max-w-prose pt-1 leading-7 font-bold text-lg">
            {hasConnected ? (
              <>
                Call Ended <br/> 
                <span className="text-muted-foreground text-sm font-normal">कॉल समाप्त हो गई</span>
              </>
            ) : (
              <>
                {isReturningUser ? (
                  <>
                    Welcome back, {userName}! <br/>
                    <span className="text-violet-400 text-sm font-semibold">नमस्ते {userName}, दोबारा स्वागत है!</span>
                  </>
                ) : (
                  <>
                    Chat live with Anisha <br/> 
                    <span className="text-muted-foreground text-sm font-normal">अनीशा से बात करें</span>
                  </>
                )}
              </>
            )}
          </p>
        </div>

        {!hasConnected && !isReturningUser && (
          <div className="mt-2 w-72 text-left mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Your Name / आपका नाम
            </label>
            <input
              type="text"
              value={userName === 'Guest' ? '' : userName}
              onChange={(e) => onNameChange(e.target.value || 'Guest')}
              className="w-full px-4 py-2 rounded-xl border border-violet-500/20 bg-slate-950/60 backdrop-blur-sm text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              placeholder="Enter your name"
            />
          </div>
        )}

        <Button
          size="lg"
          onClick={handleStart}
          className="mt-2 w-72 rounded-full font-sans text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all duration-200"
        >
          {hasConnected ? 'Start Again / फिर से शुरू करें' : startButtonText}
        </Button>
      </section>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center justify-center w-full">
        <p className="text-muted-foreground max-w-prose pt-1 text-xs leading-5 font-normal text-pretty md:text-sm">
          A voice agent powered by Bharat AI
        </p>
      </div>
    </div>
  );
};
