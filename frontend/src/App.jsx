import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import PokerTable from './components/PokerTable';

const socket = io('https://pokerbackend-kgrez99z.b4a.run');

// Generate or retrieve persistent userId
let userId = localStorage.getItem('userId');
if (!userId) {
  userId = 'user-' + Math.random().toString(36).substring(2, 15);
  localStorage.setItem('userId', userId);
}

function LoadingScreen() {
  return (
    <div className="d-flex flex-col h-full w-full items-center justify-center" style={{ background: 'var(--bg-color)', zIndex: 9999 }}>
      <div className="glass d-flex flex-col items-center justify-center" style={{ padding: '3rem', borderRadius: '50%', width: '300px', height: '300px' }}>
        <div className="chip-animation">
          <div className="chip-inner"></div>
        </div>
        <h2 style={{ marginTop: '2rem', animation: 'pulse 1.5s infinite' }}>Connecting...</h2>
      </div>
    </div>
  );
}

function App() {
  const [nickname, setNickname] = useState(localStorage.getItem('nickname') || '');
  const [room, setRoom] = useState(null);
  const [roomsList, setRoomsList] = useState([]);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(socket.connected);

  const [stats, setStats] = useState(() => {
    return {
      totalHandsPlayed: Number(localStorage.getItem('stats_totalHandsPlayed') || 0),
      handsWon: Number(localStorage.getItem('stats_handsWon') || 0),
      totalChipsWon: Number(localStorage.getItem('stats_totalChipsWon') || 0),
      biggestPotWon: Number(localStorage.getItem('stats_biggestPotWon') || 0),
    };
  });

  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('getRooms');

      // Attempt to rejoin if we were already in a room
      const savedRoomId = localStorage.getItem('currentRoomId');
      if (savedRoomId && nickname) {
        socket.emit('joinRoom', { roomId: savedRoomId, playerName: nickname, userId });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('roomsList', (list) => {
      setRoomsList(list);
    });

    socket.on('roomUpdate', (updatedRoom) => {
      setRoom(updatedRoom);
      setError('');
      if (updatedRoom) {
        localStorage.setItem('currentRoomId', updatedRoom.id);
      } else {
        localStorage.removeItem('currentRoomId');
      }
    });

    socket.on('error', (msg) => {
      setError(msg);
      if (msg === 'Room not found' || msg === 'Room destroyed') {
        setRoom(null);
        localStorage.removeItem('currentRoomId');
      }
    });

    const onStatUpdate = (update) => {
      setStats(prev => {
        const next = { ...prev };
        if (update.type === 'handPlayed') {
          next.totalHandsPlayed += 1;
        } else if (update.type === 'handWon') {
          next.handsWon += 1;
          next.totalChipsWon += update.amount || 0;
          if ((update.amount || 0) > next.biggestPotWon) {
            next.biggestPotWon = update.amount;
          }
        }
        localStorage.setItem('stats_totalHandsPlayed', next.totalHandsPlayed);
        localStorage.setItem('stats_handsWon', next.handsWon);
        localStorage.setItem('stats_totalChipsWon', next.totalChipsWon);
        localStorage.setItem('stats_biggestPotWon', next.biggestPotWon);
        return next;
      });
    };
    socket.on('statUpdate', onStatUpdate);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('roomUpdate');
      socket.off('roomsList');
      socket.off('error');
      socket.off('statUpdate');
    };
  }, [nickname]);

  const handleSetNickname = (name) => {
    setNickname(name);
    localStorage.setItem('nickname', name);
  };

  const createRoom = (roomId, roomName, isPrivate, password, settings) => {
    if (!nickname) {
      setError('Please set a nickname first');
      return;
    }
    socket.emit('createRoom', { roomId, roomName, isPrivate, password, settings, playerName: nickname, userId });
  };

  const joinRoom = (roomId, password) => {
    if (!nickname) {
      setError('Please set a nickname first');
      return;
    }
    socket.emit('joinRoom', { roomId, playerName: nickname, password, userId });
  };

  const leaveRoom = () => {
    localStorage.removeItem('currentRoomId');
    socket.emit('leaveRoom', { roomId: room?.id, userId });
    setRoom(null);
  };

  const addBot = (difficulty) => {
    if (room) {
      socket.emit('addBot', { roomId: room.id, difficulty });
    }
  };

  const removeBot = (botId) => {
    if (room) {
      socket.emit('removeBot', { roomId: room.id, botId });
    }
  };

  const startGame = () => {
    if (room) {
      socket.emit('startGame', { roomId: room.id });
    }
  };

  const playAgain = () => {
    if (room) {
      socket.emit('playAgain', { roomId: room.id });
    }
  };

  const destroyRoom = () => {
    if (room) {
      socket.emit('destroyRoom', { roomId: room.id });
    }
  };

  const endMatch = () => {
    if (room) {
      socket.emit('endMatch', { roomId: room.id });
    }
  };

  const takeAction = (action, amount) => {
    if (room) {
      socket.emit('action', { roomId: room.id, action, amount });
    }
  };

  if (!connected) {
    return <LoadingScreen />;
  }

  return (
    <div className="container">
      {error && (
        <div className="glass" style={{ border: '1px solid var(--danger)', padding: '1rem', color: 'var(--danger)', marginBottom: '1rem', position: 'absolute', top: 20, zIndex: 9999, left: '50%', transform: 'translateX(-50%)' }}>
          {error}
          <button className="danger" onClick={() => setError('')} style={{ padding: '0.2rem 0.5rem', marginLeft: '1rem' }}>X</button>
        </div>
      )}

      {!room ? (
        <Lobby
          nickname={nickname}
          setNickname={handleSetNickname}
          roomsList={roomsList}
          stats={stats}
          onCreate={createRoom}
          onJoin={joinRoom}
        />
      ) : (
        <PokerTable
          room={room}
          socketId={socket.id}
          userId={userId}
          onLeave={leaveRoom}
          onAddBot={addBot}
          onRemoveBot={removeBot}
          onStart={startGame}
          onEndMatch={endMatch}
          onAction={takeAction}
          onPlayAgain={playAgain}
          onDestroyRoom={destroyRoom}
        />
      )}
    </div>
  );
}

export default App;
