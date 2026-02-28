<template>
  <div class="multiplayer-lobby">
    <div class="lobby-header">
      <button @click="goBack" class="back-btn">← Назад</button>
      <h2>Мультиплеер</h2>
      <div style="width: 60px;"></div>
    </div>

    <!-- Индикатор подключения -->
    <div v-if="!isConnected" class="connection-status error">
      <p>❌ Нет подключения к серверу</p>
      <button @click="connect" class="reconnect-btn">Подключиться</button>
    </div>

    <div v-else-if="!currentGame" class="lobby-content">
      <div class="section">
        <h3>Создать новую игру</h3>
        <input 
          v-model="playerName" 
          placeholder="Ваше имя" 
          class="input-field"
          maxlength="20"
        >
        <button @click="createGame" class="create-btn" :disabled="!playerName || isLoading">
          {{ isLoading ? 'Создание...' : 'Создать игру' }}
        </button>
      </div>

      <div class="divider">или</div>

      <div class="section">
        <h3>Присоединиться к игре</h3>
        <input 
          v-model="gameIdInput" 
          placeholder="Код игры (6 символов)" 
          class="input-field"
          maxlength="8"
          @keyup.enter="joinGame"
        >
        <button @click="joinGame" class="join-btn" :disabled="!gameIdInput || isLoading">
          {{ isLoading ? 'Подключение...' : 'Присоединиться' }}
        </button>
      </div>

      <!-- Сообщение об ошибке -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>

    <div v-else class="game-room">
      <h3>Комната игры</h3>
      <div class="game-code">
        Код игры: <strong>{{ currentGame.id }}</strong>
        <button @click="copyCode" class="copy-btn" title="Копировать код">📋</button>
      </div>
      
      <div class="players">
        <div class="player host" :class="{ 'active': currentGame.host }">
          <span class="player-name">{{ currentGame.host.name }}</span>
          <span class="player-color white">⚪ Белые</span>
          <span v-if="isHost" class="player-badge">Вы</span>
        </div>
        
        <div class="vs">VS</div>
        
        <div class="player guest" :class="{ 'active': currentGame.guest }">
          <span v-if="currentGame.guest" class="player-name">
            {{ currentGame.guest.name }}
          </span>
          <span v-else class="waiting">Ожидание игрока...</span>
          <span v-if="currentGame.guest" class="player-color black">⚫ Черные</span>
          <span v-if="!isHost && currentGame.guest" class="player-badge">Вы</span>
        </div>
      </div>

      <div v-if="isHost && !currentGame.guest" class="invite-section">
        <p>Отправьте этот код другу:</p>
        <div class="invite-code">{{ currentGame.id }}</div>
        <button @click="copyCode" class="copy-big-btn">Копировать код</button>
      </div>

      <div v-if="currentGame.guest && gameStatus === 'ready' && isHost" class="start-section">
        <button @click="startGame" class="start-btn">
          Начать игру
        </button>
      </div>

      <div v-if="currentGame.guest && gameStatus === 'ready' && !isHost" class="waiting-start">
        <p>Ожидание начала игры хостом...</p>
        <div class="spinner-small"></div>
      </div>

      <div v-if="gameStatus === 'playing'" class="game-link">
        <button @click="goToGame" class="play-btn">
          Перейти к игре
        </button>
      </div>

      <!-- Сообщение об ошибке -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>

    <div class="lobby-footer">
      <button @click="goBack" class="back-bottom-btn">← Вернуться к выбору режима</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { multiplayer } from '../services/multiplayer';
import { telegram } from '../services/telegram';

