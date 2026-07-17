import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { Room, Player } from './types';
import { createRoom, joinRoom, startGame, handleAction } from './game';
import { getBotAction } from './bot';

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

const rooms: Record<string, Room> = {};

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  socket.emit('roomsList', getPublicRooms());

  socket.on('getRooms', () => {
    socket.emit('roomsList', getPublicRooms());
  });

  socket.on('createRoom', ({ roomId, roomName, isPrivate, password, settings, playerName, userId }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = createRoom(roomId, socket.id, roomName || roomId, isPrivate, password, settings);
    }
    const player: Player = {
      id: socket.id,
      userId,
      name: playerName,
      chips: settings.startingChips,
      bet: 0,
      folded: false,
      acted: false,
      cards: [],
      isBot: false,
      showHand: false,
      connected: true
    };
    joinRoom(rooms[roomId], player);
    socket.join(roomId);
    emitToRoom(roomId);
    io.emit('roomsList', getPublicRooms());
  });

  socket.on('joinRoom', ({ roomId, playerName, password, userId }) => {
    const room = rooms[roomId];
    if (room) {
      if (room.isPrivate && room.password !== password) {
        socket.emit('error', 'Incorrect password');
        return;
      }
      const player: Player = {
        id: socket.id,
        userId,
        name: playerName,
        chips: room.settings.startingChips,
        bet: 0,
        folded: false,
        acted: false,
        cards: [],
        isBot: false,
        showHand: false,
        connected: true
      };
      if (joinRoom(room, player)) {
        socket.join(roomId);
        emitToRoom(roomId);
      } else {
        socket.emit('error', 'Cannot join room');
      }
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('addBot', ({ roomId, difficulty }) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
      const player: Player = {
        id: `bot-${Math.random().toString(36).substring(7)}`,
        name: `${difficulty} Bot`,
        chips: room.settings.startingChips,
        bet: 0,
        folded: false,
        acted: false,
        cards: [],
        isBot: true,
        botDifficulty: difficulty,
        showHand: false,
        connected: true
      };
      if (joinRoom(room, player)) {
        emitToRoom(roomId);
      }
    }
  });

  socket.on('removeBot', ({ roomId, botId }) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
      const idx = room.players.findIndex(p => p.id === botId);
      if (idx !== -1) {
        if (room.state !== 'lobby' && room.state !== 'results') {
          handleAction(room, botId, 'fold');
        }
        room.players.splice(idx, 1);
        emitToRoom(roomId);
        checkBotTurn(room);
      }
    }
  });

  socket.on('startGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
      if (startGame(room)) {
        emitToRoom(roomId);
        checkBotTurn(room);
      } else {
        socket.emit('error', 'Not enough active players (min 2).');
      }
    }
  });

  socket.on('playAgain', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
      room.state = 'lobby';
      room.chipHistory = [];
      room.players.forEach(p => {
        p.chips = room.settings.startingChips;
        p.cards = [];
        p.bet = 0;
        p.folded = false;
        p.acted = false;
        p.showHand = false;
      });
      emitToRoom(roomId);
    }
  });

  socket.on('destroyRoom', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
      io.to(roomId).emit('error', 'Room destroyed');
      delete rooms[roomId];
      io.emit('roomsList', getPublicRooms());
    }
  });

  socket.on('endMatch', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
      room.state = 'results';
      emitToRoom(roomId);
    }
  });

  socket.on('action', ({ roomId, action, amount }) => {
    const room = rooms[roomId];
    if (room) {
      const prevState = room.state as string;
      const success = handleAction(room, socket.id, action, amount);
      if (success) {
        emitToRoom(roomId);
        
        if (room.state === 'showdown' && prevState !== 'showdown') {
          handleShowdownEnd(room);
        } else {
          checkBotTurn(room);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (!room) continue;
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.connected = false;
        player.disconnectTime = Date.now();
        emitToRoom(roomId);
      }
    }
  });
});

function handleShowdownEnd(room: Room) {
  // Show everyone's hand at showdown
  for (const p of room.players) {
    if (!p.isSpectator) {
      p.showHand = true;
    }
  }
  emitToRoom(room.id);

  setTimeout(() => {
    if (room.state === 'showdown') {
      const canStart = startGame(room);
      if (canStart) {
        emitToRoom(room.id);
        checkBotTurn(room);
      } else {
        room.state = 'results';
        emitToRoom(room.id);
      }
    }
  }, 5000);
}

