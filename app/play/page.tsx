// app/play/page.tsx
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

type GameMode = 'standard' | '18+';
type CheckoutStatus = 'open' | 'paid' | 'canceled';

interface Checkout {
  id: string;
  status: CheckoutStatus;
  createdAt: number;
}

interface UnlockInfo {
  unlocked: boolean;
  until: number | null;
}

interface GameState {
  phase: 'lobby' | 'question' | 'reveal' | 'gameover';
  players: Player[];
  currentQuestion: number;
  votes: Record<string, string>;
  questionStartTime: number | null;
  selectedQuestions: string[];
  avatars: Avatar[];
  gameMode: GameMode;
  checkout: Checkout | null;
  unlockInfo: UnlockInfo;
  isPaused: boolean;
  pausedAt: number | null;
  pauseAccumulatedMs: number;
}

type Step = 'loading' | 'join' | 'avatar' | 'game';

const QUESTION_TIME = 20;

export default function PlayPage() {
  const [state, setState] = useState<GameState | null>(null);
  const [step, setStep] = useState<Step>('loading');
  const [playerName, setPlayerName] = useState('');
  const [playerToken, setPlayerToken] = useState('');
  const [playerAvatarId, setPlayerAvatarId] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [error, setError] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState('');
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);

  const savedNameRef = useRef<string>('');
  const savedAvatarRef = useRef<string>('');
  const lastQuestionRef = useRef<number>(-1);

  const getAvatarIcon = (avatarId: string): string => {
    const avatar = avatars.find(a => a.id === avatarId);
    return avatar?.icon || '👤';
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('playerToken');
    const savedName = localStorage.getItem('playerName');
    const savedAvatar = localStorage.getItem('playerAvatarId');

    if (savedName) savedNameRef.current = savedName;
    if (savedAvatar) savedAvatarRef.current = savedAvatar;

    if (savedToken) {
      attemptResume(savedToken);
    } else {
      setStep('join');
    }
  }, []);

  const attemptResume = async (token: string) => {
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validateToken', token }),
      });

      const data = await res.json();

      if (data.valid) {
        setPlayerToken(token);
        setPlayerName(data.name);
        setPlayerAvatarId(data.avatarId);
        setSelectedAvatarId(data.avatarId);
        setAvatars(data.avatars || []);
        setState(data.state);

        savedNameRef.current = data.name;
        savedAvatarRef.current = data.avatarId;
        localStorage.setItem('playerName', data.name);

        setStep('game');
      } else {
        localStorage.removeItem('playerToken');
        setStep('join');
        if (savedNameRef.current) {
          setPlayerName(savedNameRef.current);
        }
      }
    } catch {
      localStorage.removeItem('playerToken');
      setError('Nettverksfeil');
      setStep('join');
    }
  };

  const fetchState = useCallback(async () => {
    const res = await fetch('/api/game');
    const data: GameState = await res.json();
    setState(data);
    if (data.avatars) {
      setAvatars(data.avatars);
    }

    if (data.phase === 'question' && lastQuestionRef.current !== data.currentQuestion) {
      lastQuestionRef.current = data.currentQuestion;
      setHasVoted(false);
      setVotedFor('');
    }
  }, []);

  useEffect(() => {
    if (step !== 'game') return;
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [step, fetchState]);

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
      const remaining = Math.max(0, QUESTION_TIME - elapsed);
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [state?.phase, state?.questionStartTime, state?.currentQuestion, state?.isPaused, state?.pausedAt, state?.pauseAccumulatedMs]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', name: playerName.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Kunne ikke bli med');
      return;
    }

    localStorage.setItem('playerToken', data.token);
    localStorage.setItem('playerName', playerName.trim());
    savedNameRef.current = playerName.trim();

    setPlayerToken(data.token);
    setPlayerAvatarId(data.avatarId);
    setSelectedAvatarId(data.avatarId);
    setAvatars(data.avatars || []);
    setState(data.state);
    setStep('avatar');
  };

  const handleAvatarConfirm = async () => {
    if (!selectedAvatarId) return;

    if (selectedAvatarId !== playerAvatarId) {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setAvatar', token: playerToken, avatarId: selectedAvatarId }),
      });

      if (res.ok) {
        const data = await res.json();
        setPlayerAvatarId(selectedAvatarId);
        localStorage.setItem('playerAvatarId', selectedAvatarId);
        savedAvatarRef.current = selectedAvatarId;
        setState(data.state);
      }
    } else {
      localStorage.setItem('playerAvatarId', selectedAvatarId);
      savedAvatarRef.current = selectedAvatarId;
    }

    setStep('game');
  };

  const handleVote = async (votedForPlayer: string) => {
    if (hasVoted) return;

    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'vote',
        token: playerToken,
        votedFor: votedForPlayer,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setHasVoted(true);
      setVotedFor(votedForPlayer);
    } else if (data.error === 'Du har allerede stemt') {
      setHasVoted(true);
    }
  };

  const handleLeave = async () => {
    if (playerToken) {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', token: playerToken }),
      });
    }

    localStorage.removeItem('playerToken');
    setStep('join');
    setPlayerToken('');
    setPlayerAvatarId('');
    setSelectedAvatarId('');
    setHasVoted(false);
    setVotedFor('');
    setError('');
  };

  const handleNewRound = async () => {
    localStorage.removeItem('playerToken');
    setPlayerToken('');

    const nameToUse = savedNameRef.current || playerName;
    if (!nameToUse.trim()) {
      setStep('join');
      return;
    }

    setError('');
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', name: nameToUse.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Kunne ikke bli med');
      setStep('join');
      return;
    }

    localStorage.setItem('playerToken', data.token);
    localStorage.setItem('playerName', nameToUse.trim());
    savedNameRef.current = nameToUse.trim();

    setPlayerToken(data.token);
    setPlayerName(nameToUse);
    setPlayerAvatarId(data.avatarId);
    setAvatars(data.avatars || []);
    setState(data.state);

    const avatarToUse = savedAvatarRef.current;
    if (avatarToUse && avatarToUse !== data.avatarId) {
      const avatarRes = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setAvatar', token: data.token, avatarId: avatarToUse }),
      });

      if (avatarRes.ok) {
        setPlayerAvatarId(avatarToUse);
        setSelectedAvatarId(avatarToUse);
        localStorage.setItem('playerAvatarId', avatarToUse);
      } else {
        setSelectedAvatarId(data.avatarId);
      }
    } else {
      setSelectedAvatarId(data.avatarId);
    }

    setHasVoted(false);
    setVotedFor('');
    setStep('game');
  };

  // LOADING SCREEN
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-xl text-gray-400">Kobler til...</p>
      </div>
    );
  }

  // JOIN SCREEN
  if (step === 'join') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-900">
        <h1 className="text-3xl font-bold mb-8 text-center">Bli med i spillet</h1>

        <form onSubmit={handleJoin} className="w-full max-w-sm">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Ditt navn"
            className="w-full text-2xl p-4 rounded-xl bg-gray-800 border-2 border-gray-700 focus:border-blue-500 focus:outline-none mb-4"
            maxLength={20}
            autoFocus
          />

          {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

          <button
            type="submit"
            disabled={!playerName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xl font-bold py-4 rounded-xl transition-colors"
          >
            Bli med
          </button>
        </form>
      </div>
    );
  }

  // AVATAR SELECTION SCREEN
  if (step === 'avatar') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-900">
        <h1 className="text-2xl font-bold mb-2">Velg din avatar</h1>
        <p className="text-gray-400 mb-6">{playerName}</p>

        <div className="grid grid-cols-6 gap-2 mb-8 max-w-sm">
          {avatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => setSelectedAvatarId(avatar.id)}
              className={`text-4xl p-2 rounded-xl transition-all ${
                selectedAvatarId === avatar.id
                  ? 'bg-blue-600 scale-110'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {avatar.icon}
            </button>
          ))}
        </div>

        <button
          onClick={handleAvatarConfirm}
          disabled={!selectedAvatarId}
          className="w-full max-w-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xl font-bold py-4 rounded-xl transition-colors"
        >
          Fortsett
        </button>
      </div>
    );
  }

  // GAME SCREENS
  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-xl text-gray-400">Kobler til...</p>
      </div>
    );
  }

  // LOBBY - WAITING FOR GAME TO START
  if (state.phase === 'lobby') {
    const showCheckoutBanner = state.checkout?.status === 'open';
    const show18LockedBanner = state.gameMode === '18+' && !state.unlockInfo?.unlocked && !showCheckoutBanner;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-900">
        {/* Checkout pending banner */}
        {showCheckoutBanner && (
          <div className="bg-yellow-900/50 border border-yellow-500 rounded-xl p-4 mb-4 w-full max-w-sm text-center">
            <p className="text-yellow-400 text-sm">
              💳 18+ venter på betaling (69 kr)
            </p>
            <p className="text-yellow-300/70 text-xs mt-1">
              Se TV-skjermen for QR-kode
            </p>
          </div>
        )}

        {/* 18+ locked banner */}
        {show18LockedBanner && (
          <div className="bg-pink-900/30 border border-pink-500/50 rounded-xl p-4 mb-4 w-full max-w-sm text-center">
            <p className="text-pink-400 text-sm">
              🔒 18+ er låst. Se TV-skjermen for å låse opp.
            </p>
          </div>
        )}

        <div className="text-5xl mb-2">{getAvatarIcon(playerAvatarId)}</div>
        <h1 className="text-2xl font-bold mb-2">{playerName}</h1>
        <p className="text-gray-400 mb-8">Venter på at spillet starter...</p>

        <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Spillere ({state.players.length}/8)
          </h2>
          <div className="flex flex-wrap gap-2">
            {state.players.map((p) => (
              <span
                key={p.name}
                className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
                  p.name === playerName ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span>{getAvatarIcon(p.avatarId)}</span>
                <span>{p.name}</span>
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={handleLeave}
          className="text-gray-500 hover:text-gray-300"
        >
          Forlat spillet
        </button>
      </div>
    );
  }

  // VOTING SCREEN
  if (state.phase === 'question') {
    return (
      <div className="min-h-screen flex flex-col p-4 bg-gray-900">
        {/* Pause banner */}
        {state.isPaused && (
          <div className="bg-yellow-900/80 border border-yellow-500 rounded-xl p-4 mb-4 text-center">
            <p className="text-yellow-400 text-lg font-bold">⏸️ PAUSE – vent litt</p>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-500">
            {state.currentQuestion + 1}/20
          </span>
          <span
            className={`text-2xl font-bold ${
              state.isPaused ? 'text-yellow-400' : timeLeft <= 5 ? 'text-red-500' : 'text-white'
            }`}
          >
            {timeLeft}s
          </span>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <p className="text-lg leading-relaxed">
            {state.selectedQuestions[state.currentQuestion]}
          </p>
        </div>

        {hasVoted ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-green-500 text-xl mb-2">Stemt!</p>
            <p className="text-gray-400">Du stemte på {votedFor}</p>
          </div>
        ) : (
          <div className="flex-1">
            <p className="text-gray-400 text-center mb-3">
              {state.isPaused ? 'Venter på at spillet fortsetter...' : 'Hvem velger du?'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {state.players.map((player) => (
                <button
                  key={player.name}
                  onClick={() => handleVote(player.name)}
                  disabled={state.isPaused}
                  className={`font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 ${
                    state.isPaused
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-800 hover:bg-blue-600 active:bg-blue-700 text-white'
                  }`}
                >
                  <span className="text-2xl">{getAvatarIcon(player.avatarId)}</span>
                  <span className="text-base">{player.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // REVEAL SCREEN
  if (state.phase === 'reveal') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-900">
        {/* Pause banner */}
        {state.isPaused && (
          <div className="bg-yellow-900/80 border border-yellow-500 rounded-xl p-4 mb-4 w-full max-w-sm text-center">
            <p className="text-yellow-400 text-lg font-bold">⏸️ PAUSE – vent litt</p>
          </div>
        )}

        <div className="text-6xl mb-4">📺</div>
        <h1 className="text-2xl font-bold mb-2 text-center">Se på TV-skjermen!</h1>
        <p className="text-gray-400 text-center">Resultatene vises der</p>
      </div>
    );
  }

  // GAME OVER / FINALE
  if (state.phase === 'gameover') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-900">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold mb-2 text-center">Finale!</h1>
        <p className="text-gray-400 mb-8 text-center">Se prisutdelingen på TV-skjermen</p>

        <button
          onClick={handleNewRound}
          className="bg-purple-600 hover:bg-purple-700 text-white text-xl font-bold py-4 px-8 rounded-xl transition-colors mb-4"
        >
          🔄 Ny runde
        </button>

        <button
          onClick={handleLeave}
          className="text-gray-500 hover:text-gray-300 text-sm"
        >
          Forlat spillet
        </button>
      </div>
    );
  }

  return null;
}
