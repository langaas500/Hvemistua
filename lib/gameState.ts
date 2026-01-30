// lib/gameState.ts
// In-memory game state - persists only while server is running

import { Question, QuestionTone, getDefault18PlusQuestions } from './questions';

export type GamePhase = 'lobby' | 'question' | 'reveal' | 'gameover';
export type GameMode = 'standard' | '18+';
export type CheckoutStatus = 'open' | 'paid' | 'canceled';
export type GroupSize = 'small' | 'medium' | 'large';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;

export interface Avatar {
  id: string;
  icon: string;
}

export interface Player {
  name: string;
  avatarId: string;
}

export interface RerollInfo {
  reason: 'cooldown' | 'over-targeted';
  originalWinner: string;
  finalWinner: string;
}

export interface Award {
  title: string;
  name: string;
  avatarId: string;
  valueText: string;
}

export interface Top3Entry {
  name: string;
  wins: number;
  avatarId: string;
}

export interface FinaleSummary {
  awards: Award[];
  top3: Top3Entry[];
}

export interface Checkout {
  id: string;
  status: CheckoutStatus;
  createdAt: number;
}

export interface UnlockInfo {
  unlocked: boolean;
  until: number | null;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentQuestion: number;
  votes: Record<string, string>;
  questionStartTime: number | null;
  selectedQuestions: string[];
  selectedTone: QuestionTone;
  couplesSafe: boolean;
  lastWinnerName: string | null;
  recentWinners: string[];
  recentTargets: Record<string, number>;
  rerollInfo: RerollInfo | null;
  winsByName: Record<string, number>;
  totalVotesReceivedByName: Record<string, number>;
  gameMode: GameMode;
  showUpsell: boolean;
  // 24-hour unlock
  unlock18PlusUntil: number | null;
  checkout: Checkout | null;
  // Pause state
  isPaused: boolean;
  pausedAt: number | null;
  pauseAccumulatedMs: number;
}

export const AVATARS: Avatar[] = [
  // Party faces
  { id: 'party', icon: '🥳' },
  { id: 'cool', icon: '😎' },
  { id: 'crazy', icon: '🤪' },
  { id: 'cowboy', icon: '🤠' },
  { id: 'ghost', icon: '👻' },
  { id: 'devil', icon: '😈' },
  { id: 'clown', icon: '🤡' },
  { id: 'disguise', icon: '🥸' },
  { id: 'monocle', icon: '🧐' },
  { id: 'nerd', icon: '🤓' },
  { id: 'skull', icon: '💀' },
  { id: 'alien', icon: '👽' },
  { id: 'robot', icon: '🤖' },
  { id: 'superhero', icon: '🦸' },
  { id: 'wizard', icon: '🧙' },
  { id: 'vampire', icon: '🧛' },
  { id: 'ninja', icon: '🥷' },
  { id: 'princess', icon: '👸' },
  // Fantasy & fun
  { id: 'unicorn', icon: '🦄' },
  { id: 'dragon', icon: '🐲' },
  { id: 'fairy', icon: '🧚' },
  { id: 'mermaid', icon: '🧜' },
  { id: 'trex', icon: '🦖' },
  { id: 'octopus', icon: '🐙' },
  { id: 'pumpkin', icon: '🎃' },
  { id: 'fire', icon: '🔥' },
  { id: 'rainbow', icon: '🌈' },
  { id: 'star', icon: '⭐' },
];

export function getAvatars(): Avatar[] {
  return AVATARS;
}

let tokenMap: Record<string, Player> = {};

let gameState: GameState = {
  phase: 'lobby',
  players: [],
  currentQuestion: 0,
  votes: {},
  questionStartTime: null,
  selectedQuestions: [],
  selectedTone: 'spicy',
  couplesSafe: false,
  lastWinnerName: null,
  recentWinners: [],
  recentTargets: {},
  rerollInfo: null,
  winsByName: {},
  totalVotesReceivedByName: {},
  gameMode: 'standard',
  showUpsell: false,
  unlock18PlusUntil: null,
  checkout: null,
  isPaused: false,
  pausedAt: null,
  pauseAccumulatedMs: 0,
};

// Get group size based on player count
export function getGroupSize(playerCount?: number): GroupSize {
  const count = playerCount ?? gameState.players.length;
  if (count <= 6) return 'small';
  if (count <= 9) return 'medium';
  return 'large';
}

