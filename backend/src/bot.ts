import { Room, Player } from './types';

export function getBotAction(room: Room, player: Player): { action: 'fold'|'call'|'raise', amount?: number } {
  const toCall = room.currentBet - player.bet;

  if (player.botDifficulty === 'easy') {
    const rand = Math.random();
    if (rand < 0.2 && toCall > 0) {
      return { action: 'fold' };
    } else if (rand < 0.8 || player.chips <= toCall) {
      return { action: 'call' };
    } else {
      return { action: 'raise', amount: room.currentBet + room.settings.bigBlind * 2 };
    }
  } 
  
  if (player.botDifficulty === 'medium') {
    if (toCall > player.chips * 0.4) {
      return { action: 'fold' };
    }
    const rand = Math.random();
    if (rand < 0.2) {
       return { action: 'raise', amount: room.currentBet + room.settings.bigBlind * 3 };
    }
    return { action: 'call' };
  } 
  
  // hard
  // For a basic hard implementation without doing full monte carlo simulation:
  // We'll make them aggressive
  const rand = Math.random();
  if (toCall > player.chips * 0.8 && rand < 0.5) {
    return { action: 'fold' };
  }
  if (rand < 0.3) {
    return { action: 'raise', amount: room.currentBet + room.settings.bigBlind * 4 };
  }
  return { action: 'call' };
}
