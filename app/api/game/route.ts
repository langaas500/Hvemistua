// app/api/game/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getGameState,
  resetGame,
  resetToLobby,
  addPlayer,
  removePlayer,
  startGame,
  submitVote,
  endVoting,
  nextQuestion,
  getAvatars,
  setAvatar,
  validateToken,
  setSettings,
  getFinaleStats,
  setGameMode,
  createCheckout,
  markCheckoutPaid,
  markCheckoutCanceled,
  getUnlockInfo,
  pauseGame,
  resumeGame,
  nextQuestionNow,
} from '@/lib/gameState';
import { questions } from '@/lib/questions';

// GET - fetch current game state
export async function GET() {
  const state = getGameState();
  const avatars = getAvatars();
  const finaleSummary = getFinaleStats();
  const unlockInfo = getUnlockInfo();
  return NextResponse.json({ ...state, avatars, finaleSummary, unlockInfo });
}

// POST - perform game actions
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  switch (action) {
    case 'join': {
      const { name } = body;
      const result = addPlayer(name);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const avatars = getAvatars();
      return NextResponse.json({
        success: true,
        token: result.token,
        avatarId: result.avatarId,
        avatars,
        state: getGameState(),
      });
    }

    case 'setAvatar': {
      const { token, avatarId } = body;
      const result = setAvatar(token, avatarId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, state: getGameState() });
    }

    case 'setSettings': {
      const { tone, couplesSafe } = body;
      const result = setSettings(tone, couplesSafe);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, state: getGameState() });
    }

    case 'validateToken': {
      const { token } = body;
      const result = validateToken(token);
      if (!result.valid) {
        return NextResponse.json({ valid: false }, { status: 200 });
      }
      const avatars = getAvatars();
      return NextResponse.json({
        valid: true,
        name: result.name,
        avatarId: result.avatarId,
        avatars,
        state: getGameState(),
      });
    }

    case 'leave': {
      const { token } = body;
      removePlayer(token);
      return NextResponse.json({ success: true, state: getGameState() });
    }

    case 'start': {
      const result = startGame(questions);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, state: getGameState() });
    }

    case 'vote': {
      const { token, votedFor } = body;
      const result = submitVote(token, votedFor);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, state: getGameState() });
    }

    case 'endVoting': {
      const result = endVoting();
      return NextResponse.json({ success: true, result, state: getGameState() });
    }

    case 'nextQuestion': {
      nextQuestion();
      return NextResponse.json({ success: true, state: getGameState() });
    }

    case 'reset': {
      resetGame();
      return NextResponse.json({ success: true, state: getGameState() });
    }

    case 'resetToLobby': {
      resetToLobby();
      return NextResponse.json({ success: true, state: getGameState() });
    }

    case 'setGameMode': {
      const { mode } = body;
      const result = setGameMode(mode);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, state: getGameState() });
    }

    case 'createCheckout': {
      const result = createCheckout();
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        checkoutId: result.checkoutId,
        checkoutUrl: result.checkoutUrl,
        state: getGameState(),
      });
    }

    case 'checkoutPaid': {
      const { cid } = body;
      const result = markCheckoutPaid(cid);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, state: getGameState() });
    }

    case 'checkoutCanceled': {
      const { cid } = body;
      const result = markCheckoutCanceled(cid);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, state: getGameState() });
    }

    case 'pause': {
      const result = pauseGame();
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, state: getGameState() });
    }

    case 'resume': {
      const result = resumeGame();
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, state: getGameState() });
    }

    case 'nextQuestionNow': {
      const result = nextQuestionNow();
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, state: getGameState() });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
