/* ── 0 · external deps ─────────────────────────────────────────────────────── */
import React, {
  useState, useEffect, useRef, memo
}                                   from 'react';
import { createRoot }               from 'react-dom/client';
import { motion, AnimatePresence }  from 'framer-motion';
import { create }                   from 'zustand';
import toast, { Toaster }           from 'react-hot-toast';

/* ── 1 · type helpers ──────────────────────────────────────────────────────── */
type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | 'K' | 'Q' | 'J'
          | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

interface Card { suit: Suit; rank: Rank; id: string; }
interface Log  { t: string; g: string; score: number; }

interface Settings {
  hitGesture   : string;
  standGesture : string;
  doubleGesture: string;
  holdTime     : number;
  confidence   : number;
  autoLearn    : boolean;
  muted        : boolean;
  leftHand     : boolean;
  vibration    : boolean;
  theme        : 'dark' | 'neon' | 'classic';
}

type Phase = 'betting' | 'dealing' | 'playing' | 'dealer' | 'ended';

interface Store {
  /* settings */
  settings: Settings;
  updateSettings: (u: Partial<Settings>) => void;
  resetSettings : () => void;

  /* AI log */
  logs   : Log[];
  pushLog: (l: Log) => void;

  /* blackjack */
  balance: number;
  bet: number;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  phase: Phase;
  showDealer: boolean;
  msg: string;
  winStreak: number;
  lastWin: boolean;

  setBet : (v: number) => void;
  deal   : () => void;
  checkBJ: (p: Card[], d: Card[]) => void;
  hit    : () => void;
  stand  : () => void;
  double : () => void;
  dealerPlay: () => void;
  end    : (msg?: string, win?: number | null) => void;
  next   : () => void;
  reset  : () => void;
}

/* ── 2 · constants ─────────────────────────────────────────────────────────── */
const GESTURE_OPTIONS = [
  'Open_Palm',  'Closed_Fist', 'Thumb_Up',   'Thumb_Down',
  'Victory',    'ILoveYou',    'Pointing_Up','OK_Sign',
  'Call_Me',    'Live_Long',   'Rock_On'
] as const;

const DEFAULT_SETTINGS: Settings = {
  hitGesture   : 'Open_Palm',
  standGesture : 'Closed_Fist',
  doubleGesture: 'Thumb_Down',
  holdTime     : 600,
  confidence   : 0.75,
  autoLearn    : true,
  muted        : false,
  leftHand     : false,
  vibration    : true,
  theme        : 'neon'
};

const CONFIG = {
  startingBalance: 1_000,
  minBet         : 10,
  defaultBet     : 50,
  blackjackPayout: 1.5,
  dealerStandsOn : 17
};

const THEMES = {
  dark: {
    bg: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900',
    table: 'bg-gradient-to-br from-green-900/90 to-green-800/90 backdrop-blur-sm',
    card: 'bg-white',
    accent: 'bg-blue-600',
    text: 'text-white'
  },
  neon: {
    bg: 'bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900',
    table: 'bg-gradient-to-br from-purple-800/40 to-pink-800/40 backdrop-blur-xl border border-pink-500/30',
    card: 'bg-gradient-to-br from-white to-gray-100',
    accent: 'bg-gradient-to-r from-pink-500 to-blue-500',
    text: 'text-white'
  },
  classic: {
    bg: 'bg-gradient-to-br from-green-800 to-green-900',
    table: 'bg-gradient-to-br from-green-700 to-green-800',
    card: 'bg-white',
    accent: 'bg-red-700',
    text: 'text-white'
  }
};

/* ── 3 · MediaPipe wrapper ─────────────────────────────────────────────────── */
interface RawGesture { categoryName: string; score: number; }

class MediaPipeRecognizer {
  private recog: any;
  private video?: HTMLVideoElement;
  private lastGesture: string | null = null;
  private gestureStartTime: number = 0;

  async init(video: HTMLVideoElement) {
    // @ts-ignore – lib ships no d.ts
    const { FilesetResolver, GestureRecognizer } =
      await import('@mediapipe/tasks-vision');

    // @ts-ignore
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm'
    );

