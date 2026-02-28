const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Хранилище игр
const games = new Map();
const clients = new Map();

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Checkers Server</title></head>
    <body>
      <h1>✅ Checkers Server Running</h1>
      <p>Games: ${games.size}</p>
      <p>Players: ${clients.size}</p>
    </body>
    </html>
  `);
});

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(clientId, { ws, gameId: null });
  
  console.log('🟢 Client connected:', clientId);
  
  ws.send(JSON.stringify({ type: 'connected', clientId }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📩 Received:', data.type, data);

      switch (data.type) {
        case 'create_game':
          handleCreateGame(clientId, data.side);
          break;
        case 'join_game':
          handleJoinGame(clientId, data.gameId);
          break;
        case 'player_ready':
          handlePlayerReady(clientId, data.gameId, data.ready);
          break;
        case 'start_game':
          handleStartGame(clientId, data.gameId);
          break;
        case 'make_move':
          handleMakeMove(clientId, data);
          break;
        case 'leave_game':
          handleLeaveGame(clientId);
          break;
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

  ws.on('close', () => {
    handleDisconnect(clientId);
  });
});

function handleCreateGame(clientId, side) {
  const client = clients.get(clientId);
  if (!client) return;
  
  let gameId;
  do {
    gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (games.has(gameId));
  
  // Хост получает выбранную сторону, гость - противоположную
  const hostSide = side || 'white';
  const guestSide = hostSide === 'white' ? 'black' : 'white';
  
  const game = {
    id: gameId,
    host: {
      id: clientId,
      side: hostSide,
      ready: false
    },
    guest: null,
    created: Date.now()
  };
  
  games.set(gameId, game);
  client.gameId = gameId;
  
  client.ws.send(JSON.stringify({
    type: 'game_created',
    gameId,
    hostSide: hostSide,
    guestSide: guestSide
  }));
  
  console.log(`✅ Game created: ${gameId} (host: ${hostSide}, guest: ${guestSide})`);
}

function handleJoinGame(clientId, gameId) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const game = games.get(gameId);
  if (!game) {
    client.ws.send(JSON.stringify({ type: 'error', message: 'Game not found' }));
    return;
  }
  
  if (game.guest) {
    client.ws.send(JSON.stringify({ type: 'error', message: 'Game is full' }));
    return;
  }
  
  // Гость получает противоположную сторону
  const guestSide = game.host.side === 'white' ? 'black' : 'white';
  
  game.guest = {
    id: clientId,
    side: guestSide,
    ready: false
  };
  
  client.gameId = gameId;
  
  // Уведомляем хоста
  const hostClient = clients.get(game.host.id);
  if (hostClient) {
    hostClient.ws.send(JSON.stringify({
      type: 'player_joined',
      guestId: clientId
    }));
  }
  
  // Уведомляем гостя
  client.ws.send(JSON.stringify({
    type: 'game_joined',
    gameId,
    hostSide: game.host.side,
    guestSide: guestSide
  }));
  
  console.log(`✅ Guest joined: ${gameId} (guest: ${guestSide})`);
}

function handlePlayerReady(clientId, gameId, ready) {
  const game = games.get(gameId);
  if (!game) return;
  
  const isHost = game.host.id === clientId;
  
  if (isHost) {
    game.host.ready = ready;
  } else if (game.guest && game.guest.id === clientId) {
    game.guest.ready = ready;
  }
  
  // Уведомляем другого игрока
  const otherId = isHost ? game.guest?.id : game.host.id;
  const otherClient = clients.get(otherId);
  
  if (otherClient) {
    otherClient.ws.send(JSON.stringify({
      type: 'player_ready',
      role: isHost ? 'host' : 'guest',
      ready
    }));
  }
  
  console.log(`✅ Player ready: ${gameId} (${isHost ? 'host' : 'guest'}): ${ready}`);
}

function handleStartGame(clientId, gameId) {
  const game = games.get(gameId);
  if (!game) return;
  
  // Только хост может начать игру
  if (game.host.id !== clientId) return;
  
  // Проверяем, что гость готов
  if (!game.guest || !game.guest.ready) return;
  
  const hostClient = clients.get(game.host.id);
  const guestClient = clients.get(game.guest.id);
  
  // Отправляем обоим игрокам информацию для старта
  if (hostClient) {
    hostClient.ws.send(JSON.stringify({
      type: 'game_started',
      playerRole: 'host',
      playerColor: game.host.side === 'white' ? 1 : 2,
      opponentName: 'Гость',
      opponentColor: game.guest.side === 'white' ? 1 : 2
    }));
  }
  
  if (guestClient) {
    guestClient.ws.send(JSON.stringify({
      type: 'game_started',
      playerRole: 'guest',
      playerColor: game.guest.side === 'white' ? 1 : 2,
      opponentName: 'Хост',
      opponentColor: game.host.side === 'white' ? 1 : 2
    }));
  }
  
  console.log(`🎮 Game started: ${gameId}`);
}

function handleMakeMove(clientId, data) {
  const { gameId, move, board, currentPlayer } = data;
  const game = games.get(gameId);
  if (!game) return;
  
  const targetId = game.host.id === clientId ? game.guest?.id : game.host.id;
  const targetClient = clients.get(targetId);
  
  if (targetClient) {
    targetClient.ws.send(JSON.stringify({
      type: 'opponent_move',
      move,
      board,
      currentPlayer
    }));
  }
}

function handleLeaveGame(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.gameId) return;
  
  const game = games.get(client.gameId);
  if (!game) return;
  
  const otherId = game.host.id === clientId ? game.guest?.id : game.host.id;
  const otherClient = clients.get(otherId);
  
  if (otherClient) {
    otherClient.ws.send(JSON.stringify({ type: 'opponent_left' }));
  }
  
  games.delete(client.gameId);
  client.gameId = null;
}

function handleDisconnect(clientId) {
  handleLeaveGame(clientId);
  clients.delete(clientId);
  console.log('🔴 Client disconnected:', clientId);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});