import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { create } from 'zustand';
import toast, { Toaster } from 'react-hot-toast';

/* ═════════════════════════════ 1. GESTURE PLUGIN ═════════════════════ */
class MediaPipeRecognizer {
  async init(video) {
    const { FilesetResolver, GestureRecognizer } = await import(
      '@mediapipe/tasks-vision'
    );
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm'
    );
    this.recog = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.6
    });
    this.video = video;
  }
  recognise(ts) {
    const r = this.recog.recognizeForVideo(this.video, ts);
    return r.gestures?.[0]?.[0] ?? null;
  }
  async close() {
    await this.recog?.close();
    this.recog = null;
  }
}
const defaultRecognizerFactory = () => new MediaPipeRecognizer();

/* ═══════════════════════════ 2. CONSTANTS / CONFIG ══════════════════ */
const GESTURE_OPTIONS = ['Open_Palm', 'Closed_Fist', 'Thumb_Down'];

const DEFAULT_SETTINGS = {
  hitGesture: 'Open_Palm',
  standGesture: 'Closed_Fist',
  doubleGesture: 'Thumb_Down',
  holdTime: 800,
  confidence: 0.7,
  autoLearn: true
};

const CONFIG = {
  startingBalance: 1000,
  minBet: 10,
  defaultBet: 50,
  blackjackPayout: 1.5,
  dealerStandsOn: 17
};

/* ═════════════════════════════ 3. UTILITIES ════════════════════════ */
const createDeck = () =>
  ['♠','♥','♦','♣']
    .flatMap(suit =>
      ['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map(rank => ({
        suit, rank, id: `${rank}-${suit}-${Math.random()}`
      }))
    )
    .sort(() => Math.random() - 0.5);

const calc = hand => {
  let v = 0, aces = 0;
  hand.forEach(c => {
    if (!c) return;
    if (c.rank === 'A') { v += 11; aces++; }
    else if ('KQJ'.includes(c.rank)) v += 10;
    else v += +c.rank;
  });
  while (v > 21 && aces--) v -= 10;
  return v;
};

