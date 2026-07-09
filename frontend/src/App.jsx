import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import PokerTable from './components/PokerTable';

const socket = io('http://localhost:3001');

function App() {
  const [nickname, setNickname] = useState(localStorage.getItem('nickname') || '');
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    socket.on('roomUpdate', (updatedRoom) => {
      setRoom(updatedRoom);
      setError('');
    });

    socket.on('error', (msg) => {
      setError(msg);
    });

    return () => {
      socket.off('roomUpdate');
      socket.off('error');
    };
  }, []);

  const handleSetNickname = (name) => {
    setNickname(name);
    localStorage.setItem('nickname', name);
  };

  const createRoom = (roomId, settings) => {
    if (!nickname) {
      setError('Please set a nickname first');
      return;
    }
    socket.emit('createRoom', { roomId, settings, playerName: nickname });
  };

  const joinRoom = (roomId) => {
    if (!nickname) {
      setError('Please set a nickname first');
      return;
    }
    socket.emit('joinRoom', { roomId, playerName: nickname });
  };

  const leaveRoom = () => {
    // Basic leave by reloading or emitting
    window.location.reload();
  };

  const addBot = (difficulty) => {
    if (room) {
      socket.emit('addBot', { roomId: room.id, difficulty });
    }
  };

  const startGame = () => {
    if (room) {
      socket.emit('startGame', { roomId: room.id });
    }
  };

  const takeAction = (action, amount) => {
    if (room) {
      socket.emit('action', { roomId: room.id, action, amount });
    }
  };

  return (
    <div className="container">
      {error && (
        <div className="glass" style={{ border: '1px solid var(--danger)', padding: '1rem', color: 'var(--danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {!room ? (
        <Lobby 
          nickname={nickname} 
          setNickname={handleSetNickname} 
          onCreate={createRoom} 
          onJoin={joinRoom} 
        />
      ) : (
        <PokerTable 
          room={room} 
          socketId={socket.id}
          onLeave={leaveRoom}
          onAddBot={addBot}
          onStart={startGame}
          onAction={takeAction}
        />
      )}
    </div>
  );
}

export default App;
