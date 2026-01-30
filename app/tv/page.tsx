// app/tv/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Avatar {
  id: string;
  icon: string;
}

interface Player {
  name: string;
  avatarId: string;
}

type QuestionTone = 'mild' | 'spicy' | 'drøy';
type GameMode = 'standard' | '18+';
type CheckoutStatus = 'open' | 'paid' | 'canceled';
type GroupSize = 'small' | 'medium' | 'large';
type AudioTrack = 'lobby' | 'pause' | 'sporsmal' | null;

interface Checkout {
  id: string;
  status: CheckoutStatus;
  createdAt: number;
}

interface UnlockInfo {
  unlocked: boolean;
  until: number | null;
}

interface RerollInfo {
  reason: 'cooldown' | 'over-targeted';
  originalWinner: string;
  finalWinner: string;
}

interface Award {
  title: string;
  name: string;
  avatarId: string;
  valueText: string;
}

interface Top3Entry {
  name: string;
  wins: number;
  avatarId: string;
}

interface FinaleSummary {
  awards: Award[];
  top3: Top3Entry[];
}

interface CondensedTop3Entry {
  name: string;
  avatarId: string;
  votes: number;
  percentage: number;
}

interface CondensedResults {
  top3: CondensedTop3Entry[];
  othersVotes: number;
  othersPercentage: number;
}

interface GameState {
  phase: 'lobby' | 'question' | 'reveal' | 'gameover';
  players: Player[];
  currentQuestion: number;
  votes: Record<string, string>;
  questionStartTime: number | null;
  selectedQuestions: string[];
  avatars: Avatar[];
  selectedTone: QuestionTone;
  couplesSafe: boolean;
  lastWinnerName: string | null;
  recentWinners: string[];
  recentTargets: Record<string, number>;
  rerollInfo: RerollInfo | null;
  finaleSummary: FinaleSummary | null;
  gameMode: GameMode;
  showUpsell: boolean;
  checkout: Checkout | null;
  unlockInfo: UnlockInfo;
  isPaused: boolean;
  pausedAt: number | null;
  pauseAccumulatedMs: number;
  groupSize: GroupSize;
  questionTime: number;
  minPlayers: number;
  maxPlayers: number;
}

interface RevealResult {
  winner: string;
  winnerAvatarId: string;
  percentage: number;
  voteCount: Record<string, number>;
  rerollInfo: RerollInfo | null;
  condensedResults?: CondensedResults;
}

const DEFAULT_QUESTION_TIME = 20;
const INTERSTITIAL_TIME = 1000;
const REVEAL_HOLD_TIME = 5000;
const MAX_PLAYERS = 12;
const MIN_PLAYERS = 3;
const AUDIO_VOLUME = 0.2;

const TRACK_SOURCES: Record<Exclude<AudioTrack, null>, string> = {
  lobby: '/lobby.mp3',
  pause: '/pause.mp3',
  sporsmal: '/sporsmal.mp3',
};

// Subtle color variants for empty slots (same hue family, 8-12% opacity)
const EMPTY_SLOT_COLORS = [
  'bg-purple-500/8',
  'bg-violet-500/10',
  'bg-indigo-500/8',
  'bg-purple-400/10',
  'bg-violet-400/8',
];