// Get question time based on group size
export function getQuestionTime(groupSize?: GroupSize): number {
  const size = groupSize ?? getGroupSize();
  switch (size) {
    case 'small': return 20;
    case 'medium': return 18;
    case 'large': return 15;
  }
}

// Check if 18+ is currently unlocked (within 24h window)
export function is18PlusUnlocked(): boolean {
  if (gameState.unlock18PlusUntil === null) return false;
  return Date.now() < gameState.unlock18PlusUntil;
}

// Get unlock info for API response
export function getUnlockInfo(): UnlockInfo {
  return {
    unlocked: is18PlusUnlocked(),
    until: gameState.unlock18PlusUntil,
  };
}

export function getGameState(): GameState {
  return {
    ...gameState,
    players: [...gameState.players],
    recentWinners: [...gameState.recentWinners],
    recentTargets: { ...gameState.recentTargets },
    winsByName: { ...gameState.winsByName },
    totalVotesReceivedByName: { ...gameState.totalVotesReceivedByName },
    checkout: gameState.checkout ? { ...gameState.checkout } : null,
  };
}

export function getFinaleStats(): FinaleSummary | null {
  if (gameState.phase !== 'gameover') return null;

  const awards: Award[] = [];
  const players = gameState.players;

  const getPlayerAvatarId = (name: string): string => {
    const player = players.find(p => p.name === name);
    return player?.avatarId || AVATARS[0].id;
  };

  let maxWins = 0;
  let mainCharacter = '';
  Object.entries(gameState.winsByName).forEach(([name, wins]) => {
    if (wins > maxWins) {
      maxWins = wins;
      mainCharacter = name;
    }
  });
  if (mainCharacter && maxWins > 0) {
    awards.push({
      title: 'Kveldens hovedkarakter',
      name: mainCharacter,
      avatarId: getPlayerAvatarId(mainCharacter),
      valueText: `${maxWins} seire`,
    });
  }

  let maxTotalVotes = 0;
  let chaosMagnet = '';
  Object.entries(gameState.totalVotesReceivedByName).forEach(([name, votes]) => {
    if (votes > maxTotalVotes) {
      maxTotalVotes = votes;
      chaosMagnet = name;
    }
  });
  if (chaosMagnet && maxTotalVotes > 0) {
    awards.push({
      title: 'Kveldens kaosmagnet',
      name: chaosMagnet,
      avatarId: getPlayerAvatarId(chaosMagnet),
      valueText: `${maxTotalVotes} stemmer totalt`,
    });
  }

  let minTotalVotes = Infinity;
  let innocent = '';
  players.forEach(p => {
    const votes = gameState.totalVotesReceivedByName[p.name] || 0;
    if (votes < minTotalVotes) {
      minTotalVotes = votes;
      innocent = p.name;
    }
  });
  if (innocent && innocent !== mainCharacter && innocent !== chaosMagnet) {
    awards.push({
      title: 'Kveldens uskyldige',
      name: innocent,
      avatarId: getPlayerAvatarId(innocent),
      valueText: minTotalVotes === 0 ? 'Null stemmer!' : `Bare ${minTotalVotes} stemmer`,
    });
  }

  const awardedNames = awards.map(a => a.name);
  const remainingPlayers = players.filter(p => !awardedNames.includes(p.name));
  if (remainingPlayers.length > 0) {
    const wildcardLabels = ['Kveldens mysterium', 'Kveldens joker', 'Kveldens overraskelse', 'Kveldens nøytrale'];
    const randomPlayer = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)];
    const randomLabel = wildcardLabels[Math.floor(Math.random() * wildcardLabels.length)];
    awards.push({
      title: randomLabel,
      name: randomPlayer.name,
      avatarId: randomPlayer.avatarId,
      valueText: '🎲',
    });
  }

  const sortedByWins = Object.entries(gameState.winsByName)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, wins]) => ({
      name,
      wins,
      avatarId: getPlayerAvatarId(name),
    }));

  return { awards, top3: sortedByWins };
}

