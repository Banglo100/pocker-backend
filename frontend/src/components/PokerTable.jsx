import { useState, useEffect } from 'react';
import classNames from 'classnames';
import ResultsChart from './ResultsChart';

function Card({ card, hidden }) {
  if (hidden || !card) {
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

function TimerBar({ turnStartTime, durationSeconds }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!turnStartTime) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - turnStartTime) / 1000;
      const remaining = Math.max(0, durationSeconds - elapsed);
      setProgress((remaining / durationSeconds) * 100);
    }, 100);
    return () => clearInterval(interval);
  }, [turnStartTime, durationSeconds]);

  return (
    <div className="timer-bar-container">
      <div className="timer-bar" style={{ width: `${progress}%`, backgroundColor: progress > 25 ? '#10b981' : '#ef4444' }}></div>
    </div>
  );
}

function PokerTable({ room, socketId, userId, onLeave, onAddBot, onRemoveBot, onStart, onEndMatch, onAction, onPlayAgain, onDestroyRoom }) {
  const [raiseAmount, setRaiseAmount] = useState(room.currentBet + room.settings.bigBlind);

  if (room.state === 'results') {
    return <ResultsChart room={room} socketId={socketId} onLeave={onLeave} onPlayAgain={onPlayAgain} onDestroyRoom={onDestroyRoom} />;
  }

  const me = room.players.find(p => p.id === socketId || p.userId === userId);
  const myTurn = room.players[room.currentTurnIndex]?.id === me?.id && room.state !== 'showdown' && room.state !== 'lobby';
  const toCall = me ? (room.currentBet - me.bet) : 0;
  const isHost = room.hostId === socketId;

  return (
    <div className="d-flex flex-col h-full w-full" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      
      {/* Top Header Bar */}
      <div className="poker-header d-flex justify-between items-center">
        <div>
          <h2 className="room-title">Room: {room.name} {room.isPrivate ? '🔒' : ''}</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Blinds: {room.settings.smallBlind}/{room.settings.bigBlind}</span>
        </div>

        {/* Lobby Bot Controls */}
        {room.state === 'lobby' && (
          <div className="lobby-controls d-flex justify-center items-center gap-2">
            {isHost ? (
              <>
                <button className="bot-btn" onClick={() => onAddBot('easy')}>+ Easy Bot</button>
                <button className="bot-btn" onClick={() => onAddBot('medium')}>+ Medium Bot</button>
                <button className="bot-btn" onClick={() => onAddBot('hard')}>+ Hard Bot</button>
                <button className="success start-btn" onClick={onStart}>▶ Start Game</button>
              </>
            ) : (
              <span className="glass" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: '#fbbf24' }}>
                Waiting for host to start...
              </span>
            )}
          </div>
        )}

        <div className="d-flex gap-2 items-center">
          {isHost && room.state !== 'lobby' && (
            <button className="danger" onClick={onEndMatch} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>End Match</button>
          )}
          <button className="danger" onClick={onLeave} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Leave Room</button>
        </div>
      </div>

      {/* Winners Display */}
      {room.winners && room.state === 'showdown' && (
        <div className="d-flex justify-center" style={{ zIndex: 45, position: 'absolute', top: '90px', width: '100%' }}>
          <div className="glass winner-announcement" style={{ padding: '1rem 2rem', background: 'rgba(16, 185, 129, 0.25)', border: '1px solid #10b981', textAlign: 'center' }}>
            <h3>Winners</h3>
            {room.winners.map((w, i) => (
              <div key={i}>
                <strong>{w.player.name}</strong> wins {w.amount} with {w.handName}
              </div>
            ))}
            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>Next hand starting soon...</p>
          </div>
        </div>
      )}

      {/* Main Table Area Wrapper */}
      <div className="poker-table-wrapper">
        <div className="poker-table">
          {/* Community Cards */}
          <div className="community-cards">
            {room.communityCards.map((c, i) => <Card key={i} card={c} />)}
          </div>
          
          {/* Pot */}
          <div className="pot-display glass">
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
                {/* Show cards if they are dealt, and either it's my cards, they showed hand, it's showdown, or they are just placeholders for opponents */}
                {(!p.folded || p.showHand) && room.state !== 'lobby' && !p.isSpectator && (
                  <>
                    <Card card={p.cards[0]} hidden={!p.cards[0]} />
                    <Card card={p.cards[1]} hidden={!p.cards[1]} />
                  </>
                )}
              </div>
              
              <div className={classNames('player-info', { active: isCurrentTurn, folded: p.folded, spectator: p.isSpectator })}>
                {isDealer && <div className="dealer-button">D</div>}
                {isCurrentTurn && <TimerBar turnStartTime={room.turnStartTime} durationSeconds={room.settings.turnTimer} />}
                <div className="player-name">
                  {p.name} {p.isBot ? '🤖' : ''}
                  {isHost && p.isBot && (
                    <button className="danger" onClick={(e) => { e.stopPropagation(); onRemoveBot(p.id); }} style={{ padding: '0.1rem 0.3rem', fontSize: '0.6rem', marginLeft: '0.5rem', borderRadius: '4px' }}>X</button>
                  )}
                </div>
                
                {p.isSpectator ? (
                  <div className="player-chips" style={{ color: '#f59e0b' }}>Spectating</div>
                ) : !p.connected && !p.isBot ? (
                  <div className="player-chips" style={{ color: '#ef4444' }}>Disconnected</div>
                ) : (
                  <div className="player-chips">{p.chips}</div>
                )}

                {p.showHand && <div className="show-hand-badge">Showing Hand</div>}
                {p.folded && !p.showHand && <div className="status-badge">Folded</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>

      {/* Action History Log */}
      <div className="glass action-log">
        <h4 style={{ marginBottom: '0.5rem' }}>Game Log</h4>
        {room.actionHistory.slice().reverse().map((msg, i) => (
          <p key={i}>{msg}</p>
        ))}
      </div>

      {/* Action Bar (Only if playing and it's my turn, OR if I can show hand) */}
      {me && !me.isSpectator && (
        <div className="action-bar-container">
          {myTurn && !me.folded && (
            <div className="action-bar glass">
              <button className="danger action-btn" onClick={() => onAction('fold')}>Fold</button>
              <button className="action-btn" onClick={() => onAction('call')}>
                {toCall > 0 ? `Call ${toCall}` : 'Check'}
              </button>
              
              <div className="d-flex items-center gap-2 raise-controls">
                <button className="success action-btn" onClick={() => onAction('raise', raiseAmount)} disabled={raiseAmount <= room.currentBet && raiseAmount < me.chips + me.bet}>
                  Raise to {raiseAmount}
                </button>
                <input 
                  type="range" 
                  min={room.currentBet + room.settings.bigBlind} 
                  max={me.chips + me.bet} 
                  value={raiseAmount} 
                  onChange={(e) => setRaiseAmount(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          )}

          {/* Show Hand Button - available if folded or showdown, and not already showing */}
          {(me.folded || room.state === 'showdown') && !me.showHand && room.state !== 'lobby' && (
            <div className="action-bar glass" style={{ justifyContent: 'center' }}>
              <button className="action-btn" onClick={() => onAction('showHand')}>Show Hand</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PokerTable;
