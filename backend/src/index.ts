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

  socket.on('createRoom', ({ roomId, settings, playerName }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = createRoom(roomId, settings);
    }
    const player: Player = {
      id: socket.id,
      name: playerName,
      chips: settings.startingChips,
      bet: 0,
      folded: false,
      acted: false,
      cards: [],
      isBot: false
    };
    joinRoom(rooms[roomId], player);
    socket.join(roomId);
    emitToRoom(roomId);
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    if (rooms[roomId]) {
      const player: Player = {
        id: socket.id,
        name: playerName,
        chips: rooms[roomId].settings.startingChips,
        bet: 0,
        folded: false,
        acted: false,
        cards: [],
        isBot: false
      };
      if (joinRoom(rooms[roomId], player)) {
        socket.join(roomId);
        emitToRoom(roomId);
      } else {
        socket.emit('error', 'Cannot join room');
      }
    }
  });

  socket.on('addBot', ({ roomId, difficulty }) => {
    if (rooms[roomId]) {
      const player: Player = {
        id: `bot-${Math.random().toString(36).substring(7)}`,
        name: `${difficulty} Bot`,
        chips: rooms[roomId].settings.startingChips,
        bet: 0,
        folded: false,
        acted: false,
        cards: [],
        isBot: true,
        botDifficulty: difficulty
      };
      if (joinRoom(rooms[roomId], player)) {
        emitToRoom(roomId);
      }
    }
  });

  socket.on('startGame', ({ roomId }) => {
    if (rooms[roomId]) {
      startGame(rooms[roomId]);
      emitToRoom(roomId);
      checkBotTurn(rooms[roomId]);
    }
  });

  socket.on('action', ({ roomId, action, amount }) => {
    if (rooms[roomId]) {
      const success = handleAction(rooms[roomId], socket.id, action, amount);
      if (success) {
        emitToRoom(roomId);
        checkBotTurn(rooms[roomId]);
      }
    }
  });

  socket.on('disconnect', () => {
    // Handle disconnect by folding player if in game
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (!room) continue;
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        if (room.state === 'lobby') {
           room.players.splice(playerIndex, 1);
        } else {
           handleAction(room, socket.id, 'fold');
        }
        emitToRoom(roomId);
        checkBotTurn(room);
      }
    }
  });
});

function emitToRoom(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;
  
  // We send the room state to each player, sanitizing cards of other players
  const clients = io.sockets.adapter.rooms.get(roomId);
  if (clients) {
    for (const clientId of clients) {
      const sanitized = JSON.parse(JSON.stringify(room));
      if (sanitized.state !== 'showdown') {
        for (const p of sanitized.players) {
          if (p.id !== clientId && !p.isBot) {
            p.cards = []; // Hide cards for other human players
          }
        }
      }
      io.to(clientId).emit('roomUpdate', sanitized);
    }
  }
}

function checkBotTurn(room: Room) {
  if (room.state === 'showdown' || room.state === 'lobby') return;
  const currentPlayer = room.players[room.currentTurnIndex];
  if (currentPlayer && currentPlayer.isBot) {
    setTimeout(() => {
      if (room.players[room.currentTurnIndex]?.id === currentPlayer.id) {
        const { action, amount } = getBotAction(room, currentPlayer);
        handleAction(room, currentPlayer.id, action, amount);
        emitToRoom(room.id);
        checkBotTurn(room);
      }
    }, 1500);
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
