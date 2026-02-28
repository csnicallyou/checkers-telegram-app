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
        <p class="info">Ваш Telegram: <strong>{{ telegramName }}</strong></p>
        
        <!-- Выбор стороны для хоста -->
        <div class="side-selection">
          <h4>Выберите свою сторону:</h4>
          <div class="side-buttons">
            <button 
              @click="selectedSide = 'white'" 
              class="side-btn white"
              :class="{ selected: selectedSide === 'white' }"
            >
              ⚪ Белые
            </button>
            <button 
              @click="selectedSide = 'black'" 
              class="side-btn black"
              :class="{ selected: selectedSide === 'black' }"
            >
              ⚫ Черные
            </button>
          </div>
          <p class="hint">Гость получит противоположную сторону</p>
        </div>

        <button @click="createGame" class="btn create" :disabled="!selectedSide">
          Создать игру
        </button>
      </div>

      <div class="divider">или</div>

      <div class="section">
        <h3>Присоединиться к игре</h3>
        <input 
          v-model="gameCode" 
          placeholder="Введите код игры" 
          class="input"
          maxlength="6"
          @keyup.enter="joinGame"
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
        <!-- Хост -->
        <div class="player host">
          <div class="player-name">
            {{ telegramName }}
            <span class="badge">Хост</span>
          </div>
          <div class="player-side" :class="{ 'white-side': hostSide === 'white', 'black-side': hostSide === 'black' }">
            {{ hostSide === 'white' ? '⚪ Белые' : '⚫ Черные' }}
          </div>
          <div v-if="playerRole === 'host'" class="ready-indicator">
            <span v-if="hostReady" class="ready-badge">✅ Готов</span>
          </div>
        </div>
        
        <div class="vs">VS</div>
        
        <!-- Гость -->
        <div class="player guest">
          <div class="player-name">
            {{ guestName || 'Ожидание...' }}
            <span v-if="guestName" class="badge">Гость</span>
          </div>
          <div v-if="guestSide" class="player-side" :class="{ 'white-side': guestSide === 'white', 'black-side': guestSide === 'black' }">
            {{ guestSide === 'white' ? '⚪ Белые' : '⚫ Черные' }}
          </div>
          <div v-if="playerRole === 'guest' && guestName" class="ready-section">
            <button 
              @click="toggleReady" 
              class="ready-btn"
              :class="{ ready: guestReady }"
            >
              {{ guestReady ? '✅ Готов' : '⏳ Готов?' }}
            </button>
          </div>
          <div v-else-if="guestReady" class="ready-indicator">
            <span class="ready-badge">✅ Готов</span>
          </div>
        </div>
      </div>

      <!-- Для хоста: кнопка начала игры -->
      <div v-if="playerRole === 'host' && guestName" class="start-section">
        <div v-if="!guestReady" class="guest-waiting">
          ⏳ Ожидание готовности гостя...
        </div>
        <button 
          v-else
          @click="startGame" 
          class="btn start"
        >
          🎮 Начать игру
        </button>
      </div>

      <!-- Для хоста: ожидание гостя -->
      <div v-else-if="playerRole === 'host' && !guestName" class="waiting">
        <p>Ожидание второго игрока...</p>
        <p class="hint">Отправьте код другу: <strong>{{ gameId }}</strong></p>
      </div>

      <!-- Для гостя: ожидание начала -->
      <div v-else-if="playerRole === 'guest' && guestName" class="waiting">
        <p v-if="!hostReady">⏳ Ожидание готовности хоста...</p>
        <p v-else-if="guestReady && !gameStarted">✅ Вы готовы. Ожидание начала игры...</p>
        <p v-else>Ожидание начала игры...</p>
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
    const playerRole = ref(null); // 'host' или 'guest'
    const selectedSide = ref('white'); // для хоста
    const hostSide = ref(null);
    const guestSide = ref(null);
    const guestName = ref(null);
    const hostReady = ref(false);
    const guestReady = ref(false);
    const gameStarted = ref(false);
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
            gameId.value = data.gameId;
            playerRole.value = 'host';
            hostSide.value = data.hostSide;
            guestSide.value = data.guestSide;
            hostName.value = telegramName.value;
            emit('game-created', { id: data.gameId });
        };

        telegramMultiplayer.onGameJoined = (data) => {
            gameId.value = data.gameId;
            playerRole.value = 'guest';
            hostSide.value = data.hostSide;
            guestSide.value = data.guestSide;
            hostName.value = data.hostName;
            guestName.value = data.guestName;
            emit('game-joined', { id: data.gameId });
        };

        telegramMultiplayer.onPlayerJoined = (data) => {
            guestName.value = data.guestName;
            guestSide.value = data.guestSide;
            console.log('👋 Гость подключился:', data.guestName);
        };

        telegramMultiplayer.onPlayerReady = (data) => {
            if (data.role === 'host') {
                hostReady.value = data.ready;
            } else {
                guestReady.value = data.ready;
            }
        };


        telegramMultiplayer.onGameStarted = (data) => {
            gameStarted.value = true;
            emit('start-game', {
                id: gameId.value,
                playerRole: data.playerRole,
                playerName: data.playerName,
                playerColor: data.playerColor,
                opponentName: data.opponentName,
                opponentColor: data.opponentColor
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
      telegramMultiplayer.createGame(selectedSide.value);
    };

    const joinGame = () => {
      if (!gameCode.value) return;
      telegramMultiplayer.joinGame(gameCode.value);
    };

    const toggleReady = () => {
      const newReadyState = !guestReady.value;
      guestReady.value = newReadyState;
      telegramMultiplayer.sendReady(gameId.value, newReadyState);
    };

    const startGame = () => {
      telegramMultiplayer.startGame(gameId.value);
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
      selectedSide,
      hostSide,
      guestSide,
      guestName,
      hostReady,
      guestReady,
      gameStarted,
      error,
      telegramName,
      createGame,
      joinGame,
      toggleReady,
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
  font-weight: bold;
}

.side-selection {
  margin: 20px 0;
  padding: 15px;
  background: #f0f0f0;
  border-radius: 8px;
}

.side-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 15px 0;
}

.side-btn {
  padding: 10px 20px;
  border: 2px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
  flex: 1;
  max-width: 120px;
}

.side-btn.white {
  background: white;
  color: #333;
}

.side-btn.black {
  background: #333;
  color: white;
}

.side-btn.selected {
  border-color: #4CAF50;
  transform: scale(1.05);
}

.hint {
  font-size: 14px;
  color: #666;
  margin-top: 10px;
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
  transition: all 0.2s;
}

.btn.create { background: #4CAF50; }
.btn.join { background: #2196F3; }
.btn.start { background: #FF9800; }

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

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
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
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
  font-weight: bold;
  padding: 4px;
  border-radius: 4px;
  margin: 5px 0;
}

.player-side.white-side { 
  background: #2196F3; 
  color: white;
}

.player-side.black-side { 
  background: #f44336; 
  color: white;
}

.ready-section {
  margin-top: 10px;
}

.ready-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  background: #ff9800;
  color: white;
  transition: all 0.2s;
}

.ready-btn.ready {
  background: #4CAF50;
}

.ready-indicator {
  margin-top: 10px;
}

.ready-badge {
  display: inline-block;
  padding: 4px 8px;
  background: #4CAF50;
  color: white;
  border-radius: 4px;
  font-size: 12px;
}

.vs {
  font-size: 20px;
  font-weight: bold;
  margin: 0 15px;
}

.start-section {
  text-align: center;
  margin: 20px 0;
}

.guest-waiting {
  padding: 10px;
  background: #fff3cd;
  border-radius: 8px;
  color: #856404;
  margin-bottom: 10px;
}

.waiting {
  text-align: center;
  padding: 20px;
  background: #fff3cd;
  border-radius: 8px;
  color: #856404;
}

.error {
  margin-top: 15px;
  padding: 12px;
  background: #ffebee;
  color: #c62828;
  border-radius: 6px;
}
</style>