export default {
  name: 'MultiplayerLobby',
  emits: ['back', 'game-created', 'game-joined', 'start-game', 'back-to-mode-selection'],
  setup(props, { emit }) {
    const playerName = ref('');
    const gameIdInput = ref('');
    const currentGame = ref(null);
    const isLoading = ref(false);
    const errorMessage = ref('');
    const isConnected = ref(false);
    const gameStatus = ref('waiting');

    const isHost = computed(() => {
      return currentGame.value?.host?.name === playerName.value;
    });

    // Подключение к серверу
    const connect = async () => {
      try {
        isLoading.value = true;
        errorMessage.value = '';
        await multiplayer.connect();
        isConnected.value = true;
        
        // Настраиваем обработчики
        multiplayer.onGameUpdate = (game) => {
          currentGame.value = game;
          gameStatus.value = game.status || 'waiting';
        };
        
        multiplayer.onPlayerJoined = (player) => {
          if (currentGame.value) {
            currentGame.value.guest = player;
            gameStatus.value = 'ready';
          }
          telegram.vibrate('light');
        };
        
        multiplayer.onGameStart = (game) => {
          gameStatus.value = 'playing';
          currentGame.value = game;
          telegram.vibrate('medium');
        };
        
        multiplayer.onError = (message) => {
          errorMessage.value = message;
          isLoading.value = false;
        };
        
        multiplayer.onOpponentDisconnected = () => {
          errorMessage.value = 'Соперник отключился';
          currentGame.value = null;
          gameStatus.value = 'waiting';
        };
        
      } catch (error) {
        console.error('Ошибка подключения:', error);
        errorMessage.value = 'Не удалось подключиться к серверу';
        isConnected.value = false;
      } finally {
        isLoading.value = false;
      }
    };

    // Создание игры
    const createGame = async () => {
      if (!playerName.value.trim()) {
        errorMessage.value = 'Введите имя';
        return;
      }
      
      isLoading.value = true;
      errorMessage.value = '';
      
      try {
        if (!isConnected.value) {
          await connect();
        }
        
        multiplayer.createGame(playerName.value);
        telegram.vibrate();
        
      } catch (error) {
        console.error('Ошибка создания игры:', error);
        errorMessage.value = 'Не удалось создать игру';
      } finally {
        isLoading.value = false;
      }
    };

    // Присоединение к игре
    const joinGame = async () => {
      const gameId = gameIdInput.value.trim().toUpperCase();
      
      if (!gameId) {
        errorMessage.value = 'Введите код игры';
        return;
      }
      
      if (gameId.length < 4) {
        errorMessage.value = 'Код должен содержать минимум 4 символа';
        return;
      }
      
      if (!playerName.value.trim()) {
        errorMessage.value = 'Введите ваше имя';
        return;
      }
      
      isLoading.value = true;
      errorMessage.value = '';
      
      try {
        if (!isConnected.value) {
          await connect();
        }
        
        // Проверяем существование игры
        const status = await multiplayer.checkGameStatus(gameId);
        
        if (!status.success) {
          errorMessage.value = 'Игра не найдена';
          isLoading.value = false;
          return;
        }
        
        if (status.game.guest) {
          errorMessage.value = 'Игра уже заполнена';
          isLoading.value = false;
          return;
        }
        
        multiplayer.joinGame(gameId, playerName.value);
        telegram.vibrate();
        
      } catch (error) {
        console.error('Ошибка присоединения:', error);
        errorMessage.value = 'Не удалось присоединиться к игре';
      } finally {
        isLoading.value = false;
      }
    };

    // Копирование кода
    const copyCode = () => {
      if (currentGame.value) {
        navigator.clipboard.writeText(currentGame.value.id);
        errorMessage.value = 'Код скопирован!';
        setTimeout(() => {
          if (errorMessage.value === 'Код скопирован!') {
            errorMessage.value = '';
          }
        }, 2000);
      }
    };

    // Начать игру
    const startGame = () => {
      if (isHost.value) {
        multiplayer.startGame();
        emit('start-game', currentGame.value);
      }
    };

    // Перейти к игре
    const goToGame = () => {
      emit('start-game', currentGame.value);
    };

    // Вернуться назад
    const goBack = () => {
      multiplayer.disconnect();
      emit('back-to-mode-selection');
    };

    onMounted(() => {
      // Автоматически подключаемся при загрузке
      connect();
      
      // Загружаем сохраненное имя
      const savedName = localStorage.getItem('playerName');
      if (savedName) {
        playerName.value = savedName;
      }
    });

    onUnmounted(() => {
      multiplayer.disconnect();
    });

    return {
      playerName,
      gameIdInput,
      currentGame,
      isLoading,
      errorMessage,
      isConnected,
      gameStatus,
      isHost,
      connect,
      createGame,
      joinGame,
      copyCode,
      startGame,
      goToGame,
      goBack
    };
  }
};
</script>