function formatExpiryTime(until: number | null): string {
  if (!until) return '';
  const date = new Date(until);
  return new Intl.DateTimeFormat('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

type TVOverlay = 'none' | 'interstitial';
type ModalType = 'none' | 'unlock18' | 'payment';

function TVLayout({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col items-center justify-center p-4 md:p-6 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/front%20bg.png')" }}
    >
      <div className={`relative bg-black/65 backdrop-blur-md rounded-2xl p-4 md:p-6 shadow-2xl border border-white/10 w-full max-h-[95vh] overflow-hidden ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {children}
      </div>
    </div>
  );
}

export default function TVPage() {
  const [state, setState] = useState<GameState | null>(null);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_QUESTION_TIME);
  const [revealResult, setRevealResult] = useState<RevealResult | null>(null);
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [startError, setStartError] = useState<string>('');

  const [tvOverlay, setTvOverlay] = useState<TVOverlay>('none');
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');

  const [localTone, setLocalTone] = useState<QuestionTone>('spicy');
  const [localCouplesSafe, setLocalCouplesSafe] = useState(false);
  const [localGameMode, setLocalGameMode] = useState<GameMode>('standard');

  // Audio state
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<AudioTrack>(null);

  const hasEndedRef = useRef(false);
  const currentQuestionRef = useRef<number>(-1);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const interstitialTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get dynamic question time from state
  const questionTime = state?.questionTime ?? DEFAULT_QUESTION_TIME;

  // Initialize audio element on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audio.volume = AUDIO_VOLUME;
      audio.loop = true;
      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Unlock audio (must be called from user gesture)
  const unlockAudio = useCallback(() => {
    if (audioUnlocked || !audioRef.current) return;

    const audio = audioRef.current;
    audio.src = TRACK_SOURCES.lobby;
    audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        setAudioUnlocked(true);
      })
      .catch(() => {
        // Fail silently if autoplay is blocked
      });
  }, [audioUnlocked]);

  // Play a specific track
  const playTrack = useCallback((track: AudioTrack) => {
    if (!soundEnabled || !audioUnlocked || !audioRef.current) return;
    if (track === currentTrackRef.current) return;
    if (track === null) {
      audioRef.current.pause();
      currentTrackRef.current = null;
      return;
    }

    const audio = audioRef.current;
    audio.pause();
    audio.src = TRACK_SOURCES[track];
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Fail silently
    });
    currentTrackRef.current = track;
  }, [soundEnabled, audioUnlocked]);

  // Stop audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      currentTrackRef.current = null;
    }
  }, []);

  // Get the correct track for current phase
  const getTrackForPhase = useCallback((phase: string | undefined, isPaused: boolean): AudioTrack => {
    if (isPaused) return 'pause';
    switch (phase) {
      case 'lobby':
        return 'lobby';
      case 'question':
      case 'reveal':
        return 'sporsmal';
      case 'gameover':
        return 'lobby';
      default:
        return null;
    }
  }, []);

  // React to phase and pause changes
  useEffect(() => {
    if (!state) return;
    const targetTrack = getTrackForPhase(state.phase, state.isPaused);
    if (soundEnabled && audioUnlocked) {
      playTrack(targetTrack);
    }
  }, [state?.phase, state?.isPaused, soundEnabled, audioUnlocked, playTrack, getTrackForPhase, state]);

  // Handle sound toggle
  const handleSoundToggle = useCallback(() => {
    if (!soundEnabled) {
      // Enabling sound
      unlockAudio();
      setSoundEnabled(true);
      // Will play correct track via effect above once audioUnlocked becomes true
      if (audioUnlocked && state) {
        const targetTrack = getTrackForPhase(state.phase, state.isPaused);
        playTrack(targetTrack);
      }
    } else {
      // Disabling sound
      stopAudio();
      setSoundEnabled(false);
    }
  }, [soundEnabled, unlockAudio, audioUnlocked, state, getTrackForPhase, playTrack, stopAudio]);

  // When audioUnlocked becomes true and sound is enabled, start playing
  useEffect(() => {
    if (audioUnlocked && soundEnabled && state) {
      const targetTrack = getTrackForPhase(state.phase, state.isPaused);
      playTrack(targetTrack);
    }
  }, [audioUnlocked, soundEnabled, state, getTrackForPhase, playTrack]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJoinUrl(window.location.origin + '/play');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (interstitialTimerRef.current) clearTimeout(interstitialTimerRef.current);
    };
  }, []);

  const getAvatarIcon = (avatarId: string): string => {
    const avatar = state?.avatars?.find(a => a.id === avatarId);
    return avatar?.icon || '👤';
  };

  const fetchState = useCallback(async () => {
    const res = await fetch('/api/game');
    const data = await res.json();
    setState(data);
    if (data.phase === 'lobby') {
      setLocalTone(data.selectedTone);
      setLocalCouplesSafe(data.couplesSafe);
      setLocalGameMode(data.gameMode);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [fetchState]);

  useEffect(() => {
    if (state?.phase === 'question') {
      if (currentQuestionRef.current !== state.currentQuestion) {
        currentQuestionRef.current = state.currentQuestion;
        hasEndedRef.current = false;
        setTvOverlay('none');
        if (revealTimerRef.current) {
          clearTimeout(revealTimerRef.current);
          revealTimerRef.current = null;
        }
      }
    } else if (state?.phase === 'lobby') {
      hasEndedRef.current = false;
      setTvOverlay('none');
    }
  }, [state?.phase, state?.currentQuestion]);

  useEffect(() => {
    if (state?.phase !== 'question' || !state.questionStartTime) return;

    const updateTimer = () => {
      const now = Date.now();
      let elapsedMs = now - state.questionStartTime! - state.pauseAccumulatedMs;

      // If currently paused, subtract the current pause duration
      if (state.isPaused && state.pausedAt) {
        elapsedMs -= (now - state.pausedAt);
      }

      const elapsed = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, questionTime - elapsed);
      setTimeLeft(remaining);

      // Only trigger end if not paused
      if (remaining === 0 && !hasEndedRef.current && !state.isPaused) {
        hasEndedRef.current = true;
        triggerRevealSequence();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [state?.phase, state?.questionStartTime, state?.currentQuestion, state?.isPaused, state?.pausedAt, state?.pauseAccumulatedMs, questionTime]);

  useEffect(() => {
    if (
      state?.phase === 'question' &&
      state.players.length > 0 &&
      Object.keys(state.votes).length >= state.players.length &&
      !hasEndedRef.current &&
      !state.isPaused
    ) {
      hasEndedRef.current = true;
      triggerRevealSequence();
    }
  }, [state?.phase, state?.votes, state?.players, state?.isPaused]);

  // Auto-close payment modal when checkout is paid
  useEffect(() => {
    if (state?.checkout?.status === 'paid' && activeModal === 'payment') {
      setActiveModal('none');
      setCheckoutUrl('');
    }
  }, [state?.checkout?.status, activeModal]);

  const triggerRevealSequence = () => {
    setTvOverlay('interstitial');
    interstitialTimerRef.current = setTimeout(async () => {
      setTvOverlay('none');
      await endVoting();
    }, INTERSTITIAL_TIME);
  };

  const updateSettings = async (tone: QuestionTone, couplesSafe: boolean) => {
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setSettings', tone, couplesSafe }),
    });
    fetchState();
  };

  const handleToneChange = (tone: QuestionTone) => {
    setLocalTone(tone);
    updateSettings(tone, localCouplesSafe);
  };

  const handleCouplesSafeChange = (checked: boolean) => {
    setLocalCouplesSafe(checked);
    updateSettings(localTone, checked);
  };

  const handleGameModeChange = async (mode: GameMode) => {
    unlockAudio();
    setLocalGameMode(mode);
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setGameMode', mode }),
    });
    fetchState();

    if (mode === '18+' && !state?.unlockInfo?.unlocked) {
      setActiveModal('unlock18');
    }
  };

  const handleCreateCheckout = async () => {
    unlockAudio();
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createCheckout' }),
    });
    const data = await res.json();
    if (data.success && data.checkoutUrl) {
      const fullUrl = window.location.origin + data.checkoutUrl;
      setCheckoutUrl(fullUrl);
      setActiveModal('payment');
    }
    fetchState();
  };

  const startGame = async () => {
    unlockAudio();
    setStartError('');
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStartError(data.error || 'Kunne ikke starte spillet');
    }
    fetchState();
  };

  const endVoting = async () => {
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'endVoting' }),
    });
    const data = await res.json();
    if (data.result) {
      setRevealResult(data.result);
      revealTimerRef.current = setTimeout(() => {
        nextQuestion();
      }, REVEAL_HOLD_TIME);
    }
    fetchState();
  };

  const nextQuestion = async () => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setRevealResult(null);
    setTimeLeft(questionTime);
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'nextQuestion' }),
    });
    fetchState();
  };

  const resetGame = async () => {
    unlockAudio();
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    if (interstitialTimerRef.current) clearTimeout(interstitialTimerRef.current);
    revealTimerRef.current = null;
    interstitialTimerRef.current = null;
    setRevealResult(null);
    setStartError('');
    setTvOverlay('none');
    setActiveModal('none');
    setCheckoutUrl('');
    hasEndedRef.current = false;
    currentQuestionRef.current = -1;
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });
    fetchState();
  };

  const resetToLobby = async () => {
    unlockAudio();
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    if (interstitialTimerRef.current) clearTimeout(interstitialTimerRef.current);
    revealTimerRef.current = null;
    interstitialTimerRef.current = null;
    setRevealResult(null);
    setStartError('');
    setTvOverlay('none');
    hasEndedRef.current = false;
    currentQuestionRef.current = -1;
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resetToLobby' }),
    });
    fetchState();
  };

  const start18PlusRound = () => {
    unlockAudio();
    if (!state?.unlockInfo?.unlocked) {
      handleGameModeChange('18+');
    } else {
      handleStart18PlusAfterUnlock();
    }
  };

  const handleStart18PlusAfterUnlock = async () => {
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resetToLobby' }),
    });
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setGameMode', mode: '18+' }),
    });
    setLocalGameMode('18+');
    fetchState();
  };

  const handlePause = async () => {
    unlockAudio();
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    });
    // Clear reveal timer if it's running
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    fetchState();
  };

  const handleResume = async () => {
    unlockAudio();
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    });
    fetchState();
    // If in reveal phase, restart the reveal timer
    if (state?.phase === 'reveal' && revealResult) {
      revealTimerRef.current = setTimeout(() => {
        nextQuestion();
      }, REVEAL_HOLD_TIME);
    }
  };

  const handleNextQuestionNow = async () => {
    unlockAudio();
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (interstitialTimerRef.current) {
      clearTimeout(interstitialTimerRef.current);
      interstitialTimerRef.current = null;
    }
    setRevealResult(null);
    setTimeLeft(questionTime);
    setTvOverlay('none');
    hasEndedRef.current = false;
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'nextQuestionNow' }),
    });
    fetchState();
  };

  const qrCodeUrl = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(joinUrl)}`
    : '';

  const checkoutQrUrl = checkoutUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkoutUrl)}`
    : '';

  // Sound toggle button component
  const SoundToggle = () => (
    <button
      onClick={handleSoundToggle}
      className={`fixed top-4 right-4 z-50 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        soundEnabled
          ? 'bg-purple-600/80 text-white hover:bg-purple-700/80'
          : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80'
      }`}
    >
      {soundEnabled ? '🔊 Lyd' : '🔇 Lyd av'}
    </button>
  );

  if (!state) {
    return (
      <TVLayout>
        <SoundToggle />
        <p className="text-xl text-gray-300 text-center">Laster...</p>
      </TVLayout>
    );
  }

  // MODALS
  const renderModal = () => {
    if (activeModal === 'unlock18') {
      return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-3 text-center">🔞 Lås opp 18+</h2>
            <p className="text-gray-300 mb-4 text-center text-sm leading-relaxed">
              Dette innholdet er seksuelt og eksplisitt, og kun ment for voksne (18+).
              <br /><br />
              Er alle i rommet komfortable med dette?
            </p>
            <p className="text-yellow-400 text-lg font-semibold mb-6 text-center">
              Lås opp for denne kvelden: 69 kr
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  unlockAudio();
                  setActiveModal('none');
                  setLocalGameMode('standard');
                  fetch('/api/game', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'setGameMode', mode: 'standard' }),
                  });
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleCreateCheckout}
                className="flex-1 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Lås opp 18+
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activeModal === 'payment') {
      const checkoutStatus = state?.checkout?.status;
      return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">💳 Betal med mobilen</h2>

            {checkoutStatus === 'open' && (
              <>
                <p className="text-gray-300 mb-4 text-center text-sm">
                  Skann QR-koden med mobilen for å betale
                </p>

                {checkoutQrUrl && (
                  <div className="flex justify-center mb-4">
                    <div className="bg-white p-3 rounded-xl">
                      <img src={checkoutQrUrl} alt="Checkout QR" width={200} height={200} />
                    </div>
                  </div>
                )}

                <p className="text-blue-400 text-xs text-center mb-4 break-all">
                  {checkoutUrl}
                </p>

                <div className="flex items-center justify-center gap-2 text-yellow-400 mb-4">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span>Venter på betaling…</span>
                </div>
              </>
            )}

            {checkoutStatus === 'paid' && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-green-400 text-xl font-semibold mb-2">Betaling fullført!</p>
                <p className="text-gray-300 text-sm">
                  18+ er låst opp i 24 timer (til kl. {formatExpiryTime(state?.unlockInfo?.until ?? null)})
                </p>
              </div>
            )}

            {checkoutStatus === 'canceled' && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">❌</div>
                <p className="text-red-400 text-xl font-semibold">Avbrutt</p>
              </div>
            )}

            <button
              onClick={() => {
                unlockAudio();
                setActiveModal('none');
                setCheckoutUrl('');
                if (!state?.unlockInfo?.unlocked) {
                  setLocalGameMode('standard');
                  fetch('/api/game', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'setGameMode', mode: 'standard' }),
                  });
                }
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Lukk
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // INTERSTITIAL OVERLAY
  if (tvOverlay === 'interstitial') {
    return (
      <TVLayout>
        <SoundToggle />
        <div className="flex flex-col items-center justify-center py-12">
          <h1
            className="text-5xl md:text-7xl font-bold text-white animate-pulse"
            style={{ textShadow: '0 4px 20px rgba(147,51,234,0.8)' }}
          >
            Resultat...
          </h1>
        </div>
      </TVLayout>
    );
  }

  // LOBBY SCREEN
  if (state.phase === 'lobby') {
    const playerCount = state.players.length;
    const maxPlayers = state.maxPlayers ?? MAX_PLAYERS;
    const minPlayers = state.minPlayers ?? MIN_PLAYERS;

    // Grid layout: always 2 rows, 6 columns for 7-12 players, otherwise adaptive
    const useWideGrid = playerCount >= 7 || maxPlayers > 6;
    const gridCols = useWideGrid ? 6 : Math.max(3, Math.min(4, maxPlayers));
    const totalSlots = maxPlayers;

    const slots = Array.from({ length: totalSlots }, (_, i) => {
      const player = state.players[i] || null;
      return { index: i, player };
    });

    const canStart = playerCount >= minPlayers && (localGameMode === 'standard' || state.unlockInfo?.unlocked);

    return (
      <>
        <SoundToggle />
        {renderModal()}
        <TVLayout wide>
          <h1
            className="text-3xl md:text-5xl font-bangers mb-4 text-center text-white tracking-wide"
            style={{ textShadow: '0 4px 15px rgba(0,0,0,0.6), 0 0 30px rgba(147,51,234,0.5)' }}
          >
            HVEM I STUA ?
          </h1>

          <div className="flex gap-6 mb-4">
            {/* QR Join Section - Primary focus */}
            <div className="flex flex-col items-center justify-center flex-shrink-0 bg-white/10 rounded-2xl p-4 border-2 border-purple-500/50 shadow-lg shadow-purple-500/20">
              {qrCodeUrl && (
                <div className="bg-white p-3 rounded-xl mb-3 shadow-md">
                  <img src={qrCodeUrl} alt="QR-kode" width={130} height={130} className="block" />
                </div>
              )}
              <p className="text-base font-semibold text-white mb-1 text-center">📱 Skann for å bli med</p>
              <p className="text-xs text-purple-300 text-center mb-2">Én betaler – alle spiller</p>
              <p className="text-xs font-mono text-blue-400 text-center break-all max-w-[160px] opacity-75">
                {joinUrl || '/play'}
              </p>
            </div>

            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-2 text-center text-white">
                Spillere ({playerCount}/{maxPlayers})
              </h2>
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                }}
              >
                {slots.map(({ index, player }) => {
                  const isFirstEmpty = !player && index === playerCount;
                  const emptyColorClass = EMPTY_SLOT_COLORS[index % EMPTY_SLOT_COLORS.length];

                  return (
                    <div
                      key={index}
                      className={`rounded-xl px-2 py-2 flex items-center gap-1 min-h-[48px] transition-all ${
                        player
                          ? 'bg-white/15 border border-white/30'
                          : isFirstEmpty
                          ? 'border-2 border-dashed border-purple-400/40 bg-purple-500/10 animate-pulse'
                          : `border border-dashed border-white/15 ${emptyColorClass}`
                      }`}
                    >
                      {player ? (
                        <>
                          <span className="text-xl">{getAvatarIcon(player.avatarId)}</span>
                          <span className="text-sm text-white font-medium truncate">{player.name}</span>
                        </>
                      ) : (
                        <span className={`text-xs w-full text-center ${isFirstEmpty ? 'text-purple-300' : 'text-gray-600'}`}>
                          {isFirstEmpty ? '👆' : ''}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Game Mode Selection */}
          <div className="flex gap-3 mb-3">
            {/* Standard Mode - Bright and prominent */}
            <button
              onClick={() => handleGameModeChange('standard')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                localGameMode === 'standard'
                  ? 'bg-gradient-to-br from-purple-600/50 to-blue-600/50 border-purple-400 shadow-lg shadow-purple-500/30'
                  : 'bg-white/10 border-white/30 hover:bg-white/15 hover:border-white/40'
              }`}
            >
              <div className="text-3xl mb-2">🎉</div>
              <div className="text-base font-bold text-white">Standard</div>
              <div className="text-xs text-gray-300 mt-1">Festklassiker</div>
            </button>

            {/* 18+ Mode - Darker, premium feel */}
            <button
              onClick={() => handleGameModeChange('18+')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                localGameMode === '18+'
                  ? 'bg-gradient-to-br from-pink-900/60 to-red-900/60 border-pink-500 shadow-lg shadow-pink-500/30'
                  : 'bg-black/30 border-pink-900/50 hover:bg-black/40 hover:border-pink-800/60'
              }`}
            >
              <div className="text-3xl mb-2">🔞</div>
              <div className="text-base font-bold text-white">18+ Late Night</div>
              {!state.unlockInfo?.unlocked && (
                <div className="text-xs text-yellow-400 mt-1 font-semibold">🔓 69 kr</div>
              )}
              {state.unlockInfo?.unlocked && (
                <div className="text-xs text-green-400 mt-1">
                  ✓ Til kl. {formatExpiryTime(state.unlockInfo.until)}
                </div>
              )}
            </button>
          </div>

          {/* Advanced Settings (de-emphasized, only for standard) */}
          {localGameMode === 'standard' && (
            <div className="flex justify-center gap-6 mb-3 opacity-70 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs uppercase tracking-wide">Tone</span>
                <div className="flex gap-1">
                  {(['mild', 'spicy', 'drøy'] as QuestionTone[]).map((tone) => (
                    <button
                      key={tone}
                      onClick={() => handleToneChange(tone)}
                      className={`px-2 py-1 rounded-md text-sm transition-colors ${
                        localTone === tone
                          ? 'bg-purple-600/80 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {tone === 'mild' ? '😇' : tone === 'spicy' ? '🌶️' : '🔥'}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-gray-400 text-xs uppercase tracking-wide">Par i rommet</span>
                <button
                  type="button"
                  onClick={() => handleCouplesSafeChange(!localCouplesSafe)}
                  className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                    localCouplesSafe
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                      : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 flex items-center justify-center text-[10px] ${
                      localCouplesSafe ? 'left-5' : 'left-0.5'
                    }`}
                  >
                    {localCouplesSafe ? '💕' : ''}
                  </span>
                </button>
              </label>
            </div>
          )}

          {/* 18+ not unlocked warning */}
          {localGameMode === '18+' && !state.unlockInfo?.unlocked && (
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-3 mb-3 text-center">
              <p className="text-yellow-400 text-sm">
                🔒 18+ må låses opp før du kan starte. Trykk på 18+ knappen for å betale.
              </p>
            </div>
          )}

          {/* Start button */}
          <div className="flex flex-col items-center">
            {startError && <p className="text-red-400 text-sm mb-2">{startError}</p>}
            {playerCount >= minPlayers ? (
              <button
                onClick={startGame}
                disabled={!canStart}
                className={`text-white text-xl font-bold py-4 px-10 rounded-xl transition-all shadow-lg ${
                  !canStart
                    ? 'bg-gray-600 cursor-not-allowed'
                    : localGameMode === '18+'
                    ? 'bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 hover:scale-105'
                    : 'bg-green-600 hover:bg-green-700 hover:scale-105'
                }`}
              >
                {localGameMode === '18+' ? '🔞 Start 18+' : '🚀 Start spillet!'}
              </button>
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-yellow-400 text-lg mb-1">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                  Venter på {minPlayers - playerCount} {minPlayers - playerCount === 1 ? 'spiller' : 'spillere'} til
                </div>
                <p className="text-gray-500 text-sm">Minimum {minPlayers} spillere for å starte</p>
              </div>
            )}
          </div>
        </TVLayout>
      </>
    );
  }

  // QUESTION SCREEN
  if (state.phase === 'question') {
    const currentQ = state.selectedQuestions[state.currentQuestion];
    const voteCount = Object.keys(state.votes).length;

    return (
      <TVLayout>
        <SoundToggle />
        {/* Pause overlay */}
        {state.isPaused && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40 rounded-2xl">
            <div className="text-center">
              <h2 className="text-6xl md:text-8xl font-bold text-yellow-400 animate-pulse" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
                PAUSE
              </h2>
              <p className="text-xl text-gray-300 mt-4">Spillet er satt på pause</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <span className="text-lg text-gray-300">
            {state.gameMode === '18+' && <span className="text-pink-400">🔞 </span>}
            {state.currentQuestion + 1} / 20
          </span>
          <span
            className={`text-5xl font-bold ${state.isPaused ? 'text-yellow-400' : timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
          >
            {timeLeft}
          </span>
        </div>

        <h1
          className="text-3xl md:text-5xl font-bold text-center leading-tight mb-8 text-white"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
        >
          {currentQ}
        </h1>

        <p className="text-xl text-gray-300 text-center mb-6">
          {voteCount} / {state.players.length} har stemt
        </p>

        {/* Host controls */}
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={state.isPaused ? handleResume : handlePause}
            className={`px-6 py-3 rounded-xl font-bold text-lg transition-colors ${
              state.isPaused
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            {state.isPaused ? '▶️ Fortsett' : '⏸️ Pause'}
          </button>
          <button
            onClick={handleNextQuestionNow}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-lg transition-colors"
          >
            ⏭️ Neste spørsmål
          </button>
        </div>
      </TVLayout>
    );
  }

  // REVEAL SCREEN
  if (state.phase === 'reveal' && revealResult) {
    const rerollInfo = revealResult.rerollInfo || state.rerollInfo;
    const isLargeGroup = state.groupSize === 'large';
    const condensed = revealResult.condensedResults;

    return (
      <TVLayout>
        <SoundToggle />
        {/* Pause overlay */}
        {state.isPaused && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40 rounded-2xl">
            <div className="text-center">
              <h2 className="text-6xl md:text-8xl font-bold text-yellow-400 animate-pulse" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
                PAUSE
              </h2>
              <p className="text-xl text-gray-300 mt-4">Spillet er satt på pause</p>
            </div>
          </div>
        )}

        <h2 className="text-xl text-gray-300 mb-2 text-center">Mest sannsynlig:</h2>

        <div className="text-7xl mb-2 text-center">
          {getAvatarIcon(revealResult.winnerAvatarId)}
        </div>

        <h1
          className="text-4xl md:text-6xl font-bold text-yellow-400 mb-1 text-center"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
        >
          {revealResult.winner}
        </h1>

        {rerollInfo && (
          <p className="text-gray-400 text-sm mb-2 text-center">
            {rerollInfo.reason === 'cooldown' ? '(Variasjon aktivert)' : '(Fordeler seg litt 😅)'}
          </p>
        )}

        <p className="text-2xl text-gray-200 mb-4 text-center">
          {revealResult.percentage}% av stemmene
        </p>

        {/* Vote results - condensed for large groups */}
        {isLargeGroup && condensed ? (
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {condensed.top3.map((entry, idx) => (
              <div
                key={entry.name}
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${
                  idx === 0
                    ? 'bg-yellow-600'
                    : 'bg-white/10 border border-white/20'
                }`}
              >
                <span className="text-lg">{getAvatarIcon(entry.avatarId)}</span>
                <span className="text-white">{entry.name}: {entry.votes}</span>
                <span className="text-gray-400 text-xs">({entry.percentage}%)</span>
              </div>
            ))}
            {condensed.othersVotes > 0 && (
              <div className="px-3 py-2 rounded-lg text-sm flex items-center gap-1 bg-white/5 border border-white/10">
                <span className="text-gray-400">Andre: {condensed.othersVotes}</span>
                <span className="text-gray-500 text-xs">({condensed.othersPercentage}%)</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {Object.entries(revealResult.voteCount)
              .sort((a, b) => b[1] - a[1])
              .map(([playerName, count]) => {
                const player = state.players.find(p => p.name === playerName);
                return (
                  <div
                    key={playerName}
                    className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${
                      playerName === revealResult.winner
                        ? 'bg-yellow-600'
                        : 'bg-white/10 border border-white/20'
                    }`}
                  >
                    <span className="text-lg">{getAvatarIcon(player?.avatarId || '')}</span>
                    <span className="text-white">{playerName}: {count}</span>
                  </div>
                );
              })}
          </div>
        )}

        <p className="text-gray-500 text-center text-xs mb-4">
          {state.isPaused ? 'Spillet er pauset' : 'Neste spørsmål kommer automatisk...'}
        </p>

        {/* Host controls */}
        <div className="flex justify-center gap-4">
          <button
            onClick={state.isPaused ? handleResume : handlePause}
            className={`px-6 py-3 rounded-xl font-bold text-lg transition-colors ${
              state.isPaused
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            {state.isPaused ? '▶️ Fortsett' : '⏸️ Pause'}
          </button>
          <button
            onClick={handleNextQuestionNow}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-lg transition-colors"
          >
            ⏭️ Neste spørsmål
          </button>
        </div>
      </TVLayout>
    );
  }

  // GAME OVER / FINALE SCREEN
  if (state.phase === 'gameover') {
    const finale = state.finaleSummary;

    return (
      <>
        <SoundToggle />
        {renderModal()}
        <TVLayout wide>
          <h1
            className="text-3xl md:text-5xl font-bangers mb-4 text-center text-yellow-400 tracking-wide"
            style={{ textShadow: '0 4px 15px rgba(0,0,0,0.6), 0 0 30px rgba(234,179,8,0.5)' }}
          >
            🏆 Kveldens Priser 🏆
          </h1>

          {finale && finale.awards.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {finale.awards.map((award, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 rounded-xl p-3 border border-white/20 text-center"
                >
                  <p className="text-gray-300 text-xs mb-1">{award.title}</p>
                  <div className="text-3xl mb-1">{getAvatarIcon(award.avatarId)}</div>
                  <p className="text-sm font-bold text-white">{award.name}</p>
                  <p className="text-yellow-400 text-xs">{award.valueText}</p>
                </div>
              ))}
            </div>
          )}

          {finale && finale.top3.length > 0 && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-center text-white mb-2">🥇 Flest seire</h2>
              <div className="flex justify-center gap-4">
                {finale.top3.map((entry, idx) => (
                  <div
                    key={entry.name}
                    className={`flex flex-col items-center p-2 rounded-lg ${
                      idx === 0
                        ? 'bg-yellow-600/30 border border-yellow-500'
                        : idx === 1
                        ? 'bg-gray-400/20 border border-gray-400'
                        : 'bg-orange-700/20 border border-orange-600'
                    }`}
                  >
                    <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                    <span className="text-2xl">{getAvatarIcon(entry.avatarId)}</span>
                    <span className="text-sm font-bold text-white">{entry.name}</span>
                    <span className="text-gray-300 text-xs">{entry.wins} seire</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-lg text-gray-300 mb-3 text-center">Takk for at dere spilte! 🎉</p>

          {state.showUpsell && !state.unlockInfo?.unlocked && state.gameMode === 'standard' && (
            <div className="bg-gradient-to-r from-pink-900/40 to-red-900/40 rounded-xl p-4 mb-4 border border-pink-500/50 text-center">
              <p className="text-white mb-2">Vil dere skru opp stemningen? 🔞</p>
              <button
                onClick={start18PlusRound}
                className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Spill 18+ runde
              </button>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button
              onClick={resetToLobby}
              className="bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold py-3 px-6 rounded-xl transition-colors shadow-lg"
            >
              🔄 Spill igjen
            </button>
            <button
              onClick={resetGame}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg"
            >
              ⚙️ Bytt tone
            </button>
          </div>
        </TVLayout>
      </>
    );
  }

  return (
    <TVLayout>
      <SoundToggle />
      <p className="text-xl text-gray-300 text-center">Laster resultat...</p>
    </TVLayout>
  );
}
