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
const games = {};

app.get('/', (req, res) => {
  res.send('✅ Сервер работает');
});

wss.on('connection', (ws) => {
  console.log('🟢 Новый игрок');

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('📩 Получено:', data.type);

    // СОЗДАНИЕ ИГРЫ
    if (data.type === 'create') {
      const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      games[gameId] = {
        id: gameId,
        host: ws,
        hostName: data.playerName,
        guest: null,
        guestName: null,
        board: null,
        currentPlayer: 1,
        created: Date.now()
      };
      
      ws.gameId = gameId;
      ws.playerName = data.playerName;
      
      ws.send(JSON.stringify({
        type: 'created',
        gameId
      }));
      
      console.log(`✅ Игра создана: ${gameId} (${data.playerName})`);
    }
    
    // ПРИСОЕДИНЕНИЕ К ИГРЕ
    else if (data.type === 'join') {
      const game = games[data.gameId];
      
      if (!game) {
        ws.send(JSON.stringify({ type: 'error', message: 'Игра не найдена' }));
        return;
      }
      
      if (game.guest) {
        ws.send(JSON.stringify({ type: 'error', message: 'Игра заполнена' }));
        return;
      }
      
      game.guest = ws;
      game.guestName = data.playerName;
      ws.gameId = data.gameId;
      ws.playerName = data.playerName;
      
      // Уведомляем хоста
      if (game.host) {
        game.host.send(JSON.stringify({
          type: 'guest_joined',
          guestName: data.playerName
        }));
      }
      
      // Уведомляем гостя
      ws.send(JSON.stringify({
        type: 'joined',
        gameId: data.gameId,
        hostName: game.hostName
      }));
      
      console.log(`✅ ${data.playerName} присоединился к ${data.gameId}`);
    }
    
    // ХОД
    else if (data.type === 'move') {
      const game = games[data.gameId];
      if (!game) return;
      
      // Сохраняем состояние на сервере
      game.board = data.board;
      game.currentPlayer = data.currentPlayer;
      
      // Отправляем ход другому игроку
      const target = game.host === ws ? game.guest : game.host;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify({
          type: 'move',
          move: data.move,
          board: data.board,
          currentPlayer: data.currentPlayer
        }));
      }
    }
  });

  ws.on('close', () => {
    console.log(`🔴 Игрок отключился`);
    
    // Очистка
    for (const gameId in games) {
      const game = games[gameId];
      if (game.host === ws || game.guest === ws) {
        delete games[gameId];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});