    // @ts-ignore
    this.recog = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
        delegate: 'GPU'
      },
      runningMode : 'VIDEO',
      numHands    : 2,
      minHandDetectionConfidence : 0.5,
      minHandPresenceConfidence  : 0.5,
      minTrackingConfidence      : 0.5
    });

    this.video = video;
  }

  recognise(ts: number): RawGesture | null {
    if (!this.recog || !this.video) return null;
    
    try {
      const r = this.recog.recognizeForVideo(this.video, ts);
      const gesture = r.gestures?.[0]?.[0];
      
      if (gesture) {
        // Smooth gesture transitions
        if (gesture.categoryName !== this.lastGesture) {
          this.lastGesture = gesture.categoryName;
          this.gestureStartTime = ts;
        }
        
        // Add temporal smoothing
        const timeSinceStart = ts - this.gestureStartTime;
        const temporalBoost = Math.min(timeSinceStart / 1000, 0.1);
        
        return {
          categoryName: gesture.categoryName,
          score: Math.min(gesture.score + temporalBoost, 1)
        };
      }
      
      return null;
    } catch (e) {
      console.warn('Gesture recognition error:', e);
      return null;
    }
  }

  async close() {
    await this.recog?.close();
    this.recog = null;
    this.lastGesture = null;
  }
}

/* ── 4 · helpers ───────────────────────────────────────────────────────────── */
const createDeck = (): Card[] =>
  (['♠','♥','♦','♣'] as Suit[])
    .flatMap(s =>
      (['A','K','Q','J','10','9','8','7','6','5','4','3','2'] as Rank[])
        .map(r => ({ suit:s, rank:r, id:`${r}-${s}-${crypto.randomUUID()}` }))
    )
    .sort(() => Math.random() - 0.5);

const calc = (hand: (Card | undefined)[]): number => {
  let value = 0;
  let aces  = 0;

  hand.forEach(card => {
    if (!card) return;
    if (card.rank === 'A') {
      value += 11;
      aces  += 1;
    } else if ('KQJ'.includes(card.rank)) {
      value += 10;
    } else {
      value += Number(card.rank);
    }
  });

  while (value > 21 && aces--) value -= 10;
  return value;
};

const vibrate = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

