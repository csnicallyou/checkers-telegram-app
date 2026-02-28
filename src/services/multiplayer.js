import { telegram } from './telegram';

class MultiplayerService {
  constructor() {
    this.socket = null;
    this.gameId = null;
    this.playerColor = null;
    this.opponent = null;
    this.isHost = false;
    this.gameStatus = 'waiting';
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    // Колбэки
    this.onGameUpdate = null;
    this.onPlayerJoined = null;
    this.onGameStart = null;
    this.onGameEnd = null;
    this.onOpponentDisconnected = null;
    this.onError = null;
    this.onConnectionChange = null;
    
    // URL сервера - замените на ваш при деплое
    this.serverUrl = import.meta.env.VITE_SERVER_URL || 'https://checkers-server.onrender.com';
  }

  // Подключение к серверу
  async connect() {
    return new Promise(async (resolve, reject) => {
      try {
        const { io } = await import('socket.io-client');
        
        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          timeout: 10000
        });

        this.socket.on('connect', () => {
          console.log('✅ Подключено к серверу');
          this.connected = true;
          this.reconnectAttempts = 0;
          
          if (this.onConnectionChange) {
            this.onConnectionChange(true);
          }
          
          // Начинаем пинговать сервер
          this.startPing();
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('❌ Отключено от сервера:', reason);
          this.connected = false;
          
          if (this.onConnectionChange) {
            this.onConnectionChange(false);
          }
        });

        this.socket.on('connect_error', (error) => {
          console.error('Ошибка подключения:', error);
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            if (this.onError) {
              this.onError('Не удалось подключиться к серверу. Проверьте интернет.');
            }
            reject(error);
          }
        });

        this.setupEventListeners();

      } catch (error) {
        console.error('Ошибка создания сокета:', error);
        reject(error);
      }
    });
  }

  // Пинг для поддержания соединения
  startPing() {
    setInterval(() => {
      if (this.socket && this.connected) {
        this.socket.emit('ping');
      }
    }, 30000);
  }

  // Настройка обработчиков
  setupEventListeners() {
    // Создание игры
    this.socket.on('game_created', (data) => {
      if (data.success) {
        this.gameId = data.game.id;
        this.isHost = true;
        this.playerColor = 1;
        this.gameStatus = 'waiting';
        
        if (this.onGameUpdate) {
          this.onGameUpdate({
            id: this.gameId,
            host: { name: this.playerName },
            status: 'waiting'
          });
        }
      }
    });

    // Присоединение к игре
    this.socket.on('game_joined', (data) => {
      if (data.success) {
        this.gameId = data.game.id;
        this.isHost = false;
        this.playerColor = 2;
        this.opponent = data.game.host;
        this.gameStatus = 'ready';
        
        if (this.onGameUpdate) {
          this.onGameUpdate(data.game);
        }
      }
    });

    // Игрок присоединился
    this.socket.on('player_joined', (data) => {
      this.opponent = data.player;
      this.gameStatus = 'ready';
      
      if (this.onPlayerJoined) {
        this.onPlayerJoined(data.player);
      }
    });

    // Игра началась
    this.socket.on('game_started', (data) => {
      this.gameStatus = 'playing';
      
      if (this.onGameStart) {
        this.onGameStart(data.game);
      }
    });

    // Ход соперника
    this.socket.on('opponent_move', (data) => {
      if (this.onGameUpdate) {
        this.onGameUpdate({
          move: data.move,
          board: data.board,
          currentPlayer: data.currentPlayer
        });
      }
    });

    // Игра завершена
    this.socket.on('game_ended', (data) => {
      this.gameStatus = 'ended';
      
      if (this.onGameEnd) {
        this.onGameEnd(data.winner);
      }
    });

    // Соперник отключился
    this.socket.on('opponent_disconnected', () => {
      this.gameStatus = 'waiting';
      
      if (this.onOpponentDisconnected) {
        this.onOpponentDisconnected();
      }
    });

    // Игра удалена
    this.socket.on('game_expired', () => {
      if (this.onError) {
        this.onError('Время ожидания истекло. Игра удалена.');
      }
      this.disconnect();
    });

    // Ошибка
    this.socket.on('error', (data) => {
      console.error('Ошибка сервера:', data.message);
      
      if (this.onError) {
        this.onError(data.message);
      }
    });
  }

  // Создать игру
  async createGame(playerName) {
    try {
      if (!this.connected || !this.socket) {
        await this.connect();
      }
      
      this.playerName = playerName;
      this.socket.emit('create_game', { playerName });
      
    } catch (error) {
      console.error('Ошибка создания игры:', error);
      throw error;
    }
  }

  // Присоединиться к игре
  async joinGame(gameId, playerName) {
    try {
      if (!this.connected || !this.socket) {
        await this.connect();
      }
      
      // Сначала проверяем существование игры
      const status = await this.checkGameStatus(gameId);
      
      if (!status.success) {
        throw new Error(status.error || 'Игра не найдена');
      }
      
      if (status.game.guest) {
        throw new Error('Игра уже заполнена');
      }
      
      this.playerName = playerName;
      this.socket.emit('join_game', {
        gameId: gameId.toUpperCase(),
        playerName
      });
      
    } catch (error) {
      console.error('Ошибка присоединения:', error);
      throw error;
    }
  }

  // Начать игру
  startGame() {
    if (!this.socket || !this.gameId) return;
    
    this.socket.emit('start_game', {
      gameId: this.gameId
    });
  }

  // Отправить ход
  sendMove(move, board, currentPlayer) {
    if (!this.socket || !this.gameId || this.gameStatus !== 'playing') return;
    
    this.socket.emit('make_move', {
      gameId: this.gameId,
      move,
      board,
      currentPlayer
    });
  }

  // Завершить игру
  endGame(winner) {
    if (!this.socket || !this.gameId) return;
    
    this.socket.emit('game_over', {
      gameId: this.gameId,
      winner
    });
  }

  // Отключиться
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.gameId = null;
    this.playerColor = null;
    this.opponent = null;
    this.isHost = false;
    this.gameStatus = 'waiting';
    this.connected = false;
  }

  // Проверить статус игры
  async checkGameStatus(gameId) {
    try {
      const response = await fetch(`${this.serverUrl}/api/game/${gameId.toUpperCase()}`);
      return await response.json();
    } catch (error) {
      console.error('Ошибка проверки статуса:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // Получить ссылку на игру
  getGameLink(botUsername) {
    if (!this.gameId || !botUsername) return null;
    return `https://t.me/${botUsername}/game?start=${this.gameId}`;
  }

  // Скопировать ссылку
  async copyGameLink(botUsername) {
    const link = this.getGameLink(botUsername);
    if (link) {
      await navigator.clipboard.writeText(link);
      return true;
    }
    return false;
  }
}

export const multiplayer = new MultiplayerService();