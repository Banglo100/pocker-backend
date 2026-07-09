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
}

export type GameState = 'lobby' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface Room {
  id: string;
  settings: {
    maxPlayers: number;
    startingChips: number;
    smallBlind: number;
    bigBlind: number;
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
}