<style scoped>
.multiplayer-lobby {
  max-width: 500px;
  margin: 20px auto;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.lobby-header h2 {
  margin: 0;
  color: #333;
}

.back-btn {
  padding: 8px 16px;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.back-btn:hover {
  background: #e0e0e0;
}

.lobby-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section {
  text-align: center;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.section h3 {
  margin-bottom: 15px;
  color: #555;
}

.input-field {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
}

.input-field:focus {
  outline: none;
  border-color: #5D4037;
}

.create-btn, .join-btn, .copy-btn, .start-btn, .play-btn, .reconnect-btn {
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  color: white;
  transition: all 0.2s;
}

.create-btn {
  background: #4CAF50;
  width: 100%;
}

.create-btn:hover:not(:disabled) {
  background: #45a049;
}

.join-btn {
  background: #2196F3;
  width: 100%;
}

.join-btn:hover:not(:disabled) {
  background: #1976D2;
}

.create-btn:disabled, .join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reconnect-btn {
  background: #FF9800;
  margin-top: 10px;
}

.divider {
  text-align: center;
  color: #999;
  font-weight: bold;
  margin: 10px 0;
}

.game-room {
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  text-align: center;
}

.game-room h3 {
  margin-bottom: 15px;
  color: #333;
}

.game-code {
  font-size: 18px;
  margin-bottom: 20px;
  padding: 10px;
  background: white;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.copy-btn {
  margin-left: 10px;
  padding: 4px 8px;
  background: #f0f0f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.copy-btn:hover {
  background: #e0e0e0;
}

.players {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0;
}

.player {
  flex: 1;
  padding: 15px;
  border-radius: 8px;
  position: relative;
}

.player.host {
  background: #e3f2fd;
  margin-right: 10px;
}

.player.guest {
  background: #fce4ec;
  margin-left: 10px;
}

.player.active {
  border: 2px solid #4CAF50;
}

.player-name {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
  word-break: break-word;
}

.player-color {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.player-color.white {
  background: #333;
  color: white;
}

.player-color.black {
  background: #666;
  color: white;
}

.player-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #4CAF50;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
}

.waiting {
  color: #999;
  font-style: italic;
}

.vs {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  min-width: 40px;
}

.invite-section {
  margin-top: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
}

.invite-code {
  font-size: 32px;
  font-weight: bold;
  letter-spacing: 5px;
  color: #5D4037;
  margin: 15px 0;
  padding: 10px;
  background: #f5f5f5;
  border: 2px dashed #5D4037;
  border-radius: 8px;
}

.copy-big-btn {
  background: #FF9800;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  margin: 10px 0;
}

.copy-big-btn:hover {
  background: #F57C00;
}

.start-section, .game-link {
  margin-top: 20px;
}

.start-btn {
  background: #4CAF50;
  padding: 12px 30px;
  font-size: 18px;
}

.start-btn:hover {
  background: #45a049;
  transform: scale(1.05);
}

.play-btn {
  background: #2196F3;
  padding: 12px 30px;
  font-size: 18px;
}

.play-btn:hover {
  background: #1976D2;
  transform: scale(1.05);
}

.waiting-start {
  padding: 20px;
  background: #f0f0f0;
  border-radius: 8px;
  color: #666;
}

.connection-status {
  text-align: center;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.connection-status.error {
  background: #ffebee;
  color: #c62828;
}

.error-message {
  margin-top: 15px;
  padding: 12px;
  background: #ffebee;
  color: #c62828;
  border-radius: 6px;
  font-size: 14px;
}

.spinner-small {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #5D4037;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 10px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.lobby-footer {
  margin-top: 30px;
  text-align: center;
}

.back-bottom-btn {
  padding: 12px 24px;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
}

.back-bottom-btn:hover {
  background: #e0e0e0;
}
</style>