/* ═════════════════════════════ 4. GLOBAL STORE ══════════════════════ */
const useGame = create((set, get) => ({
  /* persistent settings */
  settings: (() => {
    try { return { ...DEFAULT_SETTINGS,
                   ...JSON.parse(localStorage.getItem('settings') || '{}') };
    } catch { return DEFAULT_SETTINGS; }
  })(),
  updateSettings: u => set(s => {
    const ns = { ...s.settings, ...u };
    localStorage.setItem('settings', JSON.stringify(ns));
    return { settings: ns };
  }),
  resetSettings: () => set(() => {
    localStorage.removeItem('settings');
    return { settings: { ...DEFAULT_SETTINGS } };
  }),

  /* transparency log */
  logs: [],
  pushLog: l => set(st => ({ logs: [l, ...st.logs.slice(0, 19)] })),

  /* blackjack state */
  balance: CONFIG.startingBalance,
  bet: CONFIG.defaultBet,
  deck: [], playerHand: [], dealerHand: [],
  phase: 'betting', showDealer: false,
  msg: 'Place your bet to start!',

  setBet: v => set({ bet: Math.min(Math.max(CONFIG.minBet, v || 0), get().balance) }),

  deal: () => {
    const { bet, balance } = get();
    if (bet > balance || bet < CONFIG.minBet) return;

    const deck = createDeck();
    const p = [deck.pop(), deck.pop()];
    const d = [deck.pop(), deck.pop()];

    set({ deck, playerHand: [], dealerHand: [],
          balance: balance - bet,
          phase:'dealing', showDealer:false, msg:'Dealing…' });

    [[{playerHand:[p[0]]},200],[{dealerHand:[d[0]]},600],
     [{playerHand:p},1000],[{dealerHand:d},1400],
     [() => get().checkBJ(p,d),2000]].forEach(([payload,t]) =>
       setTimeout(() => (typeof payload==='function' ? payload() : set(payload)), t));
  },

  checkBJ: (p,d) => {
    const pv = calc(p), dv = calc(d);
    if (pv === 21 || dv === 21) {
      set({ showDealer:true });
      if (pv===21 && dv===21) get().end('Push! Both Blackjack.', get().bet);
      else if (pv===21)       get().end(`Blackjack! You win $${get().bet*CONFIG.blackjackPayout}!`,
                                        get().bet*(1+CONFIG.blackjackPayout));
      else                    get().end('Dealer has Blackjack. You lose.', 0);
    } else set({ phase:'playing', msg:'Your turn. Hit, Stand, or Double?' });
  },

  hit: () => {
    if (get().phase!=='playing') return;
    const deck=[...get().deck], hand=[...get().playerHand, deck.pop()];
    set({ deck, playerHand:hand });
    if (calc(hand) > 21) setTimeout(()=>get().end('You bust! Dealer wins.',0),800);
  },

  stand: () => {
    if (get().phase!=='playing') return;
    set({ phase:'dealer', showDealer:true, msg:"Dealer's turn…" });
    setTimeout(()=>get().dealerPlay(),800);
  },

  double: () => {
    const { phase, bet, balance } = get();
    if (phase!=='playing' || bet*2 > balance+bet) return toast.error('Cannot double down');
    const deck=[...get().deck], hand=[...get().playerHand, deck.pop()];
    set({ deck, playerHand:hand, balance:balance-bet, bet:bet*2 });
    setTimeout(()=>get().stand(),500);
  },

  dealerPlay: () => {
    const { deck, dealerHand } = get();
    if (calc(dealerHand) >= CONFIG.dealerStandsOn) return get().end();
    dealerHand.push(deck.pop());
    set({ deck:[...deck], dealerHand });
    setTimeout(()=>get().dealerPlay(),650);
  },

  end: (msg, win=null) => {
    const { playerHand, dealerHand, bet, balance } = get();
    if (win === null) {
      const pv=calc(playerHand), dv=calc(dealerHand);
      if      (pv>21) msg='You bust! Dealer wins.';
      else if (dv>21){ msg='Dealer busts! You win!'; win=bet*2; }
      else if (pv>dv){ msg='You win!'; win=bet*2; }
      else if (pv<dv) msg='Dealer wins.';
      else            { msg='Push!'; win=bet; }
    }
    set({ balance: balance+(win??0), phase:'ended', msg, showDealer:true });
  },

  next: () => {
    const bal=get().balance;
    if (bal < CONFIG.minBet) return set({ phase:'ended', msg:'Game over — insufficient funds.' });
    set({ deck:[], playerHand:[], dealerHand:[], phase:'betting',
          msg:'Place your bet.', bet:Math.min(get().bet, bal) });
  },

  reset: () => set({
    balance: CONFIG.startingBalance, bet: CONFIG.defaultBet,
    deck:[], playerHand:[], dealerHand:[],
    phase:'betting', showDealer:false, msg:'Place your bet to start!'
  })
}));