/* ── 5 · zustand store ─────────────────────────────────────────────────────── */
const useGame = create<Store>((set, get) => ({
  /* settings */
  settings: (() => {
    try {
      return { ...DEFAULT_SETTINGS,
               ...JSON.parse(localStorage.getItem('settings') || '{}') };
    } catch {
      return DEFAULT_SETTINGS;
    }
  })(),

  updateSettings: u => set(state => {
    const ns = { ...state.settings };

    const gestureKeys = ['hitGesture','standGesture','doubleGesture'] as const;
    for (const k of gestureKeys) {
      if (u[k] && u[k] !== ns[k]) {
        if (gestureKeys.some(other => other !== k && ns[other] === u[k])) {
          toast.error('That gesture is already in use', {
            icon: '⚠️',
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            }
          });
          return {};
        }
      }
    }

    Object.assign(ns, u);
    localStorage.setItem('settings', JSON.stringify(ns));
    return { settings: ns };
  }),

  resetSettings: () => set(() => {
    localStorage.removeItem('settings');
    return { settings: { ...DEFAULT_SETTINGS } };
  }),

  /* log */
  logs: [],
  pushLog: l => set(st => ({ logs: [l, ...st.logs.slice(0, 49)] })),

  /* blackjack state */
  balance: CONFIG.startingBalance,
  bet    : CONFIG.defaultBet,
  deck   : [],
  playerHand: [],
  dealerHand: [],
  phase  : 'betting',
  showDealer: false,
  msg    : 'Place your bet to start!',
  winStreak: 0,
  lastWin: false,

  setBet: v => set(() => ({
    bet: Math.min(Math.max(CONFIG.minBet, v || 0), get().balance)
  })),

  deal: () => {
    const { bet, balance, settings } = get();
    if (bet > balance || bet < CONFIG.minBet) return;

    if (settings.vibration) vibrate(50);

    const deck = createDeck();
    const player = [deck.pop()!, deck.pop()!];
    const dealer = [deck.pop()!, deck.pop()!];

    set({
      deck,
      playerHand: [],
      dealerHand: [],
      balance: balance - bet,
      phase: 'dealing',
      showDealer: false,
      msg: 'Dealing cards...'
    });

    /* sequential dealing animation */
    const later = (fn: () => void, t: number) => setTimeout(fn, t);
    later(() => set({ playerHand: [player[0]] }), 300);
    later(() => set({ dealerHand: [dealer[0]] }), 700);
    later(() => set({ playerHand: player }), 1100);
    later(() => set({ dealerHand: dealer }), 1500);
    later(() => get().checkBJ(player, dealer), 2100);
  },

  checkBJ: (p, d) => {
    const pv = calc(p);
    const dv = calc(d);

    if (pv === 21 || dv === 21) {
      set({ showDealer: true });

      if (pv === 21 && dv === 21) {
        get().end('Push! Both have Blackjack.', get().bet);
      } else if (pv === 21) {
        get().end(`Blackjack! You win $${Math.floor(get().bet * CONFIG.blackjackPayout)}!`,
                  get().bet * (1 + CONFIG.blackjackPayout));
      } else {
        get().end('Dealer has Blackjack. You lose.', 0);
      }
    } else {
      set({ phase: 'playing', msg: 'Your turn - make your move!' });
    }
  },

  hit: () => {
    if (get().phase !== 'playing') return;

    const deck = [...get().deck];
    const hand = [...get().playerHand, deck.pop()!];

    set({ deck, playerHand: hand });

    const val = calc(hand);
    if (val === 21) {
      set({ msg: '21! Standing automatically...' });
      setTimeout(() => get().stand(), 600);
    } else if (val > 21) {
      setTimeout(() => get().end('Bust! You went over 21.', 0), 600);
    }
  },

  stand: () => {
    if (get().phase !== 'playing') return;

    set({ phase: 'dealer', showDealer: true, msg: "Dealer's turn..." });
    setTimeout(() => get().dealerPlay(), 1000);
  },

  double: () => {
    const { phase, bet, balance, playerHand, settings } = get();
    if (phase !== 'playing') return;

    if (playerHand.length !== 2) {
      toast.error('Double Down only on first turn!', {
        icon: '🚫',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        }
      });
      return;
    }

    if (balance < bet) {
      toast.error('Not enough chips to double!', {
        icon: '💸',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        }
      });
      return;
    }

    if (settings.vibration) vibrate([50, 50, 50]);

    const deck = [...get().deck];
    const hand = [...playerHand, deck.pop()!];
    set({ deck, playerHand: hand, balance: balance - bet, bet: bet * 2 });
    setTimeout(() => get().stand(), 600);
  },

  dealerPlay: () => {
    const { deck, dealerHand } = get();

    if (calc(dealerHand) >= CONFIG.dealerStandsOn) {
      return get().end();
    }

    dealerHand.push(deck.pop()!);
    set({ deck: [...deck], dealerHand: [...dealerHand] });
    setTimeout(() => get().dealerPlay(), 800);
  },

  end: (msg = '', win = null) => {
    const { playerHand, dealerHand, bet, balance, winStreak, settings } = get();

    if (win === null) {
      const pv = calc(playerHand);
      const dv = calc(dealerHand);

      if (pv > 21)       { msg = 'Bust! You went over 21.'; win = 0; }
      else if (dv > 21)  { msg = 'Dealer busts! You win!';  win = bet * 2; }
      else if (pv > dv)  { msg = 'You win! Higher hand!';   win = bet * 2; }
      else if (pv < dv)  { msg = 'Dealer wins.';            win = 0; }
      else               { msg = 'Push! It\'s a tie.';       win = bet; }
    }

    const isWin = win > bet;
    const newStreak = isWin ? winStreak + 1 : 0;

    if (settings.vibration) {
      vibrate(isWin ? [100, 50, 100] : [200]);
    }

    set({ 
      balance: balance + (win ?? 0), 
      phase: 'ended', 
      msg, 
      showDealer: true,
      winStreak: newStreak,
      lastWin: isWin
    });

    if (newStreak >= 3) {
      toast.success(`${newStreak} wins in a row! 🔥`, {
        icon: '🎯',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        }
      });
    }
  },

  next: () => {
    const bal = get().balance;
    if (bal < CONFIG.minBet) {
      return set({ phase: 'ended', msg: 'Game over! Out of chips.' });
    }

    set({
      deck: [],
      playerHand: [],
      dealerHand: [],
      phase: 'betting',
      msg: 'Place your bet!',
      bet: Math.min(get().bet, bal),
      lastWin: false
    });
  },

  reset: () => set({
    balance: CONFIG.startingBalance,
    bet: CONFIG.defaultBet,
    deck: [],
    playerHand: [],
    dealerHand: [],
    phase: 'betting',
    showDealer: false,
    msg: 'Welcome back! Place your bet.',
    winStreak: 0,
    lastWin: false
  })
}));

/* ── 6 · calibration wizard ───────────────────────────────────────────────── */
const Ring: React.FC<{ progress: number }> = ({ progress }) => {
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32">
      <defs>
        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle
        cx="60"
        cy="60"
        r="54"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="8"
        fill="none"
      />
      <motion.circle
        cx="60"
        cy="60"
        r="54"
        stroke="url(#ringGradient)"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        initial={{ rotate: -90 }}
        style={{ transformOrigin: '60px 60px' }}
      />
    </svg>
  );
};

