export type Suit = 's' | 'h' | 'd' | 'c';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Card = `${Rank}${Suit}`;

export interface Player {
  id: string;
  name: string;
  chips: number;
  bet: number;
  folded: boolean;
  acted: boolean;
  cards: Card[];
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  isSpectator?: boolean;
  showHand?: boolean;
  userId?: string;
  connected?: boolean;
  disconnectTime?: number;
}

export type GameState = 'lobby' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'results';

export interface Room {
  id: string;
  hostId: string;
  name: string;
  isPrivate: boolean;
  password?: string;
  settings: {
    maxPlayers: number;
    startingChips: number;
    smallBlind: number;
    bigBlind: number;
    turnTimer: number;
  };
  players: Player[];
  state: GameState;
  pot: number;
  communityCards: Card[];
  currentTurnIndex: number;
  dealerIndex: number;
  currentBet: number;
  deck: Card[];
  winners?: { player: Player, handName: string, amount: number }[];
  actionHistory: string[];
  chipHistory: { id: string; name: string; isBot: boolean; history: number[] }[];
  turnStartTime?: number;
  emptySince?: number;
  pendingStatUpdates: { userId: string, type: 'handPlayed' | 'handWon', amount?: number }[];
}