// Reset game but PRESERVE unlock18PlusUntil
export function resetGame(): GameState {
  const preserveUnlockUntil = gameState.unlock18PlusUntil;

  gameState = {
    phase: 'lobby',
    players: [],
    currentQuestion: 0,
    votes: {},
    questionStartTime: null,
    selectedQuestions: [],
    selectedTone: 'spicy',
    couplesSafe: false,
    lastWinnerName: null,
    recentWinners: [],
    recentTargets: {},
    rerollInfo: null,
    winsByName: {},
    totalVotesReceivedByName: {},
    gameMode: 'standard',
    showUpsell: false,
    unlock18PlusUntil: preserveUnlockUntil,
    checkout: null,
    isPaused: false,
    pausedAt: null,
    pauseAccumulatedMs: 0,
  };
  tokenMap = {};
  return getGameState();
}

export function resetToLobby(): GameState {
  const preserveUnlockUntil = gameState.unlock18PlusUntil;
  const preservePlayers = [...gameState.players];
  const preserveTokenMap = { ...tokenMap };

  gameState = {
    phase: 'lobby',
    players: preservePlayers,
    currentQuestion: 0,
    votes: {},
    questionStartTime: null,
    selectedQuestions: [],
    selectedTone: 'spicy',
    couplesSafe: false,
    lastWinnerName: null,
    recentWinners: [],
    recentTargets: {},
    rerollInfo: null,
    winsByName: {},
    totalVotesReceivedByName: {},
    gameMode: 'standard',
    showUpsell: false,
    unlock18PlusUntil: preserveUnlockUntil,
    checkout: null,
    isPaused: false,
    pausedAt: null,
    pauseAccumulatedMs: 0,
  };
  tokenMap = preserveTokenMap;
  return getGameState();
}

function generateCheckoutId(): string {
  return 'cs_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function createCheckout(): { success: boolean; error?: string; checkoutId?: string; checkoutUrl?: string } {
  if (gameState.phase !== 'lobby') {
    return { success: false, error: 'Kan bare opprette checkout i lobbyen' };
  }

  if (gameState.gameMode !== '18+') {
    return { success: false, error: '18+ modus må være valgt' };
  }

  if (is18PlusUnlocked()) {
    return { success: false, error: '18+ er allerede låst opp' };
  }

  const checkoutId = generateCheckoutId();
  gameState.checkout = {
    id: checkoutId,
    status: 'open',
    createdAt: Date.now(),
  };

  return {
    success: true,
    checkoutId,
    checkoutUrl: `/checkout?cid=${checkoutId}`,
  };
}

export function markCheckoutPaid(checkoutId: string): { success: boolean; error?: string } {
  if (!gameState.checkout) {
    return { success: false, error: 'Ingen aktiv checkout' };
  }

  if (gameState.checkout.id !== checkoutId) {
    return { success: false, error: 'Ugyldig checkout ID' };
  }

  if (gameState.checkout.status !== 'open') {
    return { success: false, error: 'Checkout er ikke åpen' };
  }

  gameState.checkout.status = 'paid';
  // Set 24-hour unlock window
  gameState.unlock18PlusUntil = Date.now() + 24 * 60 * 60 * 1000;

  return { success: true };
}

export function markCheckoutCanceled(checkoutId: string): { success: boolean; error?: string } {
  if (!gameState.checkout) {
    return { success: false, error: 'Ingen aktiv checkout' };
  }

  if (gameState.checkout.id !== checkoutId) {
    return { success: false, error: 'Ugyldig checkout ID' };
  }

  if (gameState.checkout.status !== 'open') {
    return { success: false, error: 'Checkout er ikke åpen' };
  }

  gameState.checkout.status = 'canceled';
  return { success: true };
}

export function setGameMode(mode: GameMode): { success: boolean; error?: string } {
  if (gameState.phase !== 'lobby') {
    return { success: false, error: 'Kan bare endre modus i lobbyen' };
  }
  gameState.gameMode = mode;
  return { success: true };
}

function generateToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getRandomAvatarId(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)].id;
}

export function addPlayer(name: string): { success: boolean; error?: string; token?: string; name?: string; avatarId?: string } {
  const trimmedName = name.trim();

  if (!trimmedName) return { success: false, error: 'Navn kan ikke være tomt' };
  if (gameState.players.length >= MAX_PLAYERS) return { success: false, error: `Maks ${MAX_PLAYERS} spillere` };

  const nameLower = trimmedName.toLowerCase();
  if (gameState.players.find(p => p.name.toLowerCase() === nameLower)) {
    return { success: false, error: 'Navnet er allerede tatt' };
  }

  if (gameState.phase !== 'lobby') {
    return { success: false, error: 'Spillet har allerede startet' };
  }

  const token = generateToken();
  const avatarId = getRandomAvatarId();
  const player: Player = { name: trimmedName, avatarId };

  tokenMap[token] = player;
  gameState.players.push(player);

  return { success: true, token, name: trimmedName, avatarId };
}

