/* ── 0 · external deps ─────────────────────────────────────────────────────── */
import React, {
  useState, useEffect, useRef, useCallback, RefObject
} from 'react';
import { createRoot }             from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { create }                 from 'zustand';
import toast, { Toaster }         from 'react-hot-toast';

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
/** All classes MediaPipe returns */
const GESTURE_OPTIONS = [
  'Open_Palm',  'Closed_Fist', 'Thumb_Up',   'Thumb_Down',
  'Victory',    'ILoveYou',    'Pointing_Up','OK_Sign',
  'Call_Me',    'Live_Long',   'Rock_On'
] as const;

const DEFAULT_SETTINGS: Settings = {
  hitGesture   : 'Open_Palm',
  standGesture : 'Closed_Fist',
  doubleGesture: 'Thumb_Down',
  holdTime     : 800,
  confidence   : 0.7,
  autoLearn    : true,
  muted        : false,
  leftHand     : false
};

const CONFIG = {
  startingBalance: 1_000,
  minBet         : 10,
  defaultBet     : 50,
  blackjackPayout: 1.5,
  dealerStandsOn : 17
};

/* ── 3 · MediaPipe wrapper ─────────────────────────────────────────────────── */
interface RawGesture { categoryName: string; score: number; }

class MediaPipeRecognizer {
  private recog: any;
  private video?: HTMLVideoElement;

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
      minHandDetectionConfidence : 0.6
    });

    this.video = video;
  }

  recognise(ts: number): RawGesture | null {
    if (!this.recog) return null;
    const r = this.recog.recognizeForVideo(this.video!, ts);
    return r.gestures?.[0]?.[0] ?? null;
  }

  async close() {
    await this.recog?.close();
    // Explicitly clear reference for GC
    this.recog = null;
  }
}
const recognizerFactory = () => new MediaPipeRecognizer();

/* ── 4 · helpers ───────────────────────────────────────────────────────────── */
const createDeck = (): Card[] =>
  (['♠','♥','♦','♣'] as Suit[])
    .flatMap(s =>
      (['A','K','Q','J','10','9','8','7','6','5','4','3','2'] as Rank[])
        .map(r => ({ suit:s, rank:r, id:`${r}-${s}-${crypto.randomUUID()}` }))
    )
    .sort(() => Math.random() - 0.5);

