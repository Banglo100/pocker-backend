import { Room, Player, Card, GameState } from './types';
import { createDeck, shuffleDeck } from './deck';
// @ts-ignore
import * as PokerSolver from 'pokersolver';
const Hand = PokerSolver.Hand;

export function createRoom(id: string, settings: Room['settings']): Room {
  return {
    id,
    settings,
    players: [],
    state: 'lobby',
    pot: 0,
    communityCards: [],
    currentTurnIndex: -1,
    dealerIndex: 0,
    currentBet: 0,
    deck: [],
    actionHistory: []
  };
}

export function joinRoom(room: Room, player: Player): boolean {
  if (room.state !== 'lobby') return false;
  if (room.players.length >= room.settings.maxPlayers) return false;
  room.players.push({ ...player, acted: false });
  return true;
}

export function startGame(room: Room) {
  if (room.players.length < 2) return;
  room.state = 'preflop';
  room.deck = shuffleDeck(createDeck());
  room.communityCards = [];
  room.pot = 0;
  room.currentBet = room.settings.bigBlind;
  room.winners = undefined;
  room.actionHistory = ['Game started.'];

  for (const p of room.players) {
    p.cards = [];
    p.bet = 0;
    p.folded = false;
    p.acted = false;
  }

  // Deal 2 cards each
  for (let i = 0; i < 2; i++) {
    for (const p of room.players) {
      p.cards.push(room.deck.pop()!);
    }
  }

  // Blinds setup
  room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
  let sbIndex = (room.dealerIndex + 1) % room.players.length;
  let bbIndex = (room.dealerIndex + 2) % room.players.length;
  
  if (room.players.length === 2) {
    sbIndex = room.dealerIndex;
    bbIndex = (room.dealerIndex + 1) % room.players.length;
  }

  const sbPlayer = room.players[sbIndex];
  const bbPlayer = room.players[bbIndex];
  if (!sbPlayer || !bbPlayer) return;

  const actualSb = Math.min(sbPlayer.chips, room.settings.smallBlind);
  sbPlayer.chips -= actualSb;
  sbPlayer.bet = actualSb;
  
  const actualBb = Math.min(bbPlayer.chips, room.settings.bigBlind);
  bbPlayer.chips -= actualBb;
  bbPlayer.bet = actualBb;

  room.currentTurnIndex = (bbIndex + 1) % room.players.length;
}

export function nextTurn(room: Room) {
  const activePlayers = room.players.filter(p => !p.folded && p.chips > 0);
  const unactedPlayers = room.players.filter(p => !p.folded && p.chips > 0 && (!p.acted || p.bet < room.currentBet));
  
  // if everyone folded except one
  if (room.players.filter(p => !p.folded).length === 1) {
    endGame(room);
    return;
  }
  
  if (unactedPlayers.length === 0 || activePlayers.length <= 1) {
    // Round is over
    for (const p of room.players) {
      room.pot += p.bet;
      p.bet = 0;
      p.acted = false; // reset for next round
    }
    room.currentBet = 0;

    if (room.state === 'preflop') {
      room.state = 'flop';
      room.communityCards.push(room.deck.pop()!, room.deck.pop()!, room.deck.pop()!);
      room.currentTurnIndex = (room.dealerIndex + 1) % room.players.length;
      skipFolded(room);
    } else if (room.state === 'flop') {
      room.state = 'turn';
      room.communityCards.push(room.deck.pop()!);
      room.currentTurnIndex = (room.dealerIndex + 1) % room.players.length;
      skipFolded(room);
    } else if (room.state === 'turn') {
      room.state = 'river';
      room.communityCards.push(room.deck.pop()!);
      room.currentTurnIndex = (room.dealerIndex + 1) % room.players.length;
      skipFolded(room);
    } else if (room.state === 'river') {
      endGame(room);
    } else if (room.state === 'showdown') {
       // Wait for user action to start new game
    }
  } else {
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    skipFolded(room);
  }
}

function skipFolded(room: Room) {
  let count = 0;
  while (room.players[room.currentTurnIndex] && (room.players[room.currentTurnIndex].folded || room.players[room.currentTurnIndex].chips === 0) && count < room.players.length) {
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    count++;
  }
}

export function handleAction(room: Room, playerId: string, action: 'fold' | 'call' | 'raise', amount?: number) {
  const player = room.players[room.currentTurnIndex];
  if (!player || player.id !== playerId) return false;

  player.acted = true;

  if (action === 'fold') {
    player.folded = true;
    room.actionHistory.push(`${player.name} folds.`);
  } else if (action === 'call') {
    const toCall = room.currentBet - player.bet;
    const actualCall = Math.min(player.chips, toCall);
    player.chips -= actualCall;
    player.bet += actualCall;
    room.actionHistory.push(`${player.name} calls ${actualCall}.`);
  } else if (action === 'raise' && amount) {
    const totalToPut = amount; 
    const toAdd = totalToPut - player.bet;
    if (toAdd > 0 && toAdd <= player.chips && totalToPut > room.currentBet) {
      player.chips -= toAdd;
      player.bet += toAdd;
      room.currentBet = totalToPut;
      room.actionHistory.push(`${player.name} raises to ${totalToPut}.`);
      // Reset acted for everyone else who has chips and isn't folded
      for (const p of room.players) {
        if (p.id !== player.id) {
          p.acted = false;
        }
      }
    } else {
      return false; // invalid raise
    }
  }

  nextTurn(room);
  return true;
}

function endGame(room: Room) {
  room.state = 'showdown';
  for (const p of room.players) {
    room.pot += p.bet;
    p.bet = 0;
  }

  const active = room.players.filter(p => !p.folded);
  if (active.length === 1) {
    const winner = active[0]!;
    winner.chips += room.pot;
    room.winners = [{ player: winner, handName: 'Won by default', amount: room.pot }];
    room.actionHistory.push(`${winner.name} won ${room.pot}.`);
  } else {
    const hands = active.map(p => {
      const cards = [...p.cards, ...room.communityCards].map(c => c.replace('T', '10'));
      const solved = Hand.solve(cards);
      return { player: p, solved };
    });

    const solvedHands = hands.map(h => h.solved);
    const winningHands = Hand.winners(solvedHands);
    
    // Find winners using exact object matching if possible, or comparing name/description
    const winners = hands.filter(h => winningHands.some((w: any) => w.descr === h.solved.descr));
    
    const winAmount = Math.floor(room.pot / winners.length);

    room.winners = winners.map(w => {
      w.player.chips += winAmount;
      return { player: w.player, handName: w.solved.name, amount: winAmount };
    });
    room.actionHistory.push(`Showdown: ${room.winners.map(w => w.player.name).join(', ')} won ${winAmount} with ${winners[0].solved.name}.`);
  }
}
