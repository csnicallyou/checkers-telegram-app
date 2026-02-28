const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Простое хранилище: gameId -> { host, guest, hostSide }
const games = {};

app.get('/', (req, res) => {
  res.send('✅ Server OK');
});

wss.on('connection', (ws) => {
  console.log('🟢 Новый игрок');

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('📩', data.type);

    // СОЗДАТЬ ИГРУ (ХОСТ)
    if (data.type === 'host_create') {
      const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      games[gameId] = {
        host: ws,
        hostSide: data.side || 'white',
        guest: null,
        hostReady: false,
        guestReady: false
      };
      
      ws.gameId = gameId;
      
      ws.send(JSON.stringify({
        type: 'host_created',
        gameId,
        side: data.side || 'white'
      }));
      
      console.log(`✅ Хост создал игру ${gameId} за ${data.side}`);
    }
    
    // ПРИСОЕДИНИТЬСЯ (ГОСТЬ)
    else if (data.type === 'guest_join') {
      const game = games[data.gameId];
      
      if (!game) {
        ws.send(JSON.stringify({ type: 'error', message: 'Игра не найдена' }));
        return;
      }
      
      if (game.guest) {
        ws.send(JSON.stringify({ type: 'error', message: 'Игра уже заполнена' }));
        return;
      }
      
      game.guest = ws;
      ws.gameId = data.gameId;
      
      // Гость всегда играет противоположной стороной
      const guestSide = game.hostSide === 'white' ? 'black' : 'white';
      
      // Уведомляем хоста
      if (game.host) {
        game.host.send(JSON.stringify({
          type: 'guest_connected',
          guestSide: guestSide
        }));
      }
      
      // Уведомляем гостя
      ws.send(JSON.stringify({
        type: 'guest_connected',
        gameId: data.gameId,
        mySide: guestSide,
        hostSide: game.hostSide
      }));
      
      console.log(`✅ Гость присоединился к игре ${data.gameId} за ${guestSide}`);
    }
    
    // ГОСТЬ ГОТОВ
    else if (data.type === 'guest_ready') {
      const game = games[data.gameId];
      if (!game) return;
      
      game.guestReady = true;
      
      if (game.host) {
        game.host.send(JSON.stringify({
          type: 'guest_ready'
        }));
      }
      
      console.log(`✅ Гость готов в игре ${data.gameId}`);
    }
    
    // ХОСТ НАЧИНАЕТ ИГРУ
    else if (data.type === 'host_start') {
      const game = games[data.gameId];
      if (!game) return;
      
      if (!game.guest || !game.guestReady) {
        ws.send(JSON.stringify({ type: 'error', message: 'Гость не готов' }));
        return;
      }
      
      // Отправляем хосту
      game.host.send(JSON.stringify({
        type: 'game_start',
        mySide: game.hostSide,
        myColor: game.hostSide === 'white' ? 1 : 2,
        opponentColor: game.hostSide === 'white' ? 2 : 1
      }));
      
      // Отправляем гостю
      if (game.guest) {
        const guestSide = game.hostSide === 'white' ? 'black' : 'white';
        game.guest.send(JSON.stringify({
          type: 'game_start',
          mySide: guestSide,
          myColor: guestSide === 'white' ? 1 : 2,
          opponentColor: guestSide === 'white' ? 2 : 1
        }));
      }
      
      console.log(`🎮 Игра ${data.gameId} началась!`);
    }
    
    // ХОД
    else if (data.type === 'move') {
      const game = games[data.gameId];
      if (!game) return;
      
      const target = game.host === ws ? game.guest : game.host;
      if (target) {
        target.send(JSON.stringify({
          type: 'opponent_move',
          move: data.move,
          board: data.board,
          currentPlayer: data.currentPlayer
        }));
      }
    }
  });

  ws.on('close', () => {
    // Ищем игру игрока
    for (const gameId in games) {
      const game = games[gameId];
      
      if (game.host === ws) {
        console.log(`🔴 Хост покинул игру ${gameId}`);
        if (game.guest) {
          game.guest.send(JSON.stringify({ type: 'host_left' }));
        }
        delete games[gameId];
        break;
      }
      
      if (game.guest === ws) {
        console.log(`🔴 Гость покинул игру ${gameId}`);
        if (game.host) {
          game.host.send(JSON.stringify({ type: 'guest_left' }));
        }
        game.guest = null;
        game.guestReady = false;
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});