function emitToRoom(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;
  
  const clients = io.sockets.adapter.rooms.get(roomId);
  if (clients) {
    for (const clientId of clients) {
      const pMatch = room.players.find(p => p.id === clientId);
      if (pMatch && pMatch.userId) {
        const updates = room.pendingStatUpdates.filter(u => u.userId === pMatch.userId);
        updates.forEach(u => io.to(clientId).emit('statUpdate', u));
      }

      const sanitized = JSON.parse(JSON.stringify(room));
      if (sanitized.state !== 'showdown') {
        for (const p of sanitized.players) {
          if (p.id !== clientId && !p.showHand) {
            p.cards = [];
          }
        }
      } else {
        for (const p of sanitized.players) {
           if (p.folded && !p.showHand) {
             p.cards = [];
           }
        }
      }
      io.to(clientId).emit('roomUpdate', sanitized);
    }
  }
  room.pendingStatUpdates = [];
}

function checkBotTurn(room: Room) {
  if (room.state === 'showdown' || room.state === 'lobby' || room.state === 'results') return;
  
  // Auto-end match if only bots remain (and human players lost all money or disconnected)
  const humanPlayersPlaying = room.players.filter(p => !p.isBot && !p.isSpectator && p.chips > 0 && p.connected).length;
  if (humanPlayersPlaying === 0 && room.players.filter(p => !p.isBot).length > 0) {
    room.state = 'results';
    emitToRoom(room.id);
    return;
  }

  const currentPlayer = room.players[room.currentTurnIndex];
  if (currentPlayer && currentPlayer.isBot) {
    setTimeout(() => {
      if (room.players[room.currentTurnIndex]?.id === currentPlayer.id) {
        const { action, amount } = getBotAction(room, currentPlayer);
        const prevState = room.state as string;
        handleAction(room, currentPlayer.id, action, amount);
        emitToRoom(room.id);
        
        if (room.state === 'showdown' && prevState !== 'showdown') {
          handleShowdownEnd(room);
        } else {
          checkBotTurn(room);
        }
      }
    }, 1500);
  }
}

function getPublicRooms() {
  return Object.values(rooms).map(r => ({
    id: r.id,
    name: r.name,
    isPrivate: r.isPrivate,
    playersCount: r.players.filter(p => p.connected).length,
    maxPlayers: r.settings.maxPlayers,
    state: r.state
  }));
}

// Global Maintenance Loop: Timers, Bot Takeovers, Garbage Collection
setInterval(() => {
  const now = Date.now();
  for (const roomId in rooms) {
    const room = rooms[roomId];
    
    // 1. Garbage Collection (5 mins)
    const activeHumans = room.players.filter(p => !p.isBot && p.connected).length;
    if (activeHumans === 0) {
      if (!room.emptySince) {
        room.emptySince = now;
      } else if (now - room.emptySince > 5 * 60 * 1000) {
        delete rooms[roomId];
        io.emit('roomsList', getPublicRooms());
        continue;
      }
    } else {
      room.emptySince = undefined;
    }

    // 2. Disconnect Bot Takeover (10s)
    for (const p of room.players) {
      if (!p.isBot && !p.connected && p.disconnectTime) {
        if (now - p.disconnectTime > 10000) {
          p.isBot = true;
          p.botDifficulty = 'medium';
          p.disconnectTime = undefined;
          emitToRoom(room.id);
          checkBotTurn(room);
        }
      }
    }

    // 3. Turn Timers (Auto-fold)
    if (room.state === 'lobby' || room.state === 'showdown' || room.state === 'results') continue;
    const player = room.players[room.currentTurnIndex];
    if (player && !player.isBot && room.turnStartTime) {
      const elapsed = (now - room.turnStartTime) / 1000;
      if (elapsed > room.settings.turnTimer) {
        const prevState = room.state as string;
        handleAction(room, player.id, 'fold');
        emitToRoom(room.id);
        if ((room.state as string) === 'showdown' && prevState !== 'showdown') {
          handleShowdownEnd(room);
        } else {
          checkBotTurn(room);
        }
      }
    }
  }
}, 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