/** guard undefined placeholders (face-down dealer card) */
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

  /** Update settings with duplicate‑gesture guard */
  updateSettings: u => set(state => {
    const ns = { ...state.settings };

    const gestureKeys = ['hitGesture','standGesture','doubleGesture'] as const;
    for (const k of gestureKeys) {
      if (u[k] && u[k] !== ns[k]) {
        if (gestureKeys.some(other => other !== k && ns[other] === u[k])) {
          toast.error('That gesture is already in use');
          return {};                                    // no update
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
  pushLog: l => set(st => ({ logs: [l, ...st.logs.slice(0, 19)] })),

  /* blackjack state */
  balance: CONFIG.startingBalance,
  bet    : CONFIG.defaultBet,
  deck   : [],
  playerHand: [],
  dealerHand: [],
  phase  : 'betting',
  showDealer: false,
  msg    : 'Place your bet to start!',

  setBet: v => set(() => ({
    bet: Math.min(Math.max(CONFIG.minBet, v || 0), get().balance)
  })),

  deal: () => {
    const { bet, balance } = get();
    if (bet > balance || bet < CONFIG.minBet) return;

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
      msg: 'Dealing…'
    });

    /* sequential dealing animation */
    const later = (fn: () => void, t: number) => setTimeout(fn, t);
    later(() => set({ playerHand: [player[0]] }), 200);
    later(() => set({ dealerHand: [dealer[0]] }), 600);
    later(() => set({ playerHand: player }), 1000);
    later(() => set({ dealerHand: dealer }), 1400);
    later(() => get().checkBJ(player, dealer), 2000);
  },

  checkBJ: (p, d) => {
    const pv = calc(p);
    const dv = calc(d);

    if (pv === 21 || dv === 21) {
      set({ showDealer: true });

      if (pv === 21 && dv === 21) {
        get().end('Push! Both Blackjack.', get().bet);
      } else if (pv === 21) {
        get().end(`Blackjack! You win $${get().bet * CONFIG.blackjackPayout}!`,
                  get().bet * (1 + CONFIG.blackjackPayout));
      } else {
        get().end('Dealer has Blackjack. You lose.', 0);
      }
    } else {
      set({ phase: 'playing', msg: 'Your turn. Hit, Stand, or Double?' });
    }
  },

  hit: () => {
    if (get().phase !== 'playing') return;

    const deck = [...get().deck];
    const hand = [...get().playerHand, deck.pop()!];

    set({ deck, playerHand: hand });

    const val = calc(hand);
    if (val === 21) {
      set({ msg: '21! Standing…' });
      setTimeout(() => get().stand(), 400);
    } else if (val > 21) {
      setTimeout(() => get().end('You bust! Dealer wins.', 0), 400);
    }
  },

  stand: () => {
    if (get().phase !== 'playing') return;

    set({ phase: 'dealer', showDealer: true, msg: "Dealer's turn…" });
    setTimeout(() => get().dealerPlay(), 800);
  },

  double: () => {
    const { phase, bet, balance, playerHand } = get();
    if (phase !== 'playing') return;

    if (playerHand.length !== 2) {
      return toast.error('Double Down allowed only on first move');
    }

    if (balance < bet) {
      return toast.error('Insufficient funds to double');
    }

    const deck = [...get().deck];
    const hand = [...playerHand, deck.pop()!];
    set({ deck, playerHand: hand, balance: balance - bet, bet: bet * 2 });
    setTimeout(() => get().stand(), 400);
  },

  dealerPlay: () => {
    const { deck, dealerHand } = get();

    if (calc(dealerHand) >= CONFIG.dealerStandsOn) {
      return get().end();
    }

    dealerHand.push(deck.pop()!);
    set({ deck: [...deck], dealerHand: [...dealerHand] });
    setTimeout(() => get().dealerPlay(), 650);
  },

  end: (msg = '', win = null) => {
    const { playerHand, dealerHand, bet, balance } = get();

    if (win === null) {
      const pv = calc(playerHand);
      const dv = calc(dealerHand);

      if (pv > 21)             msg = 'You bust! Dealer wins.';
      else if (dv > 21) {      msg = 'Dealer busts! You win!';    win = bet * 2; }
      else if (pv > dv)  {     msg = 'You win!';                   win = bet * 2; }
      else if (pv < dv)        msg = 'Dealer wins.';
      else              {      msg = 'Push!';                      win = bet; }
    }

    set({ balance: balance + (win ?? 0), phase: 'ended', msg, showDealer: true });
  },

  next: () => {
    const bal = get().balance;
    if (bal < CONFIG.minBet) {
      return set({ phase: 'ended', msg: 'Game over — insufficient funds.' });
    }

    set({
      deck: [],
      playerHand: [],
      dealerHand: [],
      phase: 'betting',
      msg: 'Place your bet.',
      bet: Math.min(get().bet, bal)
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
    msg: 'Place your bet to start!'
  })
}));

/* ── 6 · calibration wizard ───────────────────────────────────────────────── */
const Ring: React.FC<{ progress: number }> = ({ progress }) => (
  <svg viewBox="0 0 120 120" className="w-24 h-24">
    <circle
      cx="60"
      cy="60"
      r="54"
      stroke="#4b5563"
      strokeWidth="12"
      fill="none"
    />
    <motion.circle
      cx="60"
      cy="60"
      r="54"
      stroke="#3b82f6"
      strokeWidth="12"
      fill="none"
      strokeLinecap="round"
      animate={{ pathLength: progress }}
      transition={{ duration: 0.1 }}
    />
  </svg>
);

const Calibrate: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const steps = [
    { label: 'Hit',    key: 'hitGesture'    as const },
    { label: 'Stand',  key: 'standGesture'  as const },
    { label: 'Double', key: 'doubleGesture' as const }
  ];

  const videoRef = useRef<HTMLVideoElement>(null);
  const recogRef = useRef<MediaPipeRecognizer>();
  const rafRef   = useRef<number>();
  const startMs  = useRef<number>(0);

  const [ready, setReady] = useState(false);
  const [det, setDet]     = useState<RawGesture | null>(null);
  const [prog, setProg]   = useState(0);
  const [idx, setIdx]     = useState(0);

  const { settings, updateSettings } = useGame();

  /* boot camera & AI */
  useEffect(() => {
    let live = true;

    (async () => {
      try {
        const r = new MediaPipeRecognizer();
        await r.init(videoRef.current!);
        if (!live) return r.close();
        recogRef.current = r;

        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (!live) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        videoRef.current!.srcObject = stream;
        videoRef.current!.onloadedmetadata = () => setReady(true);
      } catch (e) {
        toast.error('Calibration camera error');
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

  /* detect loop */
  useEffect(() => {
    if (!ready || !recogRef.current) return;

    const loop = (ts: number) => {
      if (idx >= steps.length) {
        onClose();
        return;
      }

      const g = recogRef.current!.recognise(ts);

      /* skip if already perfect */
      if (g && g.categoryName === settings[steps[idx].key] && g.score >= 0.9) {
        toast.success(`${steps[idx].label} already set ✔`);
        setIdx(i => i + 1);
        return (rafRef.current = requestAnimationFrame(loop));
      }

      if (g && g.score >= 0.75) {
        if (!det || det.categoryName !== g.categoryName) startMs.current = performance.now();
        setDet(g);
        const p = Math.min((performance.now() - startMs.current) / 1000, 1);
        setProg(p);

        if (p === 1) {
          const tgt = steps[idx].key;
          if (Object.values(settings).includes(g.categoryName) && settings[tgt] !== g.categoryName) {
            toast.error('Gesture already mapped elsewhere.');
          } else {
            updateSettings({ [tgt]: g.categoryName });
            toast.success(`${steps[idx].label} → “${g.categoryName.replace(/_/g, ' ')}”`);
            if (idx < steps.length - 1) setIdx(i => i + 1);
            else {
              toast.success('Calibration complete!');
              onClose();
            }
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

  const current = steps[idx]?.label ?? 'Done';

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-800 w-full max-w-md rounded-xl shadow-xl overflow-hidden">
        <div className="bg-gray-900 px-4 py-3 flex justify-between items-center">
          <h2 className="font-bold">Calibration — {current}</h2>
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="aspect-video bg-black relative flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Starting camera…
            </div>
          )}
          {det && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Ring progress={prog} />
            </div>
          )}
        </div>

        <div className="p-4 text-center space-y-3">
          <p>
            Hold the <span className="font-semibold">{current}</span> gesture until the ring completes.
          </p>
          <p className="text-xs text-gray-400">
            Ensure good lighting and keep your hand centred.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ── 7 · card component ───────────────────────────────────────────────────── */
const Card: React.FC<{ rank: Rank; suit: Suit; hidden?: boolean }> = ({ rank, suit, hidden }) => {
  const color = ['♥', '♦'].includes(suit) ? 'text-red-600' : 'text-black';

  return (
    <motion.div
      layout
      initial={{ scale: 0.5, y: -80, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.5, y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="relative w-24 h-36 md:w-28 md:h-40 [perspective:1000px]"
    >
      <div
        className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]"
        style={{ transform: hidden ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        <div
          className={`absolute inset-0 [backface-visibility:hidden] bg-white rounded-lg border-2 shadow-xl flex flex-col justify-between p-2 font-bold ${color}`}
        >
          <div>
            {rank} {suit}
          </div>
          <div className="text-5xl md:text-6xl text-center">{suit}</div>
          <div className="rotate-180 self-end">
            {rank} {suit}
          </div>
        </div>
        <div
          className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-900"
        />
      </div>
    </motion.div>
  );
};

/* ── 8 · sound / brightness helpers ───────────────────────────────────────── */
const sounds = {
  hit:    new Audio('https://assets.mixkit.co/sfx/download/mixkit-arcade-game-jump-coin-216.wav'),
  stand:  new Audio('https://assets.mixkit.co/sfx/download/mixkit-positive-interface-beep-221.wav'),
  double: new Audio('https://assets.mixkit.co/sfx/download/mixkit-unlock-game-notification-253.wav')
};

Object.values(sounds).forEach(a => (a.crossOrigin = 'anonymous'));

/** unlock Web‑Audio on first user gesture (autoplay policy) */
const useAudioUnlock = () => {
  useEffect(() => {
    const unlock = () => {
      Object.values(sounds).forEach(a => {
        a.volume = 0;
        a.play()
          .then(() => {
            a.pause();
            a.currentTime = 0;
            a.volume = 1;
          })
          .catch(() => {/* ignore */});
      });
      window.removeEventListener('pointerdown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  }, []);
};

const play = (k: keyof typeof sounds, muted: boolean) => {
  if (!muted) {
    sounds[k].play().catch(() => {/* ignore */});
  }
};

const useBrightness = (videoRef: RefObject<HTMLVideoElement>) => {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    let timer: number;

    const check = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return schedule();
      canvas.width = 160;
      canvas.height = 90;
      ctx.drawImage(videoRef.current, 0, 0, 160, 90);
      const { data } = ctx.getImageData(0, 0, 160, 90);
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) sum += data[i];
      const avg = sum / (data.length / 4);
      if (avg < 40 || avg > 220) {
        toast('Lighting may be poor ⚠', { id: 'light', icon: '💡' });
      } else {
        toast.dismiss('light');
      }
      schedule();
    };

    const schedule = () => {
      timer = window.setTimeout(check, 4_000);
    };

    schedule();
    return () => clearTimeout(timer);
  }, [videoRef]);
};

/* ── 9 · gesture hook ─────────────────────────────────────────────────────── */
const useGesture = () => {
  const [enabled, setEnabled] = useState(false);
  const [ready,   setReady]   = useState(false);
  const [gesture, setGesture] = useState<{ name: string; progress: number } | null>(null);
  const [latency, setLatency] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recogRef = useRef<MediaPipeRecognizer>();
  const rafRef   = useRef<number>();

  const G = useGame();
  const { hitGesture, standGesture, doubleGesture, holdTime, confidence, autoLearn, muted, leftHand } = G.settings;

  /* suspend on hidden tab */
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) setEnabled(false);
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);

  /* boot / teardown camera */
  useEffect(() => {
    if (!enabled) {
      recogRef.current?.close();
      const media = videoRef.current?.srcObject as MediaStream | null;
      media?.getTracks().forEach(t => t.stop());
      setReady(false);
      setGesture(null);
      return;
    }

    let live = true;
    (async () => {
      try {
        const recog = recognizerFactory();
        await recog.init(videoRef.current!);
        if (!live) return recog.close();
        recogRef.current = recog;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        if (!live) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        videoRef.current!.srcObject = stream;
        videoRef.current!.onloadedmetadata = () => setReady(true);
      } catch (e) {
        toast.error('Camera / AI initialisation failed');
        console.error(e);
        setEnabled(false);
      }
    })();

    return () => {
      live = false;
    };
  }, [enabled]);

  useBrightness(videoRef);

  /* recognise loop */
  useEffect(() => {
    if (!ready || !recogRef.current) return;

    let last: string | null = null;
    let start = 0;
    let quiet = 0;

    const loop = (ts: number) => {
      const t0 = performance.now();
      const g = recogRef.current!.recognise(ts);
      setLatency(performance.now() - t0);

      if (g && g.score >= confidence) {
        let cat = g.categoryName;
        if (leftHand && cat === 'Thumb_Down') cat = 'Thumb_Up';

        if (cat !== last) {
          last = cat;
          start = Date.now();
          quiet = 0;
        }
        const progress = Math.min((Date.now() - start) / holdTime, 1);
        setGesture({ name: cat, progress });

        if (progress === 1) {
          if (G.phase === 'playing') {
            if (cat === hitGesture)      { G.hit();    play('hit',    muted); }
            else if (cat === standGesture)  { G.stand();  play('stand',  muted); }
            else if (cat === doubleGesture) { G.double(); play('double', muted); }
          }
          G.pushLog({ t: new Date().toLocaleTimeString(), g: cat, score: +g.score.toFixed(2) });

          if (autoLearn) {
            const newC = Math.max(0.3, Math.min(0.95, g.score * 0.8));
            G.updateSettings({ confidence: +newC.toFixed(2) });
          }
          last = null;
          setGesture(null);
        }
      } else {
        setGesture(null);
        if (++quiet === 180) {
          toast('No hand detected', { id: 'nohand', icon: '🖐️' });
          quiet = 0;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [
    ready,
    confidence,
    holdTime,
    hitGesture,
    standGesture,
    doubleGesture,
    leftHand,
    muted,
    autoLearn,
    G
  ]);

  return { enabled, setEnabled, ready, videoRef, gesture, latency };
};

/* ── 10 · App ─────────────────────────────────────────────────────────────── */
const App: React.FC = () => {
  const G = useGame();
  const { enabled, setEnabled, ready, videoRef, gesture, latency } = useGesture();

  const [drawer, setDrawer] = useState(false);
  const [cal,    setCal]    = useState(false);

  useAudioUnlock();   /* unlock Web‑Audio once */

  /* keyboard shortcuts */
  const onKey = useCallback((e: KeyboardEvent) => {
    if (G.phase !== 'playing') return;
    const k = e.key.toLowerCase();
    if (k === 'h') G.hit();
    if (k === 's') G.stand();
    if (k === 'd') G.double();
  }, [G]);

  useEffect(() => {
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onKey]);

  useEffect(() => {
    if (cal) setEnabled(false);
  }, [cal, setEnabled]);

  const mirror   = G.settings.leftHand ? '' : '-scale-x-100';
  const pVal     = calc(G.playerHand);
  const dVal     = calc(G.dealerHand);
  const gameOver = G.phase === 'ended' && G.balance < CONFIG.minBet;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col">
      <Toaster position="bottom-center" />
      {cal && <Calibrate onClose={() => setCal(false)} />}

      {/* header */}
      <header className="text-center mb-4">
        <h1 className="text-4xl font-extrabold">Blackjack</h1>
        <p className="text-xl">
          Balance:&nbsp;
          <span className="font-semibold text-green-400">${G.balance}</span>
        </p>
      </header>

      <main className="flex-grow grid md:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        {/* ── table ── */}
        <div className="md:col-span-2 bg-green-800 bg-[radial-gradient(#064e3b_1.5px,transparent_1.5px)] [background-size:20px_20px] rounded-xl p-4 shadow-2xl flex flex-col">
          {/* dealer */}
          <div className="flex-1">
            <h2 className="text-center opacity-80">
              Dealer {G.dealerHand.length > 0 && `(${G.showDealer ? dVal : calc([G.dealerHand[1]])})`}
            </h2>
            <div className="flex flex-wrap justify-center gap-3 min-h-[180px] items-center">
              <AnimatePresence>
                {G.dealerHand.map((c, i) => (
                  <Card key={c.id} {...c} hidden={!G.showDealer && i === 0} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* status */}
          <div
            aria-live="polite"
            className="text-center font-bold text-xl my-4 min-h-[60px] flex items-center justify-center"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={G.msg}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {G.msg}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* player */}
          <div className="flex-1">
            <h2 className="text-center opacity-80">
              Player {G.playerHand.length > 0 && `(${pVal})`}
            </h2>
            <div className="flex flex-wrap justify-center gap-3 min-h-[180px] items-center">
              <AnimatePresence>
                {G.playerHand.map(c => (
                  <Card key={c.id} {...c} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* controls */}
          <div className="flex justify-center gap-4 flex-wrap mt-4 min-h-[52px]">
            {G.phase === 'betting' && (
              <>
                <label className="flex gap-2 items-center font-semibold">
                  Bet
                  <input
                    type="number"
                    className="bg-gray-700 rounded w-24 px-2 text-right"
                    value={G.bet}
                    onChange={e => G.setBet(+e.target.value)}
                    min={CONFIG.minBet}
                    max={G.balance}
                    step={10}
                  />
                </label>
                <button
                  onClick={G.deal}
                  disabled={G.bet > G.balance || G.bet < CONFIG.minBet}
                  className="px-6 py-2 bg-blue-600 rounded-lg font-bold disabled:opacity-50"
                >
                  Deal
                </button>
              </>
            )}
            {G.phase === 'playing' && (
              <>
                <button
                  onClick={G.hit}
                  className="px-6 py-2 bg-green-600 rounded-lg font-bold"
                >
                  Hit (H)
                </button>
                <button
                  onClick={G.stand}
                  className="px-6 py-2 bg-red-600 rounded-lg font-bold"
                >
                  Stand (S)
                </button>
                <button
                  onClick={G.double}
                  disabled={G.playerHand.length !== 2}
                  className="px-6 py-2 bg-yellow-500 text-black rounded-lg font-bold disabled:opacity-40"
                >
                  Double (D)
                </button>
              </>
            )}
            {G.phase === 'ended' && (
              <button
                onClick={gameOver ? G.reset : G.next}
                className="px-6 py-2 bg-yellow-500 text-black rounded-lg font-bold"
              >
                {gameOver ? 'New Game' : 'Next Round'}
              </button>
            )}
          </div>
        </div>

        {/* ── gesture panel ── */}
        <div className="bg-gray-800 rounded-xl flex flex-col overflow-hidden">
          {/* panel header */}
          <div className="p-4 bg-gray-900 flex justify-between items-center">
            <h3 className="font-bold">Gesture Control</h3>
            <div className="flex gap-2 text-xs items-center">
              <span>{latency.toFixed(0)} ms</span>
              <button onClick={() => setDrawer(!drawer)} className="bg-gray-700 px-2 py-1 rounded">
                {drawer ? 'Close' : 'Settings'}
              </button>
              <button onClick={() => setCal(true)} className="bg-gray-700 px-2 py-1 rounded">
                Calibrate
              </button>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`${enabled ? 'bg-green-600' : 'bg-gray-600'} px-4 py-1 rounded`}
              >
                {enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* live camera */}
          <div className="aspect-video bg-black relative flex items-center justify-center">
            {enabled ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${mirror}`}
                />
                {gesture && (
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 p-3 backdrop-blur-sm">
                    <div className="text-center mb-1 font-bold">
                      {gesture.name.replace(/_/g, ' ')}
                    </div>
                    <div className="h-2 w-full bg-gray-600 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-500"
                        animate={{ width: `${gesture.progress * 100}%` }}
                        transition={{ duration: 0.1, ease: 'linear' }}
                      />
                    </div>
                  </div>
                )}
                {!ready && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    Initialising…
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-gray-500 p-6">
                <p className="text-4xl mb-2">👋</p>
                <p>Enable gesture control</p>
              </div>
            )}
          </div>

          {/* drawer */}
          {drawer && (
            <div className="p-4 bg-gray-900 border-t border-gray-700 text-sm space-y-3 overflow-y-auto">
              {(['hitGesture', 'standGesture', 'doubleGesture'] as const).map(k => {
                const usedBy = (g: string) =>
                  (['hitGesture', 'standGesture', 'doubleGesture'] as const).some(other => other !== k && G.settings[other] === g);

                return (
                  <div key={k} className="flex justify-between gap-4 items-center">
                    <label className="font-semibold capitalize">{k.replace('Gesture', '')}</label>
                    <select
                      value={G.settings[k]}
                      onChange={e => G.updateSettings({ [k]: e.target.value })}
                      className="bg-gray-700 rounded flex-1 px-2 py-1"
                    >
                      {GESTURE_OPTIONS.map(o => (
                        <option key={o} value={o} disabled={usedBy(o)}>
                          {o.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}

              <div className="flex justify-between gap-4 items-center">
                <label className="font-semibold">Hold (ms)</label>
                <input
                  type="number"
                  className="bg-gray-700 w-24 text-right px-1 rounded"
                  min={300}
                  max={2000}
                  step={50}
                  value={G.settings.holdTime}
                  onChange={e => G.updateSettings({ holdTime: +e.target.value })}
                />
              </div>

              <div className="flex justify-between gap-4 items-center">
                <label className="font-semibold">Confidence</label>
                <input
                  type="number"
                  className="bg-gray-700 w-24 text-right px-1 rounded"
                  min={0.3}
                  max={0.95}
                  step={0.05}
                  value={G.settings.confidence}
                  onChange={e => G.updateSettings({ confidence: +e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="auto"
                  type="checkbox"
                  className="accent-blue-600"
                  checked={G.settings.autoLearn}
                  onChange={e => G.updateSettings({ autoLearn: e.target.checked })}
                />
                <label htmlFor="auto">Adaptive confidence</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="mute"
                  type="checkbox"
                  className="accent-blue-600"
                  checked={G.settings.muted}
                  onChange={e => G.updateSettings({ muted: e.target.checked })}
                />
                <label htmlFor="mute">Mute sounds</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="left"
                  type="checkbox"
                  className="accent-blue-600"
                  checked={G.settings.leftHand}
                  onChange={e => G.updateSettings({ leftHand: e.target.checked })}
                />
                <label htmlFor="left">Left-handed</label>
              </div>

              <button
                onClick={G.resetSettings}
                className="text-xs text-red-400 underline"
              >
                Reset all settings
              </button>
            </div>
          )}

          {/* legend */}
          <div className="p-4 text-xs text-center text-gray-400">
            <p>
              <span className="font-semibold">{G.settings.hitGesture.replace(/_/g, ' ')}</span> = Hit
            </p>
            <p>
              <span className="font-semibold">{G.settings.standGesture.replace(/_/g, ' ')}</span> = Stand
            </p>
            <p>
              <span className="font-semibold">{G.settings.doubleGesture.replace(/_/g, ' ')}</span> = Double
            </p>
            <p className="mt-1">Hold gesture or press H/S/D</p>
          </div>
        </div>

        {/* log */}
        <div className="hidden md:block md:col-span-3 bg-gray-900/70 rounded-lg p-2 text-xs overflow-y-auto max-h-40">
          <p className="font-bold mb-1">AI Logs (last 20)</p>
          {G.logs.map((l, i) => (
            <p key={i}>
              {l.t} — {l.g} ({l.score})
            </p>
          ))}
        </div>
      </main>
    </div>
  );
};

/* ── 11 · bootstrap ───────────────────────────────────────────────────────── */
const container = document.getElementById('root')!;
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}