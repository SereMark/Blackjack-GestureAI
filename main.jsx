import React, { useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { motion, AnimatePresence } from 'framer-motion'
import { create } from 'zustand'
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'

/* ======================  GESTURE OPTIONS & DEFAULTS  ===================== */

const GESTURE_OPTIONS = [
  'Open_Palm',
  'Closed_Fist',
  'Pointing_Up',
  'Thumb_Up',
  'Thumb_Down',
  'Victory',
  'ILoveYou'
]

const DEFAULT_SETTINGS = {
  hitGesture:   'Open_Palm',
  standGesture: 'Closed_Fist',
  holdTime:     800,  // ms the gesture must be held
  confidence:   0.7   // minimum recognition confidence (0‒1)
}

/* ===========================  CONFIG  =========================== */

const CONFIG = {
  startingBalance: 1000,
  minBet: 10,
  defaultBet: 50,
  blackjackPayout: 1.5, // 3 : 2
  dealerStandsOn: 17
}

/* ===========================  HELPERS  ========================== */

const createDeck = () =>                                   // 52-card deck, shuffled
  ['♠','♥','♦','♣'].flatMap(suit =>
    ['A','2','3','4','5','6','7','8','9','10','J','Q','K']
      .map(rank => ({ suit, rank, id: `${rank}-${suit}` }))
  ).sort(() => Math.random() - 0.5)

const calculateValue = (hand = []) => {                    // ace = 1 | 11
  let value = 0, aces = 0
  for (const c of hand) {
    if (!c) continue
    if (c.rank === 'A')        { value += 11; aces++ }
    else if ('KQJ'.includes(c.rank)) value += 10
    else value += +c.rank
  }
  while (value > 21 && aces--) value -= 10
  return value
}

/* ===========================  GLOBAL STATE  ===================== */

const useGameStore = create((set, get) => {
  const loadSettings = () => {
    try {
      return {
        ...DEFAULT_SETTINGS,
        ...(JSON.parse(localStorage.getItem('gestureSettings') || 'null') || {})
      }
    } catch {
      return DEFAULT_SETTINGS
    }
  }
  const persistSettings = s =>
    localStorage.setItem('gestureSettings', JSON.stringify(s))

  return ({
    /* -------- blackjack state -------- */
    balance: CONFIG.startingBalance,
    bet:     CONFIG.defaultBet,
    deck: [], playerHand: [], dealerHand: [],
    gamePhase: 'betting',                // betting → dealing → playing → dealer → ended
    message: 'Place your bet to start!',
    showDealerCards: false,

    /* -------- gesture settings -------- */
    settings: loadSettings(),
    updateSettings: updates => set(state => {
      const updated = { ...state.settings, ...updates }
      persistSettings(updated)
      return { settings: updated }
    }),

    setBet: amount =>
      set({ bet: Math.min(Math.max(CONFIG.minBet, amount || 0), get().balance) }),

    deal: () => {
      const { bet, balance } = get()
      if (bet > balance || bet < CONFIG.minBet) return

      const deck = createDeck()
      const p = [deck.pop(), deck.pop()]
      const d = [deck.pop(), deck.pop()]

      set({
        deck,
        playerHand: [],
        dealerHand: [],
        balance: balance - bet,
        gamePhase: 'dealing',
        message: 'Dealing...',
        showDealerCards: false
      })

      ;[
        [{ playerHand: [p[0]] }, 200],
        [{ dealerHand: [d[0]] }, 600],
        [{ playerHand: p      }, 1000],
        [{ dealerHand: d      }, 1400],
        [() => get().checkForBlackjack(p, d), 2000]
      ].forEach(([payload, t]) =>
        setTimeout(() =>
          typeof payload === 'function' ? payload() : set(payload), t))
    },

    checkForBlackjack: (p, d) => {
      const pv = calculateValue(p), dv = calculateValue(d)
      if (pv === 21 || dv === 21) {
        set({ showDealerCards: true })
        if (pv === 21 && dv === 21) {
          get().endGame('Push! Both have Blackjack.', get().bet)
        } else if (pv === 21) {
          get().endGame(
            `Blackjack! You win $${get().bet * CONFIG.blackjackPayout}!`,
            get().bet * (1 + CONFIG.blackjackPayout)
          )
        } else {
          get().endGame('Dealer has Blackjack. You lose.', 0)
        }
      } else {
        set({ gamePhase: 'playing', message: 'Your turn. Hit or Stand?' })
      }
    },

    hit: () => {
      if (get().gamePhase !== 'playing') return
      const deck = [...get().deck], hand = [...get().playerHand, deck.pop()]
      set({ deck, playerHand: hand })
      if (calculateValue(hand) > 21)
        setTimeout(() => get().endGame('You bust! Dealer wins.', 0), 1200)
    },

    stand: () => {
      if (get().gamePhase !== 'playing') return
      set({
        gamePhase: 'dealer',
        showDealerCards: true,
        message: "Dealer's turn..."
      })
      setTimeout(() => get().dealerPlay(), 1200)
    },

    dealerPlay: () => {
      const { deck, dealerHand } = get()
      if (calculateValue(dealerHand) >= CONFIG.dealerStandsOn)
        return get().endGame()
      dealerHand.push(deck.pop())
      set({ deck: [...deck], dealerHand })
      setTimeout(() => get().dealerPlay(), 1000)
    },

    endGame: (msg, winnings = null) => {
      const { playerHand, dealerHand, bet, balance } = get()
      if (winnings === null) {                       // normal settlement
        const pv = calculateValue(playerHand)
        const dv = calculateValue(dealerHand)
        if      (pv > 21)           msg = 'You bust! Dealer wins.'
        else if (dv > 21) {         msg = 'Dealer busts! You win!'; winnings = bet * 2 }
        else if (pv > dv) {         msg = 'You win!';              winnings = bet * 2 }
        else if (pv < dv)           msg = 'Dealer wins.'
        else {                      msg = 'Push!';                 winnings = bet }
      }
      set({
        balance: balance + (winnings ?? 0),
        gamePhase: 'ended',
        message: msg,
        showDealerCards: true
      })
    },

    resetRound: () => {
      const { balance } = get()
      if (balance < CONFIG.minBet)
        return set({
          gamePhase: 'ended',
          message: 'Game Over! Not enough money to play.'
        })
      set({
        deck: [], playerHand: [], dealerHand: [],
        gamePhase: 'betting',
        message: 'Place your bet for the next round.',
        bet: Math.min(get().bet, balance)
      })
    },

    startNewGame: () => set({
      balance: CONFIG.startingBalance,
      bet: CONFIG.defaultBet,
      deck: [], playerHand: [], dealerHand: [],
      gamePhase: 'betting',
      message: 'Place your bet to start!',
      showDealerCards: false
    })
  })
})

/* ===========================  CARD  ============================= */

const Card = ({ rank, suit, hidden = false }) => {
  const color = ['♥','♦'].includes(suit) ? 'text-red-600' : 'text-black'
  return (
    <motion.div
      layout
      initial={{ scale: 0.5, y: -100, opacity: 0 }}
      animate={{ scale: 1,  y:   0, opacity: 1 }}
      exit={{ scale: 0.5, y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="relative w-24 h-36 md:w-28 md:h-40 [perspective:1000px]"
    >
      <div
        className="relative w-full h-full transition-transform duration-700
                   [transform-style:preserve-3d]"
        style={{ transform: hidden ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        <div
          className={`absolute w-full h-full [backface-visibility:hidden] rounded-lg
                      bg-white shadow-xl border-2 ${color}
                      flex flex-col justify-between p-2 font-bold
                      text-xl md:text-2xl`}
        >
          <div>{rank} {suit}</div>
          <div className="text-5xl md:text-6xl text-center">{suit}</div>
          <div className="rotate-180 self-end">{rank} {suit}</div>
        </div>

        <div
          className="absolute w-full h-full [backface-visibility:hidden]
                     [transform:rotateY(180deg)] rounded-lg
                     bg-gradient-to-br from-blue-600 to-blue-800
                     shadow-xl border-2 border-blue-900"
        />
      </div>
    </motion.div>
  )
}

/* ===========================  GESTURE HOOK  ===================== */

const useGestureDetection = () => {
  const [enabled, setEnabled] = useState(false)
  const [gesture, setGesture] = useState(null)
  const [ready,   setReady]   = useState(false)
  const videoRef      = useRef(null)
  const recognizerRef = useRef(null)
  const { hit, stand, gamePhase, settings } = useGameStore()

  const { hitGesture, standGesture, holdTime, confidence } = settings

  // Initialise / teardown camera & recognizer
  useEffect(() => {
    if (!enabled) {
      recognizerRef.current?.close()
      recognizerRef.current = null
      videoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
      setReady(false)
      setGesture(null)
      return
    }

    let mounted = true
    ;(async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm'
        )
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.6
        })
        if (!mounted) return recognizer.close()
        recognizerRef.current = recognizer

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        })
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setReady(true)
      } catch (e) {
        console.error('Gesture init failed', e)
        mounted && setEnabled(false)
      }
    })()
    return () => { mounted = false }
  }, [enabled])

  // Detection loop
  useEffect(() => {
    if (!ready || !recognizerRef.current) {
      setGesture(null)
      return
    }

    let last = null, start = 0, id
    const detect = ts => {
      const res = recognizerRef.current.recognizeForVideo(
        videoRef.current, ts
      )
      const g = res.gestures?.[0]?.[0]
      if (g && g.score >= confidence) {
        if (g.categoryName !== last) { last = g.categoryName; start = Date.now() }
        const prog = Math.min((Date.now() - start) / holdTime, 1)
        setGesture({ name: g.categoryName, progress: prog })
        if (prog === 1) {
          if (last === hitGesture   && gamePhase === 'playing') hit()
          if (last === standGesture && gamePhase === 'playing') stand()
          last = null
        }
      } else {
        setGesture(null)
        last = null
      }
      id = requestAnimationFrame(detect)
    }
    id = requestAnimationFrame(detect)
    return () => cancelAnimationFrame(id)
  }, [ready, gamePhase, hit, stand,
      hitGesture, standGesture, holdTime, confidence])

  return { enabled, setEnabled, ready, gesture, videoRef }
}

