import { useState } from 'react';
import Stats from './Stats';

function Lobby({ nickname, setNickname, roomsList, stats, onCreate, onJoin }) {
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState(`${nickname ? nickname + "'s" : 'My'} Room`);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  
  // Customization settings
  const [startingChips, setStartingChips] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(10);
  const [bigBlind, setBigBlind] = useState(20);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [turnTimer, setTurnTimer] = useState(30);

  const [joinPassword, setJoinPassword] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const handleCreate = () => {
    const id = roomId.trim() || Math.random().toString(36).substring(7);
    onCreate(id, roomName || id, isPrivate, password, {
      startingChips: Number(startingChips),
      smallBlind: Number(smallBlind),
      bigBlind: Number(bigBlind),
      maxPlayers: Number(maxPlayers),
      turnTimer: Number(turnTimer)
    });
  };

  const handleJoinClick = (room) => {
    if (room.isPrivate) {
      setSelectedRoom(room);
    } else {
      onJoin(room.id, '');
    }
  };

  return (
    <div className="d-flex flex-col items-center justify-center w-full" style={{ flex: 1, padding: '1rem' }}>
      {showStats && <Stats stats={stats} onClose={() => setShowStats(false)} />}
      <div className="glass" style={{ padding: '2rem', width: '100%', maxWidth: '800px', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        
        <div style={{ flex: '1 1 300px' }}>
          <div className="d-flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <h1 style={{ margin: 0 }}>Poker Night</h1>
            <button className="success" onClick={() => setShowStats(true)}>My Stats 📊</button>
          </div>
          
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Your Nickname</label>
            <input 
              type="text" 
              placeholder="Enter nickname" 
              value={nickname} 
              onChange={(e) => {
                setNickname(e.target.value);
                if (roomName.includes("'s Room") || roomName === "My Room") {
                  setRoomName(`${e.target.value}'s Room`);
                }
              }} 
            />
          </div>

          <hr style={{ borderColor: 'var(--panel-border)', margin: '2rem 0' }} />
          
          <h3 style={{ marginBottom: '1.5rem' }}>Create Room</h3>
          
          <div className="d-flex flex-col gap-4">
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Room Name</label>
              <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
            </div>
            <div className="d-flex gap-4 items-center">
              <label style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} /> Private Room
              </label>
              {isPrivate && (
                <input type="text" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ flex: 1 }} />
              )}
            </div>
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
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Turn Timer (Seconds)</label>
              <input type="number" value={turnTimer} onChange={(e) => setTurnTimer(e.target.value)} />
            </div>
            
            <button className="success" onClick={handleCreate} style={{ marginTop: '1rem' }}>Create & Join Room</button>
          </div>
        </div>

        <div style={{ flex: '1 1 300px', borderLeft: '1px solid var(--panel-border)', paddingLeft: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Active Lobbies</h3>
          {roomsList.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No active rooms. Create one!</p>
          ) : (
            <div className="d-flex flex-col gap-2">
              {roomsList.map(r => (
                <div key={r.id} className="glass" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{r.name} {r.isPrivate ? '🔒' : ''}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.playersCount}/{r.maxPlayers} Players - {r.state === 'lobby' ? 'Waiting' : 'In Game (Spectate)'}</div>
                  </div>
                  {selectedRoom?.id === r.id ? (
                    <div className="d-flex gap-2">
                      <input type="text" placeholder="Password" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} style={{ width: '100px' }} />
                      <button onClick={() => onJoin(r.id, joinPassword)}>Join</button>
                      <button className="danger" onClick={() => setSelectedRoom(null)}>X</button>
                    </div>
                  ) : (
                    <button onClick={() => handleJoinClick(r)}>Join</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Lobby;