export function removePlayer(token: string): void {
  const playerData = tokenMap[token];
  if (playerData) {
    gameState.players = gameState.players.filter(p => p.name !== playerData.name);
    delete tokenMap[token];
  }
}

export function validateToken(token: string): { valid: boolean; name?: string; avatarId?: string } {
  const playerData = tokenMap[token];
  if (playerData) return { valid: true, name: playerData.name, avatarId: playerData.avatarId };
  return { valid: false };
}

export function getPlayerName(token: string): string | undefined {
  return tokenMap[token]?.name;
}

export function setAvatar(token: string, avatarId: string): { success: boolean; error?: string } {
  const playerData = tokenMap[token];
  if (!playerData) return { success: false, error: 'Ugyldig spiller-token' };

  if (!AVATARS.some(a => a.id === avatarId)) return { success: false, error: 'Ugyldig avatar' };

  playerData.avatarId = avatarId;
  const playerIndex = gameState.players.findIndex(p => p.name === playerData.name);
  if (playerIndex !== -1) gameState.players[playerIndex].avatarId = avatarId;

  return { success: true };
}

export function setSettings(tone: QuestionTone, couplesSafe: boolean): { success: boolean; error?: string } {
  if (gameState.phase !== 'lobby') return { success: false, error: 'Kan bare endre innstillinger i lobbyen' };

  const validTones: QuestionTone[] = ['mild', 'spicy', 'drøy'];
  if (!validTones.includes(tone)) return { success: false, error: 'Ugyldig tone' };

  gameState.selectedTone = tone;
  gameState.couplesSafe = couplesSafe;
  return { success: true };
}

// Smart question selection based on group size
function selectQuestionsForGroupSize(questions: Question[], groupSize: GroupSize): Question[] {
  // For large groups, prefer clearer/more direct questions (spicy/drøy tones)
  // For small groups, allow more subtle/personal questions (mild tones)
  const shuffled = [...questions].sort(() => Math.random() - 0.5);

  if (groupSize === 'large') {
    // Sort to prefer spicy/drøy questions for large groups
    shuffled.sort((a, b) => {
      const scoreA = a.tone === 'drøy' ? 2 : a.tone === 'spicy' ? 1 : 0;
      const scoreB = b.tone === 'drøy' ? 2 : b.tone === 'spicy' ? 1 : 0;
      // Add randomness to prevent deterministic ordering
      return (scoreB - scoreA) + (Math.random() - 0.5) * 0.5;
    });
  } else if (groupSize === 'small') {
    // For small groups, prefer mild questions first (more personal)
    shuffled.sort((a, b) => {
      const scoreA = a.tone === 'mild' ? 2 : a.tone === 'spicy' ? 1 : 0;
      const scoreB = b.tone === 'mild' ? 2 : b.tone === 'spicy' ? 1 : 0;
      return (scoreB - scoreA) + (Math.random() - 0.5) * 0.5;
    });
  }
  // Medium groups get balanced random selection

  return shuffled;
}

