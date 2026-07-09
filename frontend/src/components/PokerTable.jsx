import { useState } from 'react';
import classNames from 'classnames';

function Card({ card, hidden }) {
  if (hidden) {
    return <div className="playing-card hidden"></div>;
  }
  
  const rank = card[0];
  const suit = card[1];
  
  let suitSymbol = '';
  let isRed = false;
  if (suit === 'h') { suitSymbol = '♥'; isRed = true; }
  if (suit === 'd') { suitSymbol = '♦'; isRed = true; }
  if (suit === 'c') { suitSymbol = '♣'; }
  if (suit === 's') { suitSymbol = '♠'; }

  return (
    <div className={classNames('playing-card animate-deal', { red: isRed })}>
      <div className="card-rank">{rank}</div>
      <div className="card-suit">{suitSymbol}</div>
      <div className="card-rank-bottom">{rank}</div>
    </div>
  );
}

function PokerTable({ room, socketId, onLeave, onAddBot, onStart, onAction }) {
  const [raiseAmount, setRaiseAmount] = useState(room.currentBet + room.settings.bigBlind);

  const me = room.players.find(p => p.id === socketId);
  const myTurn = room.players[room.currentTurnIndex]?.id === socketId && room.state !== 'showdown' && room.state !== 'lobby';
  const toCall = me ? (room.currentBet - me.bet) : 0;

  return (
    <div className="d-flex flex-col h-full w-full" style={{ flex: 1, position: 'relative' }}>
      
      {/* Header Info */}
      <div className="d-flex justify-between items-center" style={{ padding: '1rem' }}>
        <div>
          <h2>Room: {room.id}</h2>
          <span style={{ color: 'var(--text-muted)' }}>Blinds: {room.settings.smallBlind}/{room.settings.bigBlind}</span>
        </div>
        <button className="danger" onClick={onLeave}>Leave Room</button>
      </div>

      {/* Lobby Controls */}
      {room.state === 'lobby' && (
        <div className="d-flex justify-center gap-4" style={{ zIndex: 10 }}>
          <button onClick={() => onAddBot('easy')}>+ Easy Bot</button>
          <button onClick={() => onAddBot('medium')}>+ Medium Bot</button>
          <button onClick={() => onAddBot('hard')}>+ Hard Bot</button>
          <button className="success" onClick={onStart}>Start Game</button>
        </div>
      )}

      {/* Winners Display */}
      {room.winners && room.state === 'showdown' && (
        <div className="d-flex justify-center" style={{ zIndex: 10, position: 'absolute', top: '150px', width: '100%' }}>
          <div className="glass" style={{ padding: '1rem 2rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', textAlign: 'center' }}>
            <h3>Winners</h3>
            {room.winners.map(w => (
              <div key={w.player.id}>
                <strong>{w.player.name}</strong> wins {w.amount} with {w.handName}
              </div>
            ))}
            <button style={{ marginTop: '1rem' }} onClick={onStart}>Next Hand</button>
          </div>
        </div>
      )}

      {/* Table Area */}
      <div className="poker-table">
        {/* Community Cards */}
        <div className="community-cards">
          {room.communityCards.map((c, i) => <Card key={i} card={c} />)}
        </div>
        
        {/* Pot */}
        <div className="pot-display">
          Pot: {room.pot}
        </div>

        {/* Players */}
        {room.players.map((p, index) => {
          const isCurrentTurn = room.currentTurnIndex === index && room.state !== 'showdown' && room.state !== 'lobby';
          const isDealer = room.dealerIndex === index;
          
          return (
            <div key={p.id} className={`seat seat-${index}`}>
              {p.bet > 0 && <div className="player-bet">{p.bet}</div>}
              
              <div className="player-cards">
                {/* Always show 2 cards if not folded and playing, else show nothing */}
                {(!p.folded && room.state !== 'lobby') && (
                  <>
                    <Card card={p.cards[0]} hidden={!p.cards[0]} />
                    <Card card={p.cards[1]} hidden={!p.cards[1]} />
                  </>
                )}
              </div>
              
              <div className={classNames('player-info', { active: isCurrentTurn, folded: p.folded })}>
                {isDealer && <div style={{ position: 'absolute', top: -10, left: -10, background: 'white', color: 'black', borderRadius: '50%', width: 20, height: 20, fontSize: 12, fontWeight: 'bold' }}>D</div>}
                <div className="player-name">{p.name} {p.isBot ? '🤖' : ''}</div>
                <div className="player-chips">{p.chips}</div>
                {p.folded && <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>Folded</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action History Log */}
      <div className="glass action-log" style={{ position: 'absolute', right: 20, top: 80, width: '250px', padding: '1rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Game Log</h4>
        {room.actionHistory.slice().reverse().map((msg, i) => (
          <p key={i}>{msg}</p>
        ))}
      </div>

      {/* Action Bar (Only if playing and it's my turn) */}
      {me && !me.folded && (
        <div className="action-bar">
          <button className="danger" onClick={() => onAction('fold')} disabled={!myTurn}>Fold</button>
          <button onClick={() => onAction('call')} disabled={!myTurn}>
            {toCall > 0 ? `Call ${toCall}` : 'Check'}
          </button>
          
          <div className="d-flex items-center gap-2">
            <button className="success" onClick={() => onAction('raise', raiseAmount)} disabled={!myTurn || raiseAmount <= room.currentBet}>
              Raise to {raiseAmount}
            </button>
            <input 
              type="range" 
              min={room.currentBet + room.settings.bigBlind} 
              max={me.chips + me.bet} 
              value={raiseAmount} 
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              disabled={!myTurn}
              style={{ width: '150px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default PokerTable;
