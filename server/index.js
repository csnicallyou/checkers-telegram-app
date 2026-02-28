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
  res.send('✅ Server OK');
});

wss.on('connection', (ws) => {
  console.log('🟢 Новый игрок подключился');
  
  ws.playerName = null;
  ws.gameId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📩 Получено:', data.type, data);

      // ВОССТАНОВЛЕНИЕ СЕССИИ
      if (data.type === 'reconnect') {
        console.log(`🔄 Попытка восстановления сессии для игры ${data.gameId}`);
        const game = games[data.gameId];
        
        if (!game) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Игра не найдена' 
          }));
          return;
        }
        
        // Восстанавливаем соединение
        if (game.hostName === data.playerName) {
          game.host = ws;
          ws.playerName = data.playerName;
          ws.gameId = data.gameId;
          console.log(`✅ Сессия хоста восстановлена для игры ${data.gameId}`);
        } else if (game.guestName === data.playerName) {
          game.guest = ws;
          ws.playerName = data.playerName;
          ws.gameId = data.gameId;
          console.log(`✅ Сессия гостя восстановлена для игры ${data.gameId}`);
        } else {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Игрок не найдена в этой игре' 
          }));
          return;
        }
        
        // Отправляем текущее состояние игры
        ws.send(JSON.stringify({ 
          type: 'reconnect_success',
          gameId: data.gameId,
          board: game.board,
          currentPlayer: game.currentPlayer
        }));
      }

      // ХОСТ СОЗДАЕТ ИГРУ
      else if (data.type === 'host_create') {
        const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        games[gameId] = {
          host: ws,
          hostName: data.playerName,
          hostSide: data.side || 'white',
          guest: null,
          guestName: null,
          guestReady: false,
          board: null,
          currentPlayer: 1, // Белые ходят первыми
          created: Date.now()
        };
        
        ws.gameId = gameId;
        ws.playerName = data.playerName;
        
        ws.send(JSON.stringify({
          type: 'host_created',
          gameId,
          side: data.side || 'white'
        }));
        
        console.log(`✅ Хост ${data.playerName} создал игру ${gameId} за ${data.side}`);
      }
      
      // ГОСТЬ ПРИСОЕДИНЯЕТСЯ
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
        game.guestName = data.playerName;
        ws.gameId = data.gameId;
        ws.playerName = data.playerName;
        
        // Гость всегда получает ПРОТИВОПОЛОЖНУЮ сторону от хоста
        const guestSide = game.hostSide === 'white' ? 'black' : 'white';
        
        console.log(`✅ Гость ${data.playerName} присоединился к игре ${data.gameId} за ${guestSide}`);
        console.log(`   Хост играет за ${game.hostSide}`);
        
        // Уведомляем ХОСТА
        if (game.host) {
          game.host.send(JSON.stringify({
            type: 'guest_joined',
            guestName: data.playerName,
            guestSide: guestSide
          }));
          console.log(`📤 Уведомление отправлено хосту ${game.hostName}`);
        }
        
        // Уведомляем ГОСТЯ
        ws.send(JSON.stringify({
          type: 'guest_joined',
          gameId: data.gameId,
          myName: data.playerName,
          mySide: guestSide,
          hostName: game.hostName,
          hostSide: game.hostSide
        }));
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
          console.log(`📤 Гость готов, уведомлен хост ${game.hostName}`);
        }
      }
      
      // ХОСТ НАЧИНАЕТ ИГРУ
      else if (data.type === 'host_start') {
        const game = games[data.gameId];
        if (!game) {
          console.log(`❌ Игра ${data.gameId} не найдена`);
          return;
        }
        
        if (!game.guest) {
          console.log(`❌ В игре ${data.gameId} нет гостя`);
          ws.send(JSON.stringify({ type: 'error', message: 'Нет гостя' }));
          return;
        }
        
        if (!game.guestReady) {
          console.log(`❌ Гость в игре ${data.gameId} не готов`);
          ws.send(JSON.stringify({ type: 'error', message: 'Гость не готов' }));
          return;
        }
        
        console.log(`🎮 Игра ${data.gameId} начинается!`);
        console.log(`   Хост: ${game.hostName} (${game.hostSide})`);
        console.log(`   Гость: ${game.guestName} (${game.hostSide === 'white' ? 'black' : 'white'})`);
        
        // Инициализируем доску (пустая, клиент сам создаст начальную позицию)
        game.board = null;
        game.currentPlayer = 1;
        
        // Отправляем хосту
        if (game.host) {
          game.host.send(JSON.stringify({
            type: 'game_start',
            myColor: game.hostSide === 'white' ? 1 : 2,
            opponentColor: game.hostSide === 'white' ? 2 : 1,
            opponentName: game.guestName
          }));
          console.log(`✅ Уведомление отправлено хосту ${game.hostName}`);
        }
        
        // Отправляем гостю
        if (game.guest) {
          game.guest.send(JSON.stringify({
            type: 'game_start',
            myColor: game.hostSide === 'white' ? 2 : 1,
            opponentColor: game.hostSide === 'white' ? 1 : 2,
            opponentName: game.hostName
          }));
          console.log(`✅ Уведомление отправлено гостю ${game.guestName}`);
        }
      }
      
      // ХОД с валидацией на сервере
      else if (data.type === 'move') {
        const game = games[data.gameId];
        if (!game) {
          console.log(`❌ Игра ${data.gameId} не найдена`);
          return;
        }
        
        // Проверяем, что ходит правильный игрок
        const isHost = game.host === ws;
        const currentPlayerColor = isHost ? 
          (game.hostSide === 'white' ? 1 : 2) : 
          (game.hostSide === 'white' ? 2 : 1);
        
        // Проверяем, что сейчас действительно ход этого игрока
        if (currentPlayerColor !== game.currentPlayer) {
          console.log(`❌ Неправильный игрок пытается ходить. Текущий ход: ${game.currentPlayer}, игрок: ${currentPlayerColor}`);
          ws.send(JSON.stringify({ type: 'error', message: 'Сейчас не ваш ход' }));
          return;
        }
        
        console.log(`♟️ Ход в игре ${data.gameId} от ${isHost ? game.hostName : game.guestName}`);
        
        // Сохраняем состояние доски на сервере
        game.board = data.board;
        game.currentPlayer = data.currentPlayer;
        
        console.log(`✅ Ход выполнен, теперь ход ${game.currentPlayer === 1 ? 'белых' : 'черных'}`);
        
        // Рассылаем обновление ВСЕМ подключенным клиентам
        const clients = [game.host, game.guest].filter(c => c && c.readyState === WebSocket.OPEN);
        clients.forEach(client => {
          client.send(JSON.stringify({
            type: 'game_state_update',
            board: game.board,
            currentPlayer: game.currentPlayer,
            lastMove: data.move
          }));
        });
        
        console.log(`📤 Обновление разослано ${clients.length} клиентам`);
      }
      
    } catch (error) {
      console.error('❌ Ошибка обработки сообщения:', error);
    }
  });

  ws.on('close', () => {
    console.log(`🔴 Игрок ${ws.playerName || 'неизвестный'} отключился`);
    
    // Ищем игру игрока
    for (const gameId in games) {
      const game = games[gameId];
      
      if (game.host === ws) {
        console.log(`❌ Хост ${game.hostName} покинул игру ${gameId}`);
        if (game.guest && game.guest.readyState === WebSocket.OPEN) {
          game.guest.send(JSON.stringify({ 
            type: 'host_left',
            message: 'Хост покинул игру'
          }));
        }
        delete games[gameId];
        break;
      }
      
      if (game.guest === ws) {
        console.log(`❌ Гость ${game.guestName} покинул игру ${gameId}`);
        game.guest = null;
        game.guestName = null;
        game.guestReady = false;
        if (game.host && game.host.readyState === WebSocket.OPEN) {
          game.host.send(JSON.stringify({ 
            type: 'guest_left',
            message: 'Гость покинул игру'
          }));
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 Игры хранятся в памяти`);
});