export function startGame(questions: Question[]): { success: boolean; error?: string } {
  if (gameState.players.length < MIN_PLAYERS) return { success: false, error: `Trenger minst ${MIN_PLAYERS} spillere` };

  if (gameState.gameMode === '18+' && !is18PlusUnlocked()) {
    return { success: false, error: '18+ må låses opp først' };
  }

  const groupSize = getGroupSize();
  let selectedTexts: string[] = [];

  if (gameState.gameMode === '18+') {
    const adult18Questions = getDefault18PlusQuestions();
    const shuffled = [...adult18Questions].sort(() => Math.random() - 0.5);
    selectedTexts = shuffled.slice(0, 20).map(q => q.text);
  } else {
    let filtered: Question[];
    switch (gameState.selectedTone) {
      case 'mild':
        filtered = questions.filter(q => q.tone === 'mild');
        break;
      case 'spicy':
        filtered = questions.filter(q => q.tone === 'mild' || q.tone === 'spicy');
        break;
      case 'drøy':
        filtered = [...questions];
        break;
      default:
        filtered = questions.filter(q => q.tone === 'mild' || q.tone === 'spicy');
    }

    if (gameState.couplesSafe) filtered = filtered.filter(q => q.risk === 'safe');
    if (filtered.length < 20) return { success: false, error: 'For få spørsmål i denne kombinasjonen' };

    // Apply smart question selection based on group size
    const smartSorted = selectQuestionsForGroupSize(filtered, groupSize);
    selectedTexts = smartSorted.slice(0, 20).map(q => q.text);
  }

  gameState.selectedQuestions = selectedTexts;
  gameState.phase = 'question';
  gameState.currentQuestion = 0;
  gameState.votes = {};
  gameState.questionStartTime = Date.now();
  gameState.lastWinnerName = null;
  gameState.recentWinners = [];
  gameState.recentTargets = {};
  gameState.rerollInfo = null;
  gameState.winsByName = {};
  gameState.totalVotesReceivedByName = {};
  gameState.players.forEach(p => {
    gameState.winsByName[p.name] = 0;
    gameState.totalVotesReceivedByName[p.name] = 0;
  });
  gameState.checkout = null;
  gameState.isPaused = false;
  gameState.pausedAt = null;
  gameState.pauseAccumulatedMs = 0;

  return { success: true };
}

export function submitVote(token: string, votedFor: string): { success: boolean; error?: string } {
  if (gameState.phase !== 'question') return { success: false, error: 'Ikke tid for stemming' };
  if (!tokenMap[token]) return { success: false, error: 'Ugyldig spiller-token' };
  if (gameState.votes[token]) return { success: false, error: 'Du har allerede stemt' };

  const validPlayer = gameState.players.find(p => p.name === votedFor);
  if (!validPlayer) return { success: false, error: 'Ugyldig spiller' };

  gameState.votes[token] = votedFor;
  return { success: true };
}

export interface RevealResult {
  winner: string;
  winnerAvatarId: string;
  percentage: number;
  voteCount: Record<string, number>;
  rerollInfo: RerollInfo | null;
  // For large groups, condensed results
  condensedResults?: {
    top3: Array<{ name: string; avatarId: string; votes: number; percentage: number }>;
    othersVotes: number;
    othersPercentage: number;
  };
}

export function endVoting(): RevealResult {
  gameState.rerollInfo = null;

  const voteCount: Record<string, number> = {};
  gameState.players.forEach(p => voteCount[p.name] = 0);

  Object.values(gameState.votes).forEach(votedFor => {
    if (voteCount[votedFor] !== undefined) {
      voteCount[votedFor]++;
      gameState.totalVotesReceivedByName[votedFor] = (gameState.totalVotesReceivedByName[votedFor] || 0) + 1;
    }
  });

  let maxVotes = 0;
  Object.values(voteCount).forEach(count => {
    if (count > maxVotes) maxVotes = count;
  });

  const topCandidates = Object.entries(voteCount)
    .filter(([, count]) => count === maxVotes)
    .map(([playerName]) => playerName);

  let provisionalWinner = topCandidates[Math.floor(Math.random() * topCandidates.length)];
  let finalWinner = provisionalWinner;

  const totalVotes = Object.values(gameState.votes).length;
  const questionsRemaining = 20 - gameState.currentQuestion - 1;

  if (gameState.lastWinnerName !== null && provisionalWinner === gameState.lastWinnerName && topCandidates.length > 1) {
    const otherCandidates = topCandidates.filter(name => name !== gameState.lastWinnerName);
    if (otherCandidates.length > 0) {
      finalWinner = otherCandidates[Math.floor(Math.random() * otherCandidates.length)];
      gameState.rerollInfo = { reason: 'cooldown', originalWinner: provisionalWinner, finalWinner };
    }
  }

  if (gameState.rerollInfo === null && totalVotes >= 3 && questionsRemaining >= 4) {
    const currentTargetCount = gameState.recentTargets[finalWinner] || 0;
    if (currentTargetCount >= 2) {
      const nearTopCandidates = Object.entries(voteCount)
        .filter(([name, count]) => count === maxVotes - 1 && name !== finalWinner)
        .map(([playerName]) => playerName);

      if (nearTopCandidates.length > 0) {
        const newWinner = nearTopCandidates[Math.floor(Math.random() * nearTopCandidates.length)];
        gameState.rerollInfo = { reason: 'over-targeted', originalWinner: finalWinner, finalWinner: newWinner };
        finalWinner = newWinner;
      }
    }
  }

  gameState.lastWinnerName = finalWinner;
  gameState.recentWinners.push(finalWinner);
  if (gameState.recentWinners.length > 3) gameState.recentWinners.shift();
  gameState.recentTargets[finalWinner] = (gameState.recentTargets[finalWinner] || 0) + 1;
  gameState.winsByName[finalWinner] = (gameState.winsByName[finalWinner] || 0) + 1;

  const winnerPlayer = gameState.players.find(p => p.name === finalWinner);
  const winnerAvatarId = winnerPlayer?.avatarId || AVATARS[0].id;
  const percentage = totalVotes > 0 ? Math.round((maxVotes / totalVotes) * 100) : 0;

  gameState.phase = 'reveal';

  // Create condensed results for large groups
  const groupSize = getGroupSize();
  let condensedResults: RevealResult['condensedResults'] | undefined;

  if (groupSize === 'large') {
    const sorted = Object.entries(voteCount)
      .sort((a, b) => b[1] - a[1]);

    const top3 = sorted.slice(0, 3).map(([name, votes]) => {
      const player = gameState.players.find(p => p.name === name);
      return {
        name,
        avatarId: player?.avatarId || AVATARS[0].id,
        votes,
        percentage: totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0,
      };
    });

    const othersVotes = sorted.slice(3).reduce((sum, [, votes]) => sum + votes, 0);
    const othersPercentage = totalVotes > 0 ? Math.round((othersVotes / totalVotes) * 100) : 0;

    condensedResults = { top3, othersVotes, othersPercentage };
  }

  return { winner: finalWinner, winnerAvatarId, percentage, voteCount, rerollInfo: gameState.rerollInfo, condensedResults };
}

