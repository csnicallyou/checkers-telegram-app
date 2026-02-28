const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Настройка CORS для работы с Netlify и Telegram
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://*.netlify.app',
      'https://*.onrender.com',
      'https://telegram.org'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Checkers Server</title></head>
    <body>
      <h1>✅ Checkers Server Running</h1>
      <p>Full server with ${activeGames?.size || 0} active games</p>
      <p><a href="/api/health">Health check</a></p>
    </body>
    </html>
  `);
});

// Хранилище активных игр (в продакшене использовать Redis)
const activeGames = new Map();
const connectedPlayers = new Map();

// Статистика сервера
let stats = {
  gamesCreated: 0,
  gamesCompleted: 0,
  playersConnected: 0,
  startTime: Date.now()
};

// API для проверки здоровья сервера
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - stats.startTime) / 1000),
    games: activeGames.size,
    players: stats.playersConnected,
    gamesCreated: stats.gamesCreated,
    gamesCompleted: stats.gamesCompleted
  });
});

// API для получения информации об игре
app.get('/api/game/:gameId', (req, res) => {
  const { gameId } = req.params;
  const game = activeGames.get(gameId);
  
  if (game) {
    res.json({
      success: true,
      game: {
        id: game.id,
        host: {
          name: game.host.name,
          connected: !!connectedPlayers.get(game.host.socketId)
        },
        guest: game.guest ? {
          name: game.guest.name,
          connected: !!connectedPlayers.get(game.guest.socketId)
        } : null,
        status: game.status,
        createdAt: game.createdAt
      }
    });
  } else {
    res.json({ success: false, error: 'Игра не найдена' });
  }
});

// WebSocket подключения
io.on('connection', (socket) => {
  console.log('🟢 Новое подключение:', socket.id);
  stats.playersConnected++;

  // Создание новой игры
  socket.on('create_game', (data) => {
    try {
      const { playerName } = data;
      
      if (!playerName || playerName.trim().length < 2) {
        socket.emit('error', { message: 'Имя должно содержать минимум 2 символа' });
        return;
      }

      // Генерируем уникальный код игры
      let gameId;
      do {
        gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
      } while (activeGames.has(gameId));

      const game = {
        id: gameId,
        host: {
          id: socket.id,
          name: playerName.trim(),
          socketId: socket.id,
          color: 1
        },
        guest: null,
        status: 'waiting',
        createdAt: Date.now(),
        lastActivity: Date.now()
      };

      activeGames.set(gameId, game);
      connectedPlayers.set(socket.id, { gameId, role: 'host' });
      socket.join(gameId);

      stats.gamesCreated++;

      console.log(`✅ Игра создана: ${gameId} (хост: ${playerName})`);

      socket.emit('game_created', {
        success: true,
        game: {
          id: gameId,
          host: game.host,
          status: 'waiting'
        }
      });

      // Автоматически удаляем игру через 30 минут
      setTimeout(() => {
        const game = activeGames.get(gameId);
        if (game && game.status === 'waiting' && !game.guest) {
          activeGames.delete(gameId);
          io.to(gameId).emit('game_expired');
          console.log(`⏰ Игра ${gameId} удалена (истекло время ожидания)`);
        }
      }, 30 * 60 * 1000);

    } catch (error) {
      console.error('❌ Ошибка создания игры:', error);
      socket.emit('error', { message: 'Не удалось создать игру' });
    }
  });

  // Присоединение к игре
  socket.on('join_game', async (data) => {
    try {
      const { gameId, playerName } = data;
      
      if (!gameId || gameId.length < 4) {
        socket.emit('error', { message: 'Неверный код игры' });
        return;
      }

      if (!playerName || playerName.trim().length < 2) {
        socket.emit('error', { message: 'Имя должно содержать минимум 2 символа' });
        return;
      }

      const game = activeGames.get(gameId.toUpperCase());

      if (!game) {
        socket.emit('error', { message: 'Игра не найдена' });
        return;
      }

      if (game.guest) {
        socket.emit('error', { message: 'Игра уже заполнена' });
        return;
      }

      if (game.host.socketId === socket.id) {
        socket.emit('error', { message: 'Нельзя присоединиться к своей игре' });
        return;
      }

      // Добавляем гостя
      game.guest = {
        id: socket.id,
        name: playerName.trim(),
        socketId: socket.id,
        color: 2
      };
      game.status = 'ready';
      game.lastActivity = Date.now();

      connectedPlayers.set(socket.id, { gameId: game.id, role: 'guest' });
      socket.join(game.id);

      console.log(`✅ Игрок ${playerName} присоединился к игре ${game.id}`);

      // Уведомляем хоста
      io.to(game.host.socketId).emit('player_joined', {
        player: game.guest
      });

      // Уведомляем гостя
      socket.emit('game_joined', {
        success: true,
        game: {
          id: game.id,
          host: game.host,
          guest: game.guest,
          status: 'ready'
        }
      });

    } catch (error) {
      console.error('❌ Ошибка присоединения к игре:', error);
      socket.emit('error', { message: 'Не удалось присоединиться к игре' });
    }
  });

  // Начало игры
  socket.on('start_game', (data) => {
    try {
      const { gameId } = data;
      const game = activeGames.get(gameId);

      if (!game) {
        socket.emit('error', { message: 'Игра не найдена' });
        return;
      }

      if (game.host.socketId !== socket.id) {
        socket.emit('error', { message: 'Только хост может начать игру' });
        return;
      }

      if (!game.guest) {
        socket.emit('error', { message: 'Нет второго игрока' });
        return;
      }

      game.status = 'playing';
      game.lastActivity = Date.now();

      console.log(`🎮 Игра ${gameId} началась`);

      io.to(gameId).emit('game_started', {
        game: {
          id: game.id,
          host: game.host,
          guest: game.guest,
          status: 'playing'
        }
      });

    } catch (error) {
      console.error('❌ Ошибка начала игры:', error);
      socket.emit('error', { message: 'Не удалось начать игру' });
    }
  });

  // Отправка хода
  socket.on('make_move', (data) => {
    try {
      const { gameId, move, board, currentPlayer } = data;
      const game = activeGames.get(gameId);

      if (!game) {
        socket.emit('error', { message: 'Игра не найдена' });
        return;
      }

      if (game.status !== 'playing') {
        socket.emit('error', { message: 'Игра еще не началась' });
        return;
      }

      // Определяем соперника
      const opponentSocketId = game.host.socketId === socket.id
        ? game.guest?.socketId
        : game.host.socketId;

      if (!opponentSocketId) {
        socket.emit('error', { message: 'Соперник не найден' });
        return;
      }

      game.lastActivity = Date.now();

      // Отправляем ход сопернику
      io.to(opponentSocketId).emit('opponent_move', {
        move,
        board,
        currentPlayer
      });

    } catch (error) {
      console.error('❌ Ошибка отправки хода:', error);
      socket.emit('error', { message: 'Не удалось отправить ход' });
    }
  });

  // Завершение игры
  socket.on('game_over', (data) => {
    try {
      const { gameId, winner } = data;
      const game = activeGames.get(gameId);

      if (game) {
        stats.gamesCompleted++;
        io.to(gameId).emit('game_ended', { winner });
        console.log(`🏁 Игра ${gameId} завершена, победитель: ${winner === 1 ? 'белые' : 'черные'}`);
        
        // Удаляем игру через 5 минут
        setTimeout(() => {
          activeGames.delete(gameId);
          console.log(`🧹 Игра ${gameId} удалена`);
        }, 5 * 60 * 1000);
      }

    } catch (error) {
      console.error('❌ Ошибка завершения игры:', error);
    }
  });

  // Пинг для поддержания соединения
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Отключение
  socket.on('disconnect', () => {
    try {
      const player = connectedPlayers.get(socket.id);
      
      if (player) {
        const { gameId, role } = player;
        const game = activeGames.get(gameId);

        if (game) {
          // Уведомляем другого игрока
          if (role === 'host' && game.guest) {
            io.to(game.guest.socketId).emit('opponent_disconnected');
            console.log(`🔴 Хост отключился от игры ${gameId}`);
          } else if (role === 'guest' && game.host) {
            io.to(game.host.socketId).emit('opponent_disconnected');
            console.log(`🔴 Гость отключился от игры ${gameId}`);
          }

          // Если игра не началась, удаляем её сразу
          if (game.status === 'waiting' || game.status === 'ready') {
            activeGames.delete(gameId);
            console.log(`🧹 Игра ${gameId} удалена (игрок отключился)`);
          }
        }

        connectedPlayers.delete(socket.id);
        stats.playersConnected--;
      }

      console.log('🔴 Отключение:', socket.id);

    } catch (error) {
      console.error('❌ Ошибка при отключении:', error);
    }
  });
});

// Очистка старых игр (каждые 15 минут)
setInterval(() => {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  
  for (const [gameId, game] of activeGames.entries()) {
    if (game.createdAt < twoHoursAgo) {
      activeGames.delete(gameId);
      console.log(`🧹 Игра ${gameId} удалена (устарела)`);
    }
  }
}, 15 * 60 * 1000);

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n=== 🚀 СЕРВЕР ЗАПУЩЕН ===');
  console.log(`📡 Порт: ${PORT}`);
  console.log(`🌐 WebSocket: ws://localhost:${PORT}`);
  console.log(`🌐 HTTP: http://localhost:${PORT}`);
  console.log(`📊 Статистика:`);
  console.log(`   - Игр создано: ${stats.gamesCreated}`);
  console.log(`   - Игроков онлайн: ${stats.playersConnected}`);
  console.log('========================\n');
});