/* ═════════════════════════ 5. CALIBRATION WIZARD ════════════════════ */
const Calibrate = ({ onClose }) => {
  const steps = [
    { label:'Hit',    key:'hitGesture'    },
    { label:'Stand',  key:'standGesture'  },
    { label:'Double', key:'doubleGesture' }
  ];

  const videoRef = useRef(null);
  const recogRef = useRef(null);
  const rafRef   = useRef(null);

  const [ready,setReady]         = useState(false);
  const [det,setDet]             = useState(null);
  const [progress,setProgress]   = useState(0);
  const [idx,setIdx]             = useState(0);

  const { updateSettings, settings } = useGame();

  /* mount / unmount camera */
  useEffect(()=>{
    let live=true;
    (async()=>{
      try{
        const recog=new MediaPipeRecognizer();
        await recog.init(videoRef.current);
        if(!live) return recog.close();
        recogRef.current=recog;

        const stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480}});
        if(!live){ stream.getTracks().forEach(t=>t.stop()); return; }
        videoRef.current.srcObject=stream;
        videoRef.current.onloadedmetadata=()=>setReady(true);
      }catch(e){ toast.error('Calibration camera error'); console.error(e); }
    })();
    return ()=>{ live=false;
      recogRef.current?.close();
      videoRef.current?.srcObject?.getTracks().forEach(t=>t.stop());
    };
  },[]);

  /* detect */
  useEffect(()=>{ if(!ready || !recogRef.current) return;
    let last=null, start=0;
    const loop=ts=>{
      const g=recogRef.current.recognise(ts);
      if(g && g.score>=0.75){
        if(g.categoryName!==last){ last=g.categoryName; start=Date.now(); }
        const p=Math.min((Date.now()-start)/1000,1);
        setDet(g); setProgress(p);
        if(p===1){
          const tgt=steps[idx].key;
          if(Object.values(settings).includes(g.categoryName) && settings[tgt]!==g.categoryName){
            toast.error('Gesture already mapped, choose another');
          }else{
            updateSettings({[tgt]:g.categoryName});
            toast.success(`${steps[idx].label} → “${g.categoryName.replace(/_/g,' ')}”`);
            if(idx<steps.length-1) setIdx(i=>i+1);
            else { toast.success('Calibration complete!'); onClose(); }
          }
          last=null; setProgress(0);
        }
      }else{ setDet(null); setProgress(0); last=null; }
      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(rafRef.current);
  },[ready,idx,settings,updateSettings,onClose]);

  const { label } = steps[idx];

  return(
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-800 w-full max-w-md rounded-xl overflow-hidden shadow-xl">
        {/* header */}
        <div className="bg-gray-900 px-4 py-3 flex justify-between items-center">
          <h2 className="font-bold">Calibration — {label}</h2>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">✕</button>
        </div>

        {/* camera */}
        <div className="aspect-video bg-black relative flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100"/>
          {!ready &&
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Starting camera…
            </div>}
          {det &&
            <div className="absolute bottom-0 inset-x-0 bg-black/70 p-2 text-center space-y-1">
              <p className="font-semibold">{det.categoryName.replace(/_/g,' ')}</p>
              <div className="h-2 w-full bg-gray-600 rounded-full overflow-hidden">
                <motion.div className="h-full bg-blue-500"
                            animate={{width:`${progress*100}%`}}
                            transition={{duration:.1,ease:'linear'}}/>
              </div>
            </div>}
        </div>

        {/* instructions */}
        <div className="p-4 text-center space-y-3">
          <p>Hold the <span className="font-semibold">{label}</span> gesture steadily until the bar fills.</p>
          <p className="text-xs text-gray-400">Tip : keep your hand fully in frame and well-lit.</p>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════ 6. CARD ═════════════════════════════ */
const Card = ({ rank,suit,hidden=false }) => {
  const color=['♥','♦'].includes(suit)?'text-red-600':'text-black';
  return(
    <motion.div layout initial={{scale:.5,y:-80,opacity:0}}
                animate={{scale:1,y:0,opacity:1}}
                exit={{scale:.5,y:80,opacity:0}}
                transition={{type:'spring',stiffness:260,damping:20}}
                className="relative w-24 h-36 md:w-28 md:h-40 [perspective:1000px]">
      <div className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]"
           style={{transform:hidden?'rotateY(180deg)':'rotateY(0deg)'}}>
        <div className={`absolute w-full h-full [backface-visibility:hidden] bg-white rounded-lg border-2 shadow-xl flex flex-col justify-between p-2 font-bold ${color}`}>
          <div>{rank} {suit}</div>
          <div className="text-5xl md:text-6xl text-center">{suit}</div>
          <div className="rotate-180 self-end">{rank} {suit}</div>
        </div>
        <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-lg
                        bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-900"/>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════ 7. GESTURE HOOK ═══════════════════════ */
const sounds={
  hit:   new Audio('https://assets.mixkit.co/sfx/download/mixkit-arcade-game-jump-coin-216.wav'),
  stand: new Audio('https://assets.mixkit.co/sfx/download/mixkit-positive-interface-beep-221.wav'),
  double:new Audio('https://assets.mixkit.co/sfx/download/mixkit-unlock-game-notification-253.wav')
};
const play = id => sounds[id]?.play().catch(()=>{});

const useGesture = (factory=defaultRecognizerFactory) => {
  const [enabled,setEnabled] = useState(false);
  const [ready,setReady]     = useState(false);
  const [gesture,setGesture] = useState(null);
  const [latency,setLatency] = useState(0);

  const videoRef=useRef(null), recogRef=useRef(null), rafRef=useRef(null);

  const G = useGame();
  const { hitGesture,standGesture,doubleGesture,holdTime,confidence,autoLearn } = G.settings;

  /* boot / teardown */
  useEffect(()=>{
    if(!enabled){
      recogRef.current?.close(); recogRef.current=null;
      videoRef.current?.srcObject?.getTracks().forEach(t=>t.stop());
      setReady(false); setGesture(null);
      return;
    }
    let live=true;
    (async()=>{
      try{
        const recog=factory();
        await recog.init(videoRef.current);
        if(!live) return recog.close();
        recogRef.current=recog;

        const stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480}});
        if(!live){ stream.getTracks().forEach(t=>t.stop()); return; }
        videoRef.current.srcObject=stream;
        videoRef.current.onloadedmetadata=()=>setReady(true);
      }catch(e){ toast.error('Camera or AI init failed'); console.error(e); setEnabled(false); }
    })();
    return()=>{ live=false; };
  },[enabled,factory]);

  /* recognise loop */
  useEffect(()=>{ if(!ready||!recogRef.current) return;
    let last=null,start=0, quiet=0;
    const loop=ts=>{
      const t0=performance.now();
      const g=recogRef.current.recognise(ts);
      setLatency(performance.now()-t0);
      if(g && g.score>=confidence){
        if(g.categoryName!==last){ last=g.categoryName; start=Date.now(); quiet=0; }
        const prog=Math.min((Date.now()-start)/holdTime,1);
        setGesture({name:g.categoryName,progress:prog});
        if(prog===1){
          if(G.phase==='playing'){
            if(last===hitGesture)    { G.hit();    play('hit');    }
            else if(last===standGesture){ G.stand();  play('stand');  }
            else if(last===doubleGesture){ G.double(); play('double'); }
          }
          G.pushLog({ t:new Date().toLocaleTimeString(), g:last, score:+g.score.toFixed(2) });
          if(autoLearn){
            const newC=Math.max(.3,Math.min(.95,g.score*0.8));
            G.updateSettings({ confidence:+newC.toFixed(2) });
          }
          last=null; setGesture(null);
        }
      }else{
        setGesture(null);
        if(++quiet===180){ toast('No hand detected',{icon:'🖐️'}); quiet=0; }
      }
      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(rafRef.current);
  },[ready,confidence,holdTime,hitGesture,standGesture,doubleGesture,G,autoLearn]);

  return { enabled,setEnabled, ready,videoRef, gesture, latency };
};

/* ═════════════════════════════ 8. APP ══════════════════════════════ */
function App(){
  const G = useGame();
  const { enabled,setEnabled, ready,videoRef,gesture,latency } = useGesture();

  const [showSettings,setShowSettings] = useState(false);
  const [showCal,setShowCal]           = useState(false);

  const pVal=calc(G.playerHand), dVal=calc(G.dealerHand);
  const gameOver = G.phase==='ended' && G.balance<CONFIG.minBet;

  /* keyboard shortcuts */
  const keyHandler=useCallback(e=>{
    if(G.phase!=='playing') return;
    switch(e.key.toLowerCase()){
      case 'h': G.hit();    break;
      case 's': G.stand();  break;
      case 'd': G.double(); break;
      default: break;
    }
  },[G]);
  useEffect(()=>{
    window.addEventListener('keydown',keyHandler);
    return()=>window.removeEventListener('keydown',keyHandler);
  },[keyHandler]);

  /* pause main camera when calibrating */
  useEffect(()=>{ if(showCal) setEnabled(false); },[showCal,setEnabled]);

  return(
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col relative">
      <Toaster position="top-center"/>
      {showCal && <Calibrate onClose={()=>setShowCal(false)}/>}

      {/* header */}
      <header className="text-center mb-4">
        <h1 className="text-4xl font-extrabold">Blackjack</h1>
        <p className="text-xl">Balance&nbsp;:&nbsp;
          <span className="font-semibold text-green-400">${G.balance}</span>
        </p>
      </header>

      {/* grid */}
      <main className="flex-grow grid md:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">

        {/* table */}
        <div className="md:col-span-2 bg-green-800 bg-[radial-gradient(#064e3b_1.5px,transparent_1.5px)] [background-size:20px_20px] rounded-xl p-4 shadow-2xl flex flex-col">

          {/* dealer */}
          <div className="flex-1">
            <h2 className="text-center opacity-80">
              Dealer {G.dealerHand.length>0 && `(${G.showDealer?dVal:calc([G.dealerHand[1]])})`}
            </h2>
            <div className="flex flex-wrap justify-center gap-3 min-h-[180px] items-center">
              <AnimatePresence>
                {G.dealerHand.map((c,i)=><Card key={c.id}{...c} hidden={!G.showDealer && i===0}/>)}
              </AnimatePresence>
            </div>
          </div>

          {/* status */}
          <div aria-live="polite" className="text-center font-bold text-xl my-4 min-h-[60px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div key={G.msg} initial={{opacity:0,y:20}}
                          animate={{opacity:1,y:0}}
                          exit={{opacity:0,y:-20}}>
                {G.msg}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* player */}
          <div className="flex-1">
            <h2 className="text-center opacity-80">
              Player {G.playerHand.length>0 && `(${pVal})`}
            </h2>
            <div className="flex flex-wrap justify-center gap-3 min-h-[180px] items-center">
              <AnimatePresence>
                {G.playerHand.map(c=><Card key={c.id}{...c}/>)}
              </AnimatePresence>
            </div>
          </div>

          {/* controls */}
          <div className="flex justify-center gap-4 flex-wrap mt-4 min-h-[52px]">
            {G.phase==='betting' && (
              <>
                <label className="flex gap-2 items-center font-semibold">
                  Bet
                  <input type="number" value={G.bet}
                         onChange={e=>G.setBet(+e.target.value)}
                         min={CONFIG.minBet} max={G.balance} step="10"
                         className="bg-gray-700 rounded w-24 px-2 text-right"/>
                </label>
                <button onClick={G.deal}
                        disabled={G.bet>G.balance || G.bet<CONFIG.minBet}
                        className="px-6 py-2 bg-blue-600 rounded-lg font-bold disabled:opacity-50">
                  Deal
                </button>
              </>
            )}
            {G.phase==='playing' && (
              <>
                <button onClick={G.hit}    className="px-6 py-2 bg-green-600 rounded-lg font-bold">Hit (H)</button>
                <button onClick={G.stand}  className="px-6 py-2 bg-red-600   rounded-lg font-bold">Stand (S)</button>
                <button onClick={G.double} className="px-6 py-2 bg-yellow-500 text-black rounded-lg font-bold">Double (D)</button>
              </>
            )}
            {G.phase==='ended' && (
              <button onClick={gameOver?G.reset:G.next}
                      className="px-6 py-2 bg-yellow-500 text-black rounded-lg font-bold">
                {gameOver?'New Game':'Next Round'}
              </button>
            )}
          </div>
        </div>

        {/* gesture panel */}
        <div className="bg-gray-800 rounded-xl flex flex-col overflow-hidden">
          {/* panel header */}
          <div className="p-4 bg-gray-900 flex justify-between items-center">
            <h3 className="font-bold">Gesture Control</h3>
            <div className="flex gap-2 text-xs items-center">
              <span>{latency.toFixed(0)} ms</span>
              <button onClick={()=>setShowSettings(!showSettings)}
                      className="bg-gray-700 px-2 py-1 rounded">
                {showSettings?'Close':'Settings'}
              </button>
              <button onClick={()=>setShowCal(true)}
                      className="bg-gray-700 px-2 py-1 rounded">
                Calibrate
              </button>
              <button onClick={()=>setEnabled(!enabled)}
                      className={`${enabled?'bg-green-600':'bg-gray-600'} px-4 py-1 rounded`}>
                {enabled?'ON':'OFF'}
              </button>
            </div>
          </div>

          {/* live camera */}
          <div className="aspect-video bg-black relative flex items-center justify-center">
            {enabled ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted
                       className="w-full h-full object-cover -scale-x-100"/>
                {gesture &&
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 p-3 backdrop-blur-sm">
                    <div className="text-center mb-1 font-bold">
                      {gesture.name.replace(/_/g,' ')}
                    </div>
                    <div className="h-2 w-full bg-gray-600 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-blue-500"
                                  animate={{width:`${gesture.progress*100}%`}}
                                  transition={{duration:.1,ease:'linear'}}/>
                    </div>
                  </div>}
                {!ready &&
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    Initialising…
                  </div>}
              </>
            ) : (
              <div className="text-center text-gray-500 p-6">
                <p className="text-4xl mb-2">👋</p>
                <p>Enable gesture control</p>
              </div>
            )}
          </div>

          {/* settings */}
          {showSettings &&
            <div className="p-4 bg-gray-900 border-t border-gray-700 text-sm space-y-3 overflow-y-auto">
              {['hitGesture','standGesture','doubleGesture'].map(k=>(
                <div key={k} className="flex justify-between gap-4 items-center">
                  <label className="font-semibold capitalize">{k.replace('Gesture','')}</label>
                  <select value={G.settings[k]}
                          onChange={e=>G.updateSettings({[k]:e.target.value})}
                          className="bg-gray-700 rounded flex-1 px-2 py-1">
                    {GESTURE_OPTIONS.map(g=><option key={g} value={g}>{g.replace(/_/g,' ')}</option>)}
                  </select>
                </div>
              ))}
              <div className="flex justify-between gap-4 items-center">
                <label className="font-semibold">Hold (ms)</label>
                <input type="number" min="300" max="2000" step="50"
                       value={G.settings.holdTime}
                       onChange={e=>G.updateSettings({holdTime:+e.target.value})}
                       className="bg-gray-700 w-24 text-right px-1 rounded"/>
              </div>
              <div className="flex justify-between gap-4 items-center">
                <label className="font-semibold">Confidence</label>
                <input type="number" min="0.3" max="0.95" step="0.05"
                       value={G.settings.confidence}
                       onChange={e=>G.updateSettings({confidence:+e.target.value})}
                       className="bg-gray-700 w-24 text-right px-1 rounded"/>
              </div>
              <div className="flex items-center gap-2">
                <input id="auto" type="checkbox" className="accent-blue-600"
                       checked={G.settings.autoLearn}
                       onChange={e=>G.updateSettings({autoLearn:e.target.checked})}/>
                <label htmlFor="auto">Adaptive confidence</label>
              </div>
              <button onClick={G.resetSettings} className="text-xs text-red-400 underline">
                Reset all settings
              </button>
            </div>}

          {/* legend */}
          <div className="p-4 text-xs text-center text-gray-400">
            <p><span className="font-semibold">{G.settings.hitGesture.replace(/_/g,' ')}</span> = Hit</p>
            <p><span className="font-semibold">{G.settings.standGesture.replace(/_/g,' ')}</span> = Stand</p>
            <p><span className="font-semibold">{G.settings.doubleGesture.replace(/_/g,' ')}</span> = Double</p>
            <p className="mt-1">Hold gesture or press H/S/D</p>
          </div>
        </div>

        {/* log */}
        <div className="hidden md:block md:col-span-3 bg-gray-900/70 rounded-lg p-2 text-xs overflow-y-auto max-h-40">
          <p className="font-bold mb-1">AI Logs (last 20)</p>
          {G.logs.map((l,i)=><p key={i}>{l.t} — {l.g} ({l.score})</p>)}
        </div>
      </main>
    </div>
  );
}

/* ═════════════════════════════ 9. BOOTSTRAP ═══════════════════════ */
createRoot(document.getElementById('root')).render(
  <React.StrictMode><App/></React.StrictMode>
);