/* ===========================  APP  ============================== */

function App () {
  const S = useGameStore()
  const { enabled, setEnabled, ready, gesture, videoRef } = useGestureDetection()
  const pVal = calculateValue(S.playerHand)
  const dVal = calculateValue(S.dealerHand)
  const [showSettings, setShowSettings] = useState(false)

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = e => {
      if (S.gamePhase !== 'playing') return
      if (e.key.toLowerCase() === 'h') S.hit()
      if (e.key.toLowerCase() === 's') S.stand()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [S.gamePhase, S.hit, S.stand])

  const view = {
    betting: S.gamePhase === 'betting',
    playing: S.gamePhase === 'playing',
    ended:   S.gamePhase === 'ended'
  }
  const gameOver = view.ended && S.balance < CONFIG.minBet

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans flex flex-col">
      {/* ===== Header ===== */}
      <header className="text-center mb-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-wider">
          Blackjack
        </h1>
        <p className="text-xl md:text-2xl mt-1">
          Balance:&nbsp;
          <span className="font-semibold text-green-400">
            ${S.balance}
          </span>
        </p>
      </header>

      {/* ===== Main layout ===== */}
      <main className="flex-grow grid md:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        {/* ===== Table ===== */}
        <div className="md:col-span-2 bg-green-800
                        bg-[radial-gradient(theme(colors.green.900)_1.5px,transparent_1.5px)]
                        [background-size:20px_20px] rounded-xl p-4 md:p-6 shadow-2xl
                        flex flex-col">
          {/* Dealer */}
          <div className="flex-1">
            <h2 className="text-lg md:text-xl mb-3 text-center opacity-80">
              Dealer's Hand&nbsp;
              {S.dealerHand.length > 0 &&
                `(${S.showDealerCards ? dVal
                  : calculateValue([S.dealerHand[1]])})`}
            </h2>
            <div className="flex flex-wrap gap-3 justify-center
                            min-h-[180px] items-center">
              <AnimatePresence>
                {S.dealerHand.map((c, i) => (
                  <Card key={c.id} {...c}
                        hidden={!S.showDealerCards && i === 0}/>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Status */}
          <div className="text-center text-xl md:text-2xl font-bold my-4
                          min-h-[60px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={S.message}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {S.message}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Player */}
          <div className="flex-1">
            <h2 className="text-lg md:text-xl mb-3 text-center opacity-80">
              Your Hand&nbsp;
              {S.playerHand.length > 0 && `(${pVal})`}
            </h2>
            <div className="flex flex-wrap gap-3 justify-center
                            min-h-[180px] items-center">
              <AnimatePresence>
                {S.playerHand.map(c => <Card key={c.id} {...c}/>)}
              </AnimatePresence>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center items-center gap-4 flex-wrap
                          mt-4 min-h-[52px]">
            {/* —— betting —— */}
            {view.betting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4"
              >
                <label className="flex items-center gap-2 font-semibold">
                  Bet:
                  <input
                    type="number"
                    value={S.bet}
                    onChange={e => S.setBet(+e.target.value)}
                    min={CONFIG.minBet}
                    max={S.balance}
                    step="10"
                    className="px-3 py-2 rounded bg-gray-700 w-28
                               border border-gray-600
                               focus:outline-none focus:ring-2
                               focus:ring-blue-500"
                  />
                </label>
                <button
                  onClick={S.deal}
                  disabled={S.bet > S.balance || S.bet < CONFIG.minBet}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg
                             font-bold disabled:opacity-50 shadow-lg"
                >
                  Deal
                </button>
              </motion.div>
            )}

            {/* —— playing —— */}
            {view.playing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4"
              >
                <button
                  onClick={S.hit}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700
                             rounded-lg font-bold shadow-lg"
                >
                  Hit&nbsp;(H)
                </button>
                <button
                  onClick={S.stand}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700
                             rounded-lg font-bold shadow-lg"
                >
                  Stand&nbsp;(S)
                </button>
              </motion.div>
            )}

            {/* —— ended —— */}
            {view.ended && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <button
                  onClick={gameOver ? S.startNewGame : S.resetRound}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600
                             text-black rounded-lg font-bold shadow-lg"
                >
                  {gameOver ? 'New Game' : 'Next Round'}
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* ===== Gesture panel ===== */}
        <div className="bg-gray-800 rounded-xl overflow-hidden flex flex-col">
          {/* — header — */}
          <div className="p-4 bg-gray-900 flex justify-between items-center">
            <h3 className="font-bold text-lg">Gesture Control</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600
                           text-sm font-semibold"
              >
                {showSettings ? 'Close' : 'Settings'}
              </button>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`px-4 py-1 rounded-md text-sm font-semibold
                           ${enabled
                             ? 'bg-green-600 hover:bg-green-700'
                             : 'bg-gray-600 hover:bg-gray-500'}`}
              >
                {enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* — video / placeholder — */}
          <div className="aspect-video bg-black relative flex items-center justify-center">
            {enabled ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
                {gesture && (
                  <div
                    className="absolute bottom-0 inset-x-0
                               bg-black/70 p-3 backdrop-blur-sm"
                  >
                    <div className="text-center mb-1 text-lg font-bold">
                      {gesture.name.replace(/_/g, ' ')}
                    </div>
                    {view.playing && (
                      <div
                        className="w-full bg-gray-600 rounded-full h-2.5 overflow-hidden"
                      >
                        <motion.div
                          className="bg-blue-500 h-full"
                          animate={{ width: `${gesture.progress * 100}%` }}
                          transition={{ duration: 0.1, ease: 'linear' }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {!ready && (
                  <div
                    className="absolute inset-0 flex items-center justify-center
                               text-gray-400"
                  >
                    Initializing&nbsp;Camera…
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-gray-500 p-4">
                <p className="text-4xl mb-2">👋</p>
                <p>Enable gesture control to play with your hands.</p>
              </div>
            )}
          </div>

          {/* — settings — */}
          {showSettings && (
            <div
              className="p-4 bg-gray-900 border-t border-gray-700
                         space-y-4 text-sm"
            >
              {/* Hit gesture */}
              <div className="flex items-center justify-between gap-4">
                <label className="font-semibold">Hit Gesture</label>
                <select
                  value={S.settings.hitGesture}
                  onChange={e =>
                    S.updateSettings({ hitGesture: e.target.value })}
                  className="bg-gray-700 rounded px-2 py-1 flex-1"
                >
                  {GESTURE_OPTIONS.map(g => (
                    <option key={g} value={g}>
                      {g.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stand gesture */}
              <div className="flex items-center justify-between gap-4">
                <label className="font-semibold">Stand Gesture</label>
                <select
                  value={S.settings.standGesture}
                  onChange={e =>
                    S.updateSettings({ standGesture: e.target.value })}
                  className="bg-gray-700 rounded px-2 py-1 flex-1"
                >
                  {GESTURE_OPTIONS.map(g => (
                    <option key={g} value={g}>
                      {g.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hold time */}
              <div className="flex items-center justify-between gap-4">
                <label className="font-semibold">
                  Hold&nbsp;Time&nbsp;(ms)
                </label>
                <input
                  type="number"
                  min="300"
                  max="2000"
                  step="50"
                  value={S.settings.holdTime}
                  onChange={e =>
                    S.updateSettings({ holdTime: +e.target.value })}
                  className="bg-gray-700 rounded px-2 py-1 w-24 text-right"
                />
              </div>

              {/* Confidence */}
              <div className="flex items-center justify-between gap-4">
                <label className="font-semibold">Confidence</label>
                <input
                  type="number"
                  min="0.3"
                  max="0.95"
                  step="0.05"
                  value={S.settings.confidence}
                  onChange={e =>
                    S.updateSettings({ confidence: +e.target.value })}
                  className="bg-gray-700 rounded px-2 py-1 w-24 text-right"
                />
              </div>

              {/* Same-gesture warning */}
              {S.settings.hitGesture === S.settings.standGesture && (
                <p className="text-xs text-red-400 text-center">
                  Hit and Stand gestures must be different!
                </p>
              )}
            </div>
          )}

          {/* — legend — */}
          <div className="p-4 text-sm text-center text-gray-400">
            <p>
              <span className="font-semibold">
                {S.settings.hitGesture.replace(/_/g, ' ')}
              </span> = Hit
            </p>
            <p>
              <span className="font-semibold">
                {S.settings.standGesture.replace(/_/g, ' ')}
              </span> = Stand
            </p>
            <p className="mt-2 text-xs">
              Hold gesture to confirm or press&nbsp;H&nbsp;/&nbsp;S.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ===========================  BOOT  ============================= */

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
)