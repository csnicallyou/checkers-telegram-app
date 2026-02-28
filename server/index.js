const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const games = {};

app.get('/', (req, res) => {
  res.send('✅ Server OK');
});

wss.on('connection', (ws) => {
  console.log('🟢 Новый игрок');
  
  ws.playerName = null;
  ws.gameId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📩 Получено:', data.type);

      if (data.type === 'host_create') {
        const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        games[gameId] = {
          host: ws,
          hostName: data.playerName,
          hostSide: data.side || 'white',
          guest: null,
          guestName: null,
          guestReady: false,
          created: Date.now()
        };
        
        ws.gameId = gameId;
        ws.playerName = data.playerName;
        
        ws.send(JSON.stringify({
          type: 'host_created',
          gameId,
          side: data.side || 'white'
        }));
      }
      
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
        
        const guestSide = game.hostSide === 'white' ? 'black' : 'white';
        
        if (game.host) {
          game.host.send(JSON.stringify({
            type: 'guest_joined',
            guestName: data.playerName,
            guestSide: guestSide
          }));
        }
        
        ws.send(JSON.stringify({
          type: 'guest_joined',
          gameId: data.gameId,
          myName: data.playerName,
          mySide: guestSide,
          hostName: game.hostName,
          hostSide: game.hostSide
        }));
      }
      
      else if (data.type === 'guest_ready') {
        const game = games[data.gameId];
        if (!game) return;
        
        game.guestReady = true;
        
        if (game.host) {
          game.host.send(JSON.stringify({ type: 'guest_ready' }));
        }
      }
      
      else if (data.type === 'host_start') {
        const game = games[data.gameId];
        if (!game || !game.guest || !game.guestReady) return;
        
        if (game.host) {
          game.host.send(JSON.stringify({
            type: 'game_start',
            myColor: game.hostSide === 'white' ? 1 : 2,
            opponentColor: game.hostSide === 'white' ? 2 : 1,
            opponentName: game.guestName
          }));
        }
        
        if (game.guest) {
          game.guest.send(JSON.stringify({
            type: 'game_start',
            myColor: game.hostSide === 'white' ? 2 : 1,
            opponentColor: game.hostSide === 'white' ? 1 : 2,
            opponentName: game.hostName
          }));
        }
      }
      
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
    } catch (error) {
      console.error('❌ Ошибка:', error);
    }
  });

  ws.on('close', () => {
    for (const gameId in games) {
      const game = games[gameId];
      
      if (game.host === ws) {
        if (game.guest) {
          game.guest.send(JSON.stringify({ type: 'host_left' }));
        }
        delete games[gameId];
        break;
      }
      
      if (game.guest === ws) {
        game.guest = null;
        game.guestName = null;
        game.guestReady = false;
        if (game.host) {
          game.host.send(JSON.stringify({ type: 'guest_left' }));
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});