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
const clients = new Map(); // clientId -> { ws, gameId, playerName, isHost }

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Checkers Server</title>
      <style>
        body { font-family: Arial; padding: 40px; background: #f0f0f0; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
        h1 { color: #333; }
        .stats { margin: 20px 0; padding: 20px; background: #e3f2fd; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ Checkers Server Running</h1>
        <div class="stats">
          <p><strong>Активных игр:</strong> ${games.size}</p>
          <p><strong>Подключено клиентов:</strong> ${clients.size}</p>
        </div>
        <p>Версия: Simple WebSocket Server</p>
      </div>
    </body>
    </html>
  `);
});

// API для проверки игры
app.get('/api/game/:id', (req, res) => {
  const game = games.get(req.params.id);
  if (game) {
    res.json({ 
      exists: true, 
      host: game.host.name,
      hasGuest: !!game.guest
    });
  } else {
    res.json({ exists: false });
  }
});

// WebSocket сервер
wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(clientId, { ws, gameId: null, playerName: null, isHost: false });
  
  console.log('🟢 Клиент подключился:', clientId);
  
  // Отправляем клиенту его ID
  ws.send(JSON.stringify({ 
    type: 'connected', 
    clientId,
    message: 'Подключено к серверу'
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📩 Получено сообщение:', data.type, data);

      switch (data.type) {
        case 'create_game':
          handleCreateGame(clientId, data.playerName);
          break;
          
        case 'join_game':
          handleJoinGame(clientId, data.gameId, data.playerName);
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
      console.error('❌ Ошибка обработки сообщения:', error);
    }
  });

  ws.on('close', () => {
    handleDisconnect(clientId);
  });
});

function handleCreateGame(clientId, playerName) {
  const client = clients.get(clientId);
  if (!client) return;
  
  // Генерируем уникальный код игры
  let gameId;
  do {
    gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (games.has(gameId));
  
  // Создаем игру
  games.set(gameId, {
    id: gameId,
    host: {
      id: clientId,
      name: playerName
    },
    guest: null,
    created: Date.now()
  });
  
  // Обновляем клиента
  client.gameId = gameId;
  client.playerName = playerName;
  client.isHost = true;
  
  // Отправляем подтверждение
  client.ws.send(JSON.stringify({
    type: 'game_created',
    gameId,
    host: { name: playerName }
  }));
  
  console.log(`✅ Игра создана: ${gameId} (хост: ${playerName})`);
}

function handleJoinGame(clientId, gameId, playerName) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const game = games.get(gameId);
  if (!game) {
    client.ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Игра не найдена' 
    }));
    return;
  }
  
  if (game.guest) {
    client.ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Игра уже заполнена' 
    }));
    return;
  }
  
  // Добавляем гостя
  game.guest = {
    id: clientId,
    name: playerName
  };
  
  // Обновляем клиента
  client.gameId = gameId;
  client.playerName = playerName;
  client.isHost = false;
  
  // Уведомляем хоста
  const hostClient = clients.get(game.host.id);
  if (hostClient) {
    hostClient.ws.send(JSON.stringify({
      type: 'player_joined',
      guest: { name: playerName }
    }));
  }
  
  // Уведомляем гостя
  client.ws.send(JSON.stringify({
    type: 'game_joined',
    gameId,
    host: { name: game.host.name }
  }));
  
  console.log(`✅ ${playerName} присоединился к игре ${gameId}`);
}

function handleStartGame(clientId, gameId) {
  const game = games.get(gameId);
  if (!game) return;
  
  // Проверяем, что хост начинает игру
  if (game.host.id !== clientId) return;
  
  // Проверяем, что есть гость
  if (!game.guest) return;
  
  // Уведомляем всех игроков
  const hostClient = clients.get(game.host.id);
  const guestClient = clients.get(game.guest.id);
  
  const startMessage = JSON.stringify({ 
    type: 'game_started', 
    gameId 
  });
  
  if (hostClient) hostClient.ws.send(startMessage);
  if (guestClient) guestClient.ws.send(startMessage);
  
  console.log(`🎮 Игра началась: ${gameId}`);
}

function handleMakeMove(clientId, data) {
  const { gameId, move, board, currentPlayer } = data;
  const game = games.get(gameId);
  if (!game) return;
  
  // Определяем получателя хода
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
  
  // Уведомляем другого игрока
  const otherId = game.host.id === clientId ? game.guest?.id : game.host.id;
  const otherClient = clients.get(otherId);
  
  if (otherClient) {
    otherClient.ws.send(JSON.stringify({ 
      type: 'opponent_left' 
    }));
  }
  
  // Удаляем игру
  games.delete(client.gameId);
  
  // Очищаем клиента
  client.gameId = null;
  client.playerName = null;
  client.isHost = false;
  
  console.log(`👋 Игрок покинул игру ${client.gameId}`);
}

function handleDisconnect(clientId) {
  handleLeaveGame(clientId);
  clients.delete(clientId);
  console.log('🔴 Клиент отключился:', clientId);
}

// Очистка старых игр (каждые 30 минут)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [gameId, game] of games.entries()) {
    if (game.created < oneHourAgo) {
      games.delete(gameId);
      console.log(`🧹 Игра ${gameId} удалена (устарела)`);
    }
  }
}, 30 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n=== 🚀 ПРОСТОЙ СЕРВЕР ЗАПУЩЕН ===');
  console.log(`📡 Порт: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('================================\n');
});