export function nextQuestion(): void {
  gameState.rerollInfo = null;

  if (gameState.currentQuestion >= 19) {
    gameState.phase = 'gameover';
    gameState.isPaused = false;
    gameState.pausedAt = null;
    gameState.pauseAccumulatedMs = 0;
    if (gameState.gameMode === 'standard' && !is18PlusUnlocked()) {
      gameState.showUpsell = true;
    }
    return;
  }

  gameState.currentQuestion++;
  gameState.votes = {};
  gameState.phase = 'question';
  gameState.questionStartTime = Date.now();
  gameState.isPaused = false;
  gameState.pausedAt = null;
  gameState.pauseAccumulatedMs = 0;
}

export function setPhase(phase: GamePhase): void {
  gameState.phase = phase;
  if (phase === 'question') gameState.questionStartTime = Date.now();
}

export function pauseGame(): { success: boolean; error?: string } {
  if (gameState.phase !== 'question' && gameState.phase !== 'reveal') {
    return { success: false, error: 'Kan bare pause under spørsmål eller resultat' };
  }
  if (gameState.isPaused) {
    return { success: false, error: 'Spillet er allerede pauset' };
  }
  gameState.isPaused = true;
  gameState.pausedAt = Date.now();
  return { success: true };
}

export function resumeGame(): { success: boolean; error?: string } {
  if (!gameState.isPaused) {
    return { success: false, error: 'Spillet er ikke pauset' };
  }
  if (gameState.pausedAt !== null) {
    gameState.pauseAccumulatedMs += Date.now() - gameState.pausedAt;
  }
  gameState.isPaused = false;
  gameState.pausedAt = null;
  return { success: true };
}

export function nextQuestionNow(): { success: boolean; error?: string } {
  if (gameState.phase !== 'question' && gameState.phase !== 'reveal') {
    return { success: false, error: 'Kan bare gå til neste spørsmål under spill' };
  }

  gameState.rerollInfo = null;
  gameState.isPaused = false;
  gameState.pausedAt = null;
  gameState.pauseAccumulatedMs = 0;

  if (gameState.currentQuestion >= 19) {
    gameState.phase = 'gameover';
    if (gameState.gameMode === 'standard' && !is18PlusUnlocked()) {
      gameState.showUpsell = true;
    }
    return { success: true };
  }

  gameState.currentQuestion++;
  gameState.votes = {};
  gameState.phase = 'question';
  gameState.questionStartTime = Date.now();
  return { success: true };
}