const Calibrate: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const steps = [
    { label: 'Hit',    key: 'hitGesture' as const,    icon: '✋' },
    { label: 'Stand',  key: 'standGesture' as const,  icon: '✊' },
    { label: 'Double', key: 'doubleGesture' as const, icon: '👎' }
  ];

  const videoRef = useRef<HTMLVideoElement>(null);
  const recogRef = useRef<MediaPipeRecognizer>();
  const rafRef   = useRef<number>();
  const startMs  = useRef<number>(0);

  const [ready, setReady] = useState(false);
  const [det, setDet]     = useState<RawGesture | null>(null);
  const [prog, setProg]   = useState(0);
  const [idx, setIdx]     = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { settings, updateSettings } = useGame();

  useEffect(() => {
    let live = true;

    (async () => {
      try {
        setError(null);
        const r = new MediaPipeRecognizer();
        await r.init(videoRef.current!);
        if (!live) return r.close();
        recogRef.current = r;

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });
        
        if (!live) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        videoRef.current!.srcObject = stream;
        videoRef.current!.onloadedmetadata = () => setReady(true);
      } catch (e) {
        setError('Camera access denied. Please allow camera permissions.');
        console.error(e);
      }
    })();

    return () => {
      live = false;
      recogRef.current?.close();
      const media = videoRef.current?.srcObject as MediaStream | null;
      media?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!ready || !recogRef.current) return;

    const loop = (ts: number) => {
      if (idx >= steps.length) {
        toast.success('Calibration complete! 🎉', {
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          }
        });
        onClose();
        return;
      }

      const g = recogRef.current!.recognise(ts);

      if (g && g.categoryName === settings[steps[idx].key] && g.score >= 0.9) {
        toast.success(`${steps[idx].label} already perfect! ✨`);
        setIdx(i => i + 1);
        setProg(0);
        setDet(null);
        return (rafRef.current = requestAnimationFrame(loop));
      }

      if (g && g.score >= 0.7) {
        if (!det || det.categoryName !== g.categoryName) {
          startMs.current = performance.now();
          vibrate(50);
        }
        setDet(g);
        const p = Math.min((performance.now() - startMs.current) / 800, 1);
        setProg(p);

        if (p === 1) {
          const tgt = steps[idx].key;
          if (Object.values(settings).includes(g.categoryName) && settings[tgt] !== g.categoryName) {
            toast.error('Gesture already used!');
            vibrate([100, 50, 100]);
          } else {
            updateSettings({ [tgt]: g.categoryName });
            toast.success(`${steps[idx].label} set to ${g.categoryName.replace(/_/g, ' ')}`);
            vibrate([50, 50]);
            setIdx(i => i + 1);
          }
          setDet(null);
          setProg(0);
        }
      } else {
        setDet(null);
        setProg(0);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [ready, idx, settings, updateSettings, onClose, det]);

  const current = steps[idx];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-700"
      >
        <div className="bg-gradient-to-r from-pink-600 to-blue-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            Gesture Calibration {current && `- ${current.icon}`}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        <div className="aspect-video bg-black relative">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
            style={{ transform: settings.leftHand ? 'scaleX(-1)' : 'none' }}
          />
          
          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent mx-auto mb-4" />
                <p className="text-white">Initializing camera...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center text-red-400">
                <p className="text-6xl mb-4">📷</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {det && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Ring progress={prog} />
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white mt-4 text-lg font-semibold"
                >
                  {det.categoryName.replace(/_/g, ' ')}
                </motion.p>
              </div>
            </div>
          )}

          {/* Progress indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-12 rounded-full transition-all ${
                  i < idx ? 'bg-green-500' : i === idx ? 'bg-pink-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6 text-center">
          {current ? (
            <>
              <p className="text-white text-lg mb-2">
                Show the <span className="font-bold text-pink-400">{current.label}</span> gesture
              </p>
              <p className="text-gray-400">
                Hold steady until the ring completes
              </p>
            </>
          ) : (
            <p className="text-green-400 text-lg">All done! Let's play!</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ── 7 · card component ───────────────────────────────────────────────────── */
const CardComponent = memo<{ rank: Rank; suit: Suit; hidden?: boolean }>(
  ({ rank, suit, hidden = false }) => {
    const color = ['♥', '♦'].includes(suit) ? 'text-red-500' : 'text-gray-900';
    const theme = useGame(s => s.settings.theme);

    return (
      <motion.div
        layout
        initial={{ scale: 0, y: -100, rotate: -180 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        exit={{ scale: 0, y: 100, opacity: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 260, 
          damping: 20,
          rotate: { type: 'spring', stiffness: 100 }
        }}
        whileHover={{ y: -10, transition: { duration: 0.2 } }}
        className="relative w-20 h-28 sm:w-24 sm:h-36 md:w-28 md:h-40 [perspective:1000px]"
      >
        <motion.div
          className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]"
          animate={{ rotateY: hidden ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* Front of card */}
          <div
            className={`absolute inset-0 [backface-visibility:hidden] ${
              theme === 'neon' 
                ? 'bg-gradient-to-br from-white to-gray-100' 
                : 'bg-white'
            } rounded-xl shadow-2xl flex flex-col justify-between p-2 sm:p-3 font-bold ${color} border border-gray-200`}
          >
            <div className="text-sm sm:text-base">{rank}{suit}</div>
            <div className="text-4xl sm:text-5xl md:text-6xl text-center">{suit}</div>
            <div className="text-sm sm:text-base rotate-180 self-end">{rank}{suit}</div>
          </div>
          
          {/* Back of card */}
          <div
            className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl shadow-2xl ${
              theme === 'neon'
                ? 'bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600'
                : theme === 'classic'
                ? 'bg-gradient-to-br from-red-800 to-red-900'
                : 'bg-gradient-to-br from-gray-800 to-gray-900'
            }`}
          >
            <div className="w-full h-full rounded-xl border-2 border-white/20 flex items-center justify-center">
              <div className="text-white/20 text-6xl">♠</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }
);

/* ── 8 · sound system ──────────────────────────────────────────────────────── */
class SoundSystem {
  private sounds: Record<string, HTMLAudioElement> = {};
  private initialized = false;

  constructor() {
    const soundUrls = {
      hit: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
      stand: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
      double: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
      win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
      lose: 'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3',
      deal: 'https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3'
    };

    Object.entries(soundUrls).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.volume = 0.3;
      this.sounds[key] = audio;
    });
  }

  async init() {
    if (this.initialized) return;
    
    try {
      await Promise.all(
        Object.values(this.sounds).map(audio => {
          audio.volume = 0;
          return audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 0.3;
          });
        })
      );
      this.initialized = true;
    } catch (e) {
      console.warn('Sound init failed:', e);
    }
  }

  play(key: string, muted: boolean) {
    if (!muted && this.sounds[key]) {
      this.sounds[key].currentTime = 0;
      this.sounds[key].play().catch(() => {});
    }
  }
}

const soundSystem = new SoundSystem();

/* ── 9 · gesture hook ─────────────────────────────────────────────────────── */
const useGesture = () => {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady]     = useState(false);
  const [gesture, setGesture] = useState<{ name: string; progress: number } | null>(null);
  const [latency, setLatency] = useState(0);
  const [handDetected, setHandDetected] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recogRef = useRef<MediaPipeRecognizer>();
  const rafRef   = useRef<number>();
  const noHandCount = useRef(0);

  const G = useGame();
  const { hitGesture, standGesture, doubleGesture, holdTime, confidence, autoLearn, muted, leftHand, vibration } = G.settings;

  // Initialize sound system
  useEffect(() => {
    const initOnInteraction = () => {
      soundSystem.init();
      window.removeEventListener('pointerdown', initOnInteraction);
    };
    window.addEventListener('pointerdown', initOnInteraction, { once: true });
  }, []);

  // Suspend on hidden tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && enabled) {
        setEnabled(false);
        toast('Camera paused - tab hidden', { icon: '⏸️' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled]);

  // Camera management
  useEffect(() => {
    if (!enabled) {
      recogRef.current?.close();
      const media = videoRef.current?.srcObject as MediaStream | null;
      media?.getTracks().forEach(t => t.stop());
      setReady(false);
      setGesture(null);
      setHandDetected(true);
      return;
    }

    let live = true;
    (async () => {
      try {
        const recog = new MediaPipeRecognizer();
        await recog.init(videoRef.current!);
        if (!live) return recog.close();
        recogRef.current = recog;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });
        
        if (!live) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        
        videoRef.current!.srcObject = stream;
        videoRef.current!.onloadedmetadata = () => setReady(true);
      } catch (e) {
        toast.error('Camera initialization failed', {
          icon: '📷',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          }
        });
        console.error(e);
        setEnabled(false);
      }
    })();

    return () => { live = false; };
  }, [enabled]);

  // Recognition loop
  useEffect(() => {
    if (!ready || !recogRef.current) return;

    let last: string | null = null;
    let start = 0;

    const loop = (ts: number) => {
      const t0 = performance.now();
      const g = recogRef.current!.recognise(ts);
      const latencyMs = performance.now() - t0;
      setLatency(Math.round(latencyMs));

      if (g && g.score >= confidence) {
        noHandCount.current = 0;
        setHandDetected(true);
        
        let cat = g.categoryName;
        if (leftHand && cat === 'Thumb_Down') cat = 'Thumb_Up';
        else if (leftHand && cat === 'Thumb_Up') cat = 'Thumb_Down';

        if (cat !== last) {
          last = cat;
          start = Date.now();
          if (vibration) vibrate(30);
        }
        
        const progress = Math.min((Date.now() - start) / holdTime, 1);
        setGesture({ name: cat, progress });

        if (progress === 1) {
          let actionTaken = false;
          
          if (G.phase === 'playing') {
            if (cat === hitGesture) {
              G.hit();
              soundSystem.play('hit', muted);
              actionTaken = true;
            } else if (cat === standGesture) {
              G.stand();
              soundSystem.play('stand', muted);
              actionTaken = true;
            } else if (cat === doubleGesture) {
              G.double();
              soundSystem.play('double', muted);
              actionTaken = true;
            }
          }
          
          if (actionTaken) {
            G.pushLog({ 
              t: new Date().toLocaleTimeString(), 
              g: cat, 
              score: +g.score.toFixed(2) 
            });

            if (vibration) vibrate([50, 30, 50]);

            if (autoLearn && g.score < 0.9) {
              const newC = Math.max(0.5, Math.min(0.9, g.score * 0.85));
              G.updateSettings({ confidence: +newC.toFixed(2) });
            }
          }
          
          last = null;
          setGesture(null);
        }
      } else {
        setGesture(null);
        
        if (++noHandCount.current === 120) {
          setHandDetected(false);
          noHandCount.current = 0;
        }
      }
      
      rafRef.current = requestAnimationFrame(loop);
    };
    
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [
    ready, confidence, holdTime, hitGesture, standGesture, 
    doubleGesture, leftHand, muted, autoLearn, vibration, G
  ]);

  return { enabled, setEnabled, ready, videoRef, gesture, latency, handDetected };
};

/* ── 10 · Main App ─────────────────────────────────────────────────────────── */
const App: React.FC = () => {
  const G = useGame();
  const { enabled, setEnabled, ready, videoRef, gesture, latency, handDetected } = useGesture();

  const [showSettings, setShowSettings] = useState(false);
  const [showCalibrate, setShowCalibrate] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const theme = THEMES[G.settings.theme];
  const mirror = G.settings.leftHand ? '' : '-scale-x-100';
  const pVal = calc(G.playerHand);
  const dVal = calc(G.dealerHand);
  const gameOver = G.phase === 'ended' && G.balance < CONFIG.minBet;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (G.phase !== 'playing') return;
      const k = e.key.toLowerCase();
      if (k === 'h') G.hit();
      if (k === 's') G.stand();
      if (k === 'd') G.double();
      if (k === 'g') setEnabled(!enabled);
    };
    
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [G, enabled, setEnabled]);

  // Close calibration when gesture control is disabled
  useEffect(() => {
    if (showCalibrate) setEnabled(false);
  }, [showCalibrate, setEnabled]);

  // Deal sound effect
  useEffect(() => {
    if (G.phase === 'dealing') {
      soundSystem.play('deal', G.settings.muted);
    }
  }, [G.phase, G.settings.muted]);

  // Win/lose sound effects
  useEffect(() => {
    if (G.phase === 'ended') {
      soundSystem.play(G.lastWin ? 'win' : 'lose', G.settings.muted);
    }
  }, [G.phase, G.lastWin, G.settings.muted]);

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} overflow-hidden`}>
      <Toaster 
        position="bottom-center"
        toastOptions={{
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          }
        }}
      />
      
      <AnimatePresence>
        {showCalibrate && <Calibrate onClose={() => setShowCalibrate(false)} />}
      </AnimatePresence>

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 min-h-screen p-4 flex flex-col">
        {/* Header */}
        <header className="text-center mb-6">
          <motion.h1 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-6xl font-black mb-2 bg-gradient-to-r from-pink-400 to-blue-400 bg-clip-text text-transparent"
          >
            Blackjack
          </motion.h1>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="flex items-center justify-center gap-4 text-xl"
          >
            <span className="opacity-80">Balance:</span>
            <span className={`font-bold text-2xl ${G.balance > CONFIG.startingBalance ? 'text-green-400' : 'text-white'}`}>
              ${G.balance}
            </span>
            {G.winStreak > 0 && (
              <span className="text-yellow-400 animate-pulse">
                🔥 {G.winStreak}
              </span>
            )}
          </motion.div>
        </header>

        <main className="flex-grow grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
          {/* Game Table */}
          <div className={`lg:col-span-2 ${theme.table} rounded-2xl p-6 shadow-2xl backdrop-blur-xl`}>
            {/* Dealer Section */}
            <div className="mb-8">
              <h2 className="text-center text-xl font-semibold mb-4 opacity-80">
                Dealer {G.dealerHand.length > 0 && (
                  <span className="text-2xl">
                    ({G.showDealer ? dVal : calc([G.dealerHand[1]])})
                  </span>
                )}
              </h2>
              <div className="flex flex-wrap justify-center gap-3 min-h-[150px] items-center">
                <AnimatePresence>
                  {G.dealerHand.map((c, i) => (
                    <CardComponent key={c.id} {...c} hidden={!G.showDealer && i === 0} />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Status Message */}
            <div className="text-center my-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={G.msg}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className="text-2xl font-bold"
                >
                  {G.msg}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Player Section */}
            <div className="mb-8">
              <h2 className="text-center text-xl font-semibold mb-4 opacity-80">
                You {G.playerHand.length > 0 && (
                  <span className={`text-2xl ${pVal === 21 ? 'text-green-400' : pVal > 21 ? 'text-red-400' : ''}`}>
                    ({pVal})
                  </span>
                )}
              </h2>
              <div className="flex flex-wrap justify-center gap-3 min-h-[150px] items-center">
                <AnimatePresence>
                  {G.playerHand.map(c => (
                    <CardComponent key={c.id} {...c} />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Game Controls */}
            <div className="flex justify-center gap-4 flex-wrap">
              <AnimatePresence mode="wait">
                {G.phase === 'betting' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex gap-4 items-center flex-wrap justify-center"
                  >
                    <div className="flex items-center gap-2 bg-black/20 rounded-lg px-4 py-2">
                      <span className="font-semibold">Bet:</span>
                      <input
                        type="number"
                        className="bg-white/10 rounded px-3 py-1 w-24 text-center font-bold"
                        value={G.bet}
                        onChange={e => G.setBet(+e.target.value)}
                        min={CONFIG.minBet}
                        max={G.balance}
                        step={10}
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={G.deal}
                      disabled={G.bet > G.balance || G.bet < CONFIG.minBet}
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Deal Cards
                    </motion.button>
                  </motion.div>
                )}

                {G.phase === 'playing' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex gap-3 flex-wrap justify-center"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={G.hit}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg font-bold text-white shadow-lg"
                    >
                      Hit (H)
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={G.stand}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 rounded-lg font-bold text-white shadow-lg"
                    >
                      Stand (S)
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={G.double}
                      disabled={G.playerHand.length !== 2 || G.balance < G.bet}
                      className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg font-bold text-black shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Double (D)
                    </motion.button>
                  </motion.div>
                )}

                {G.phase === 'ended' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={gameOver ? G.reset : G.next}
                      className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-bold text-white shadow-lg"
                    >
                      {gameOver ? '🎮 New Game' : 'Next Round →'}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Gesture Control Panel */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-gray-700">
            {/* Panel Header */}
            <div className="p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">Gesture Control</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors"
                    title="Stats"
                  >
                    📊
                  </button>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors"
                    title="Settings"
                  >
                    ⚙️
                  </button>
                  <button
                    onClick={() => setShowCalibrate(true)}
                    className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors"
                    title="Calibrate"
                  >
                    🎯
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setEnabled(!enabled)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      enabled 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                        : 'bg-gray-700/50 text-gray-300'
                    }`}
                  >
                    {enabled ? 'ON' : 'OFF'}
                  </motion.button>
                </div>
              </div>
              
              {/* Status Bar */}
              <div className="flex items-center gap-4 text-sm opacity-80">
                <span className={`flex items-center gap-1 ${latency < 50 ? 'text-green-400' : latency < 100 ? 'text-yellow-400' : 'text-red-400'}`}>
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  {latency}ms
                </span>
                {enabled && !handDetected && (
                  <span className="text-yellow-400 animate-pulse">
                    No hand detected
                  </span>
                )}
              </div>
            </div>

            {/* Camera View */}
            <div className="aspect-video bg-black relative">
              {enabled ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${mirror}`}
                  />
                  
                  {/* Gesture Overlay */}
                  <AnimatePresence>
                    {gesture && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4"
                      >
                        <div className="text-center mb-2">
                          <span className="text-2xl font-bold">
                            {gesture.name.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-pink-500 to-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${gesture.progress * 100}%` }}
                            transition={{ duration: 0.1, ease: 'linear' }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!ready && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent mx-auto mb-4" />
                        <p>Initializing AI...</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-400 p-8">
                    <p className="text-6xl mb-4">👋</p>
                    <p className="text-lg">Enable gesture control</p>
                    <p className="text-sm opacity-60 mt-2">Press G to toggle</p>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Drawer */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-700"
                >
                  <div className="p-4 space-y-4">
                    {/* Gesture Mappings */}
                    {(['hitGesture', 'standGesture', 'doubleGesture'] as const).map(k => (
                      <div key={k} className="flex items-center gap-3">
                        <label className="font-semibold capitalize w-20">
                          {k.replace('Gesture', '')}
                        </label>
                        <select
                          value={G.settings[k]}
                          onChange={e => G.updateSettings({ [k]: e.target.value })}
                          className="flex-1 bg-gray-700/50 rounded-lg px-3 py-2"
                        >
                          {GESTURE_OPTIONS.map(o => (
                            <option key={o} value={o}>
                              {o.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}

                    {/* Hold Time */}
                    <div className="flex items-center gap-3">
                      <label className="font-semibold w-20">Hold</label>
                      <input
                        type="range"
                        min={300}
                        max={1500}
                        step={100}
                        value={G.settings.holdTime}
                        onChange={e => G.updateSettings({ holdTime: +e.target.value })}
                        className="flex-1"
                      />
                      <span className="text-sm w-16 text-right">{G.settings.holdTime}ms</span>
                    </div>

                    {/* Confidence */}
                    <div className="flex items-center gap-3">
                      <label className="font-semibold w-20">Conf.</label>
                      <input
                        type="range"
                        min={0.5}
                        max={0.95}
                        step={0.05}
                        value={G.settings.confidence}
                        onChange={e => G.updateSettings({ confidence: +e.target.value })}
                        className="flex-1"
                      />
                      <span className="text-sm w-16 text-right">{(G.settings.confidence * 100).toFixed(0)}%</span>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-2">
                      {[
                        { key: 'autoLearn', label: 'Auto-adjust confidence' },
                        { key: 'leftHand', label: 'Left-handed mode' },
                        { key: 'muted', label: 'Mute sounds' },
                        { key: 'vibration', label: 'Vibration feedback' }
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={G.settings[key as keyof Settings] as boolean}
                            onChange={e => G.updateSettings({ [key]: e.target.checked })}
                            className="w-4 h-4 rounded"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>

                    {/* Theme */}
                    <div className="flex items-center gap-3">
                      <label className="font-semibold w-20">Theme</label>
                      <select
                        value={G.settings.theme}
                        onChange={e => G.updateSettings({ theme: e.target.value as 'dark' | 'neon' | 'classic' })}
                        className="flex-1 bg-gray-700/50 rounded-lg px-3 py-2"
                      >
                        <option value="dark">Dark</option>
                        <option value="neon">Neon</option>
                        <option value="classic">Classic</option>
                      </select>
                    </div>

                    <button
                      onClick={G.resetSettings}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Reset all settings
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats Drawer */}
            <AnimatePresence>
              {showStats && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-700"
                >
                  <div className="p-4 max-h-64 overflow-y-auto">
                    <h4 className="font-bold mb-2">Recent Gestures</h4>
                    <div className="space-y-1 text-sm">
                      {G.logs.length === 0 ? (
                        <p className="text-gray-500">No gestures recorded yet</p>
                      ) : (
                        G.logs.slice(0, 10).map((log, i) => (
                          <div key={i} className="flex justify-between text-gray-300">
                            <span>{log.t}</span>
                            <span>{log.g.replace(/_/g, ' ')}</span>
                            <span className="text-green-400">{(log.score * 100).toFixed(0)}%</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Legend */}
            {!showSettings && !showStats && (
              <div className="p-4 text-center space-y-1 text-sm opacity-60">
                <p>✋ {G.settings.hitGesture.replace(/_/g, ' ')} = Hit</p>
                <p>✊ {G.settings.standGesture.replace(/_/g, ' ')} = Stand</p>
                <p>👎 {G.settings.doubleGesture.replace(/_/g, ' ')} = Double</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

/* ── 11 · Bootstrap ────────────────────────────────────────────────────────── */
const container = document.getElementById('root')!;
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

/* ── 12 · CSS Animations ──────────────────────────────────────────────────── */
const style = document.createElement('style');
style.textContent = `
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  
  .animate-blob {
    animation: blob 7s infinite;
  }
  
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  
  .animation-delay-4000 {
    animation-delay: 4s;
  }
`;
document.head.appendChild(style);