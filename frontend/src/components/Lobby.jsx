import { useState } from 'react';

function Lobby({ nickname, setNickname, onCreate, onJoin }) {
  const [roomId, setRoomId] = useState('');
  
  // Customization settings
  const [startingChips, setStartingChips] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(10);
  const [bigBlind, setBigBlind] = useState(20);
  const [maxPlayers, setMaxPlayers] = useState(8);

  const handleCreate = () => {
    const id = roomId.trim() || Math.random().toString(36).substring(7);
    onCreate(id, {
      startingChips: Number(startingChips),
      smallBlind: Number(smallBlind),
      bigBlind: Number(bigBlind),
      maxPlayers: Number(maxPlayers)
    });
  };

  return (
    <div className="d-flex flex-col items-center justify-center w-full" style={{ flex: 1 }}>
      <div className="glass" style={{ padding: '3rem', width: '100%', maxWidth: '600px' }}>
        <h1 className="text-center" style={{ textAlign: 'center', marginBottom: '2rem' }}>Poker Night</h1>
        
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Your Nickname</label>
          <input 
            type="text" 
            placeholder="Enter nickname" 
            value={nickname} 
            onChange={(e) => setNickname(e.target.value)} 
          />
        </div>

        <div className="d-flex gap-4" style={{ marginBottom: '2rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Room ID to Join</label>
            <input 
              type="text" 
              placeholder="e.g. room-123" 
              value={roomId} 
              onChange={(e) => setRoomId(e.target.value)} 
            />
          </div>
          <div className="d-flex items-center" style={{ marginTop: '1.5rem' }}>
            <button onClick={() => onJoin(roomId)}>Join Room</button>
          </div>
        </div>

        <hr style={{ borderColor: 'var(--panel-border)', margin: '2rem 0' }} />
        
        <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Or Create Custom Room</h3>
        
        <div className="d-flex flex-col gap-4">
          <div className="d-flex gap-4">
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Starting Chips</label>
              <input type="number" value={startingChips} onChange={(e) => setStartingChips(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Max Players</label>
              <input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
            </div>
          </div>
          <div className="d-flex gap-4">
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Small Blind</label>
              <input type="number" value={smallBlind} onChange={(e) => setSmallBlind(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Big Blind</label>
              <input type="number" value={bigBlind} onChange={(e) => setBigBlind(e.target.value)} />
            </div>
          </div>
          
          <button className="success" onClick={handleCreate} style={{ marginTop: '1rem' }}>Create & Join Room</button>
        </div>
      </div>
    </div>
  );
}

export default Lobby;
