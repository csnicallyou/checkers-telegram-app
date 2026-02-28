<template>
  <div class="lobby">
    <div class="header">
      <button @click="goBack" class="back-btn">← Назад</button>
      <h2>Мультиплеер</h2>
      <div style="width: 60px;"></div>
    </div>

    <div v-if="!connected" class="status">
      <div class="spinner"></div>
      <p>Подключение к серверу...</p>
    </div>

    <div v-else-if="!gameId" class="menu">
      <div class="section">
        <h3>Создать новую игру</h3>
        <p class="info">Ваш Telegram ник: <strong>{{ telegramName }}</strong></p>
        <button @click="createGame" class="btn create">Создать игру</button>
      </div>

      <div class="divider">или</div>

      <div class="section">
        <h3>Присоединиться к игре</h3>
        <input 
          v-model="gameCode" 
          placeholder="Введите код игры" 
          class="input"
          maxlength="6"
        >
        <button @click="joinGame" class="btn join" :disabled="!gameCode">
          Присоединиться
        </button>
      </div>

      <div v-if="error" class="error">{{ error }}</div>
    </div>

    <div v-else class="room">
      <h3>Комната игры</h3>
      <div class="game-code">
        Код: <strong>{{ gameId }}</strong>
        <button @click="copyCode" class="copy-btn">📋</button>
      </div>

      <div class="players">
        <div class="player" :class="{ 'host': playerRole === 'host', 'guest': playerRole === 'guest' }">
          <div class="player-name">
            {{ telegramName }}
            <span class="badge">Вы</span>
          </div>
          <div class="player-side" :class="{ 'white': playerColor === 1, 'black': playerColor === 2 }">
            {{ playerColor === 1 ? '⚪ Белые' : '⚫ Черные' }}
          </div>
        </div>
        
        <div class="vs">VS</div>
        
        <div class="player" :class="{ 'host': playerRole === 'guest', 'guest': playerRole === 'host' }">
          <div class="player-name">
            {{ opponent?.name || 'Ожидание...' }}
          </div>
          <div v-if="opponent" class="player-side" :class="{ 'white': opponentColor === 1, 'black': opponentColor === 2 }">
            {{ opponentColor === 1 ? '⚪ Белые' : '⚫ Черные' }}
          </div>
        </div>
      </div>

      <div v-if="playerRole === 'host' && opponent" class="start-section">
        <button @click="startGame" class="btn start">
          Начать игру
        </button>
      </div>

      <div v-else-if="playerRole === 'host' && !opponent" class="waiting">
        <p>Ожидание второго игрока...</p>
        <p class="hint">Отправьте код другу: <strong>{{ gameId }}</strong></p>
      </div>

      <div v-else-if="playerRole === 'guest' && opponent" class="waiting">
        <p>Ожидание начала игры...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { telegramMultiplayer } from '../services/telegramMultiplayer';
import { telegram } from '../services/telegram';

export default {
  name: 'TelegramLobby',
  emits: ['back', 'game-created', 'game-joined', 'start-game'],
  setup(props, { emit }) {
    const gameCode = ref('');
    const gameId = ref(null);
    const connected = ref(false);
    const playerRole = ref(null);
    const playerColor = ref(null);
    const opponent = ref(null);
    const opponentColor = ref(null);
    const error = ref('');

    const telegramName = computed(() => {
      const user = telegram.getUser();
      return user?.first_name || user?.username || 'Игрок';
    });

    onMounted(async () => {
      telegram.init();
      
      try {
        await telegramMultiplayer.connect();
        connected.value = true;
        
        telegramMultiplayer.onGameCreated = (data) => {
          console.log('Игра создана:', data);
          gameId.value = data.gameId;
          playerRole.value = 'host';
          playerColor.value = data.color;
          emit('game-created', { id: data.gameId });
        };
        
        telegramMultiplayer.onGameJoined = (data) => {
          console.log('Игра присоединена:', data);
          gameId.value = data.gameId;
          playerRole.value = 'guest';
          playerColor.value = data.color;
          opponent.value = { name: data.hostName };
          opponentColor.value = data.hostColor;
          emit('game-joined', { id: data.gameId });
        };
        
        telegramMultiplayer.onGameStarted = (data) => {
          console.log('Игра началась:', data);
          emit('start-game', {
            id: gameId.value,
            playerRole: playerRole.value,
            playerColor: playerColor.value,
            opponent: opponent.value,
            opponentColor: opponentColor.value
          });
        };
        
        telegramMultiplayer.onError = (msg) => {
          error.value = msg;
        };
        
      } catch (e) {
        error.value = 'Не удалось подключиться к серверу';
      }
    });

    onUnmounted(() => {
      telegramMultiplayer.leaveGame();
    });

    const createGame = () => {
      telegramMultiplayer.createGame();
    };

    const joinGame = () => {
      if (!gameCode.value) return;
      telegramMultiplayer.joinGame(gameCode.value);
    };

    const startGame = () => {
      telegramMultiplayer.startGame();
    };

    const copyCode = () => {
      navigator.clipboard.writeText(gameId.value);
      error.value = 'Код скопирован!';
      setTimeout(() => error.value = '', 2000);
    };

    const goBack = () => {
      telegramMultiplayer.leaveGame();
      emit('back');
    };

    return {
      gameCode,
      gameId,
      connected,
      playerRole,
      playerColor,
      opponent,
      opponentColor,
      error,
      telegramName,
      createGame,
      joinGame,
      startGame,
      copyCode,
      goBack
    };
  }
};
</script>

<style scoped>
.lobby {
  max-width: 500px;
  margin: 20px auto;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.back-btn {
  padding: 8px 16px;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.status {
  text-align: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.section {
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
}

.info {
  margin-bottom: 15px;
  color: #666;
}

.input {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
}

.btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  color: white;
  cursor: pointer;
}

.btn.create { background: #4CAF50; }
.btn.join { background: #2196F3; }
.btn.start { background: #FF9800; }

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.divider {
  text-align: center;
  color: #999;
  margin: 20px 0;
}

.game-code {
  font-size: 18px;
  text-align: center;
  margin: 20px 0;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 6px;
}

.copy-btn {
  margin-left: 10px;
  padding: 4px 8px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
}

.players {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 30px 0;
}

.player {
  flex: 1;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.player.host { background: #e3f2fd; }
.player.guest { background: #fce4ec; }

.player-name {
  font-weight: bold;
  margin-bottom: 5px;
}

.badge {
  display: inline-block;
  margin-left: 5px;
  padding: 2px 6px;
  background: #4CAF50;
  color: white;
  border-radius: 4px;
  font-size: 12px;
}

.player-side {
  font-size: 14px;
}

.player-side.white { color: #2196F3; }
.player-side.black { color: #f44336; }

.vs {
  font-size: 20px;
  font-weight: bold;
  margin: 0 15px;
}

.start-section {
  text-align: center;
  margin: 20px 0;
}

.waiting {
  text-align: center;
  padding: 20px;
  background: #fff3cd;
  border-radius: 8px;
  color: #856404;
}

.hint {
  font-size: 14px;
  margin-top: 10px;
}

.error {
  margin-top: 15px;
  padding: 12px;
  background: #ffebee;
  color: #c62828;
  border-radius: 6px;
}
</style>