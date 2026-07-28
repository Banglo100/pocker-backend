import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import PokerTable from './components/PokerTable';

const socket = io('https://pokerbackend-kgrez99z.b4a.run/', {
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  timeout: 10000,
});

// Generate or retrieve persistent userId
let userId = localStorage.getItem('userId');
if (!userId) {
  userId = 'user-' + Math.random().toString(36).substring(2, 15);
  localStorage.setItem('userId', userId);
}

function LoadingScreen({ connectionStatus, connectError, onRetry }) {
  if (connectionStatus === 'error') {
    return (
      <div className="d-flex flex-col h-full w-full items-center justify-center p-4" style={{ background: 'var(--bg-color)', zIndex: 9999, minHeight: '100vh' }}>
        <div className="glass d-flex flex-col items-center text-center" style={{ padding: '2.5rem', borderRadius: '16px', maxWidth: '480px', width: '90%', border: '1px solid var(--danger)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Backend Host Failed</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.95rem' }}>
            Unable to establish connection to backend server:
            <br />
            <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block', marginTop: '0.5rem', wordBreak: 'break-all' }}>
              https://pokerbackend-kgrez99z.b4a.run/
            </code>
          </p>
          {connectError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem', width: '100%', wordBreak: 'break-word' }}>
              Details: {connectError}
            </div>
          )}
          <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1.5rem', lineHeight: '1.4' }}>
            Note: Back4App free tier containers spin down when idle and can take up to 60 seconds to start up.
          </p>
          <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
            <button className="primary" onClick={onRetry} style={{ flex: 1, padding: '0.75rem' }}>
              🔄 Retry Connection
            </button>
            <button className="secondary" onClick={() => window.location.reload()} style={{ flex: 1, padding: '0.75rem' }}>
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-col h-full w-full items-center justify-center" style={{ background: 'var(--bg-color)', zIndex: 9999, minHeight: '100vh' }}>
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
  const [connectionStatus, setConnectionStatus] = useState(socket.connected ? 'connected' : 'connecting');
  const [connectError, setConnectError] = useState('');

  const [stats, setStats] = useState(() => {
    return {
      totalHandsPlayed: Number(localStorage.getItem('stats_totalHandsPlayed') || 0),
      handsWon: Number(localStorage.getItem('stats_handsWon') || 0),
      totalChipsWon: Number(localStorage.getItem('stats_totalChipsWon') || 0),
      biggestPotWon: Number(localStorage.getItem('stats_biggestPotWon') || 0),
    };
  });

  // Block Web Inspector & Developer Tools shortcuts
  useEffect(() => {
    const disableContextMenu = (e) => e.preventDefault();
    const disableDevToolsKeys = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
        (e.metaKey && (e.key === 'U' || e.key === 'u'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener('contextmenu', disableContextMenu);
    document.addEventListener('keydown', disableDevToolsKeys);

    return () => {
      document.removeEventListener('contextmenu', disableContextMenu);
      document.removeEventListener('keydown', disableDevToolsKeys);
    };
  }, []);

  const retryConnect = useCallback(() => {
    setConnectionStatus('connecting');
    setConnectError('');
    socket.connect();
  }, []);

  useEffect(() => {
    // 12 second connection fallback timer
    const connectionTimer = setTimeout(() => {
      if (!socket.connected) {
        setConnectionStatus('error');
        setConnectError('Backend host timed out. Server might be sleeping or unreachable.');
      }
    }, 12000);

    const onConnect = () => {
      clearTimeout(connectionTimer);
      setConnected(true);
      setConnectionStatus('connected');
      setConnectError('');
      socket.emit('getRooms');

      // Attempt to rejoin if we were already in a room
      const savedRoomId = localStorage.getItem('currentRoomId');
      if (savedRoomId && nickname) {
        socket.emit('joinRoom', { roomId: savedRoomId, playerName: nickname, userId });
      }
    };

    const onConnectError = (err) => {
      clearTimeout(connectionTimer);
      setConnected(false);
      setConnectionStatus('error');
      setConnectError(err?.message || 'Failed to connect to backend server');
    };

    const onDisconnect = () => {
      setConnected(false);
      setConnectionStatus('error');
      setConnectError('Disconnected from server');
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);

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
      clearTimeout(connectionTimer);
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
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

  if (!connected || connectionStatus !== 'connected') {
    return <LoadingScreen connectionStatus={connectionStatus} connectError={connectError} onRetry={retryConnect} />;
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
