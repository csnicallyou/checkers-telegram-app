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
        <p>Версия: Simple WebSocket Server with Side Selection</p>
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
          handleCreateGame(clientId, data.playerName, data.side);
          break;
          
        case 'join_game':
          handleJoinGame(clientId, data.gameId, data.playerName);
          break;
          
        case 'select_side':
          handleSelectSide(clientId, data.gameId, data.side);
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

function handleCreateGame(clientId, playerName, side = 'white') {
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
      name: playerName,
      side: side
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
    host: { name: playerName, side: side },
    side: side
  }));
  
  console.log(`✅ Игра создана: ${gameId} (хост: ${playerName}, сторона: ${side})`);
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
  
  // Определяем сторону для гостя (противоположная хосту)
  const hostSide = game.host.side;
  const guestSide = hostSide === 'white' ? 'black' : 'white';
  
  // Добавляем гостя
  game.guest = {
    id: clientId,
    name: playerName,
    side: guestSide
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
      guest: { name: playerName, side: guestSide }
    }));
  }
  
  // Уведомляем гостя
  client.ws.send(JSON.stringify({
    type: 'game_joined',
    gameId,
    host: { name: game.host.name, side: hostSide },
    side: guestSide
  }));
  
  console.log(`✅ ${playerName} присоединился к игре ${gameId} (сторона: ${guestSide})`);
}

function handleSelectSide(clientId, gameId, side) {
  const game = games.get(gameId);
  if (!game) return;
  
  // Только хост может менять сторону
  if (game.host.id !== clientId) return;
  
  // Меняем сторону хоста
  game.host.side = side;
  
  // Уведомляем хоста
  const hostClient = clients.get(clientId);
  if (hostClient) {
    hostClient.ws.send(JSON.stringify({
      type: 'side_selected',
      side: side
    }));
  }
  
  // Если есть гость, уведомляем его об изменении стороны
  if (game.guest) {
    const guestClient = clients.get(game.guest.id);
    if (guestClient) {
      const guestSide = side === 'white' ? 'black' : 'white';
      game.guest.side = guestSide;
      
      guestClient.ws.send(JSON.stringify({
        type: 'side_selected',
        side: guestSide
      }));
    }
  }
  
  console.log(`🔄 Игра ${gameId}: хост сменил сторону на ${side}`);
}

function handleStartGame(clientId, gameId) {
  const game = games.get(gameId);
  if (!game) {
    console.log(`❌ Игра ${gameId} не найдена`);
    return;
  }
  
  // Проверяем, что хост начинает игру
  if (game.host.id !== clientId) {
    console.log(`❌ Только хост может начать игру ${gameId}`);
    return;
  }
  
  // Проверяем, что есть гость
  if (!game.guest) {
    console.log(`❌ Нет гостя в игре ${gameId}`);
    return;
  }
  
  console.log(`🎮 Игра ${gameId} начинается...`);
  console.log(`   Хост: ${game.host.name} (${game.host.side})`);
  console.log(`   Гость: ${game.guest.name} (${game.guest.side})`);
  
  // Отправляем уведомление всем игрокам в комнате
  const hostClient = clients.get(game.host.id);
  const guestClient = clients.get(game.guest.id);
  
  const startMessage = JSON.stringify({ 
    type: 'game_started', 
    gameId,
    host: { name: game.host.name, side: game.host.side },
    guest: { name: game.guest.name, side: game.guest.side }
  });
  
  let hostSent = false;
  let guestSent = false;
  
  if (hostClient && hostClient.ws.readyState === WebSocket.OPEN) {
    hostClient.ws.send(startMessage);
    hostSent = true;
    console.log(`✅ Уведомление отправлено хосту ${game.host.name}`);
  } else {
    console.log(`❌ Хост ${game.host.name} не в сети`);
  }
  
  if (guestClient && guestClient.ws.readyState === WebSocket.OPEN) {
    guestClient.ws.send(startMessage);
    guestSent = true;
    console.log(`✅ Уведомление отправлено гостю ${game.guest.name}`);
  } else {
    console.log(`❌ Гость ${game.guest.name} не в сети`);
  }
  
  if (hostSent && guestSent) {
    console.log(`🎉 Игра ${gameId} успешно запущена для обоих игроков`);
  } else {
    console.log(`⚠️ Игра ${gameId} запущена не полностью`);
  }
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
  console.log(`🔄 Поддержка выбора сторон: ВКЛЮЧЕНА`);
  console.log('================================\n');
});