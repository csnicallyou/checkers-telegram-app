const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

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
  const clientId = Date.now() + Math.random();
  clients.set(clientId, { ws, gameId: null, name: null });
  
  console.log('🟢 Client connected:', clientId);
  
  ws.send(JSON.stringify({ type: 'connected', clientId }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📩 Received:', data.type);

      switch (data.type) {
        case 'create_game':
          handleCreateGame(clientId, data.playerName, data.side);
          break;
        case 'join_game':
          handleJoinGame(clientId, data.playerName, data.gameId);
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
    console.log('🔴 Client disconnected:', clientId);
    handleDisconnect(clientId);
  });
});

function handleCreateGame(clientId, playerName, side) {
  const client = clients.get(clientId);
  if (!client) return;
  
  client.name = playerName;
  
  const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Хост получает выбранную сторону
  const hostSide = side || 'white';
  const guestSide = hostSide === 'white' ? 'black' : 'white';
  
  const game = {
    id: gameId,
    host: {
      id: clientId,
      name: playerName,
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
    guestSide: guestSide,
    playerName: playerName
  }));
  
  console.log(`✅ Game created: ${gameId} by ${playerName} (${hostSide})`);
}

function handleJoinGame(clientId, playerName, gameId) {
  const client = clients.get(clientId);
  if (!client) return;
  
  client.name = playerName;
  
  const game = games.get(gameId);
  if (!game) {
    client.ws.send(JSON.stringify({ type: 'error', message: 'Игра не найдена' }));
    return;
  }
  
  if (game.guest) {
    client.ws.send(JSON.stringify({ type: 'error', message: 'Игра уже заполнена' }));
    return;
  }
  
  // Гость получает противоположную сторону
  const guestSide = game.host.side === 'white' ? 'black' : 'white';
  
  game.guest = {
    id: clientId,
    name: playerName,
    side: guestSide,
    ready: false
  };
  
  client.gameId = gameId;
  
  console.log(`✅ Guest joined: ${gameId} - ${playerName} (${guestSide})`);
  console.log(`   Host: ${game.host.name} (${game.host.side})`);
  
  // Уведомляем хоста о подключении гостя
  const hostClient = clients.get(game.host.id);
  if (hostClient) {
    hostClient.ws.send(JSON.stringify({
      type: 'player_joined',
      guestName: playerName,
      guestSide: guestSide
    }));
    console.log(`📤 Sent player_joined to host: ${game.host.name}`);
  }
  
  // Уведомляем гостя
  client.ws.send(JSON.stringify({
    type: 'game_joined',
    gameId,
    hostName: game.host.name,
    hostSide: game.host.side,
    guestName: playerName,
    guestSide: guestSide
  }));
}

function handlePlayerReady(clientId, gameId, ready) {
  const game = games.get(gameId);
  if (!game) return;
  
  const isHost = game.host.id === clientId;
  
  if (isHost) {
    game.host.ready = ready;
    console.log(`✅ Host ready: ${game.host.name} in ${gameId}`);
  } else if (game.guest && game.guest.id === clientId) {
    game.guest.ready = ready;
    console.log(`✅ Guest ready: ${game.guest.name} in ${gameId}`);
  }
  
  // Уведомляем другого игрока
  const otherId = isHost ? game.guest?.id : game.host.id;
  const otherClient = clients.get(otherId);
  
  if (otherClient) {
    otherClient.ws.send(JSON.stringify({
      type: 'player_ready',
      role: isHost ? 'host' : 'guest',
      playerName: isHost ? game.host.name : game.guest.name,
      ready
    }));
    console.log(`📤 Sent player_ready to ${isHost ? 'guest' : 'host'}`);
  }
}

function handleStartGame(clientId, gameId) {
  const game = games.get(gameId);
  if (!game) {
    console.log(`❌ Game ${gameId} not found`);
    return;
  }
  
  // Только хост может начать игру
  if (game.host.id !== clientId) {
    console.log(`❌ Only host can start game ${gameId}`);
    return;
  }
  
  // Проверяем, что гость есть и готов
  if (!game.guest) {
    console.log(`❌ No guest in game ${gameId}`);
    return;
  }
  
  if (!game.guest.ready) {
    console.log(`❌ Guest not ready in game ${gameId}`);
    return;
  }
  
  const hostClient = clients.get(game.host.id);
  const guestClient = clients.get(game.guest.id);
  
  console.log(`🎮 Starting game ${gameId}`);
  console.log(`   Host: ${game.host.name} (${game.host.side})`);
  console.log(`   Guest: ${game.guest.name} (${game.guest.side})`);
  
  // Отправляем хосту
  if (hostClient) {
    hostClient.ws.send(JSON.stringify({
      type: 'game_started',
      playerRole: 'host',
      playerName: game.host.name,
      playerColor: game.host.side === 'white' ? 1 : 2,
      opponentName: game.guest.name,
      opponentColor: game.guest.side === 'white' ? 1 : 2
    }));
    console.log(`✅ Game start sent to host: ${game.host.name}`);
  }
  
  // Отправляем гостю
  if (guestClient) {
    guestClient.ws.send(JSON.stringify({
      type: 'game_started',
      playerRole: 'guest',
      playerName: game.guest.name,
      playerColor: game.guest.side === 'white' ? 1 : 2,
      opponentName: game.host.name,
      opponentColor: game.host.side === 'white' ? 1 : 2
    }));
    console.log(`✅ Game start sent to guest: ${game.guest.name}`);
  }
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
  
  // Определяем, кто уходит
  const isHost = game.host.id === clientId;
  const otherId = isHost ? game.guest?.id : game.host.id;
  const otherClient = clients.get(otherId);
  
  // Уведомляем другого игрока
  if (otherClient) {
    otherClient.ws.send(JSON.stringify({ 
      type: 'opponent_left',
      message: isHost ? 'Хост покинул игру' : 'Гость покинул игру'
    }));
    console.log(`📤 Sent opponent_left to ${isHost ? 'guest' : 'host'}`);
  }
  
  // Удаляем игру
  games.delete(client.gameId);
  client.gameId = null;
  
  console.log(`👋 ${client.name} left game: ${client.gameId}`);
}

function handleDisconnect(clientId) {
  const client = clients.get(clientId);
  if (client) {
    console.log(`🔴 ${client.name || 'Unknown'} disconnected`);
    handleLeaveGame(clientId);
  }
  clients.delete(clientId);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});