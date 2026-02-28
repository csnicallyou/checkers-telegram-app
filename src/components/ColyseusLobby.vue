<template>
  <div class="multiplayer-lobby">
    <div class="lobby-header">
      <button @click="goBack" class="back-btn">← Назад</button>
      <h2>Мультиплеер (Colyseus)</h2>
      <div style="width: 60px;"></div>
    </div>

    <div v-if="connectionStatus === 'connecting'" class="status connecting">
      <div class="spinner"></div>
      <p>Подключение к серверу...</p>
    </div>

    <div v-else-if="connectionStatus === 'error'" class="status error">
      <p>❌ Ошибка подключения к серверу</p>
      <button @click="connect" class="retry-btn">Повторить</button>
    </div>

    <div v-else-if="!currentGame" class="lobby-content">
      <div class="section">
        <h3>Создать новую игру</h3>
        <input 
          v-model="playerName" 
          placeholder="Ваше имя" 
          class="input-field"
        >
        <button @click="createGame" class="create-btn" :disabled="!playerName">
          Создать игру
        </button>
      </div>

      <div class="divider">или</div>

      <div class="section">
        <h3>Присоединиться к игре</h3>
        <input 
          v-model="gameIdInput" 
          placeholder="Код игры" 
          class="input-field"
          maxlength="8"
        >
        <button @click="joinGame" class="join-btn" :disabled="!gameIdInput">
          Присоединиться
        </button>
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>

    <div v-else class="game-room">
      <h3>Комната игры</h3>
      <div class="game-code">
        Код: <strong>{{ currentGame.id }}</strong>
        <button @click="copyCode" class="copy-btn">📋</button>
      </div>
      
      <div class="players">
        <div class="player host">
          <span>{{ currentGame.host?.name || 'Хост' }}</span>
          <span class="color white">⚪</span>
        </div>
        <div class="vs">VS</div>
        <div class="player guest">
          <span>{{ currentGame.guest?.name || 'Ожидание...' }}</span>
          <span v-if="currentGame.guest" class="color black">⚫</span>
        </div>
      </div>

      <button v-if="isHost && !gameStarted" @click="startGame" class="start-btn">
        Начать игру
      </button>

      <button v-if="gameStarted" @click="goToGame" class="play-btn">
        Перейти к игре
      </button>
    </div>
  </div>
</template>

<script>
console.log('🚀 ColyseusLobby компонент начал загрузку');
import { ref, onMounted, onUnmounted } from 'vue';
import { colyseusMultiplayer } from '../services/colyseusMultiplayer';
import { telegram } from '../telegram';

export default {
  name: 'ColyseusLobby',
  emits: ['back', 'game-created', 'game-joined', 'start-game'],
  setup(props, { emit }) {
    console.log('🎮 ColyseusLobby setup выполняется');    
    const playerName = ref('');
    const gameIdInput = ref('');
    const currentGame = ref(null);
    const connectionStatus = ref('disconnected');
    const errorMessage = ref('');
    const gameStarted = ref(false);
    const isHost = ref(false);

    const connect = async () => {
      connectionStatus.value = 'connecting';
      try {
        await colyseusMultiplayer.connect();
        connectionStatus.value = 'connected';
        
        // Настраиваем обработчики
        colyseusMultiplayer.onGameUpdate = (data) => {
          console.log('Game update:', data);
        };

        colyseusMultiplayer.onPlayerJoined = (data) => {
            console.log('👋 Player joined event:', data);
            if (currentGame.value) {
                currentGame.value.guest = {
                    name: data.player?.name || 'Игрок'
                };
            }
            // Проверяем, есть ли метод vibrate
            if (telegram && typeof telegram.vibrate === 'function') {
                telegram.vibrate();
            } else {
                console.log('📳 Вибрация не поддерживается');
            }
        };

        colyseusMultiplayer.onGameStart = () => {
          gameStarted.value = true;
        };

      } catch (error) {
        console.error('Connection error:', error);
        connectionStatus.value = 'error';
        errorMessage.value = 'Не удалось подключиться к серверу';
      }
    };

    const createGame = async () => {
      try {
        if (connectionStatus.value !== 'connected') {
          await connect();
        }
        
        const result = await colyseusMultiplayer.createGame(playerName.value);
        
        currentGame.value = {
          id: result.gameId,
          host: { name: playerName.value }
        };
        isHost.value = true;
        
        telegram.vibrate();
        emit('game-created', currentGame.value);
        
      } catch (error) {
        errorMessage.value = error.message || 'Ошибка создания игры';
      }
    };

    const joinGame = async () => {
      try {
        if (connectionStatus.value !== 'connected') {
          await connect();
        }
        
        const result = await colyseusMultiplayer.joinGame(
          gameIdInput.value.toUpperCase(), 
          playerName.value
        );
        
        // Получаем информацию о хосте из комнаты
        const gameInfo = {
          id: gameIdInput.value.toUpperCase(),
          guest: { name: playerName.value }
        };
        
        currentGame.value = gameInfo;
        isHost.value = false;
        
        telegram.vibrate();
        emit('game-joined', currentGame.value);
        
      } catch (error) {
        errorMessage.value = error.message || 'Ошибка присоединения к игре';
      }
    };

    const startGame = () => {
      colyseusMultiplayer.startGame();
      emit('start-game', currentGame.value);
    };

    const goToGame = () => {
      emit('start-game', currentGame.value);
    };

    const copyCode = () => {
      if (currentGame.value) {
        navigator.clipboard.writeText(currentGame.value.id);
        telegram.showNotification('Код скопирован!');
      }
    };

    const goBack = () => {
      colyseusMultiplayer.leave();
      emit('back');
    };

    onMounted(() => {
      connect();
    });

    onUnmounted(() => {
      colyseusMultiplayer.leave();
    });

    return {
      playerName,
      gameIdInput,
      currentGame,
      connectionStatus,
      errorMessage,
      gameStarted,
      isHost,
      connect,
      createGame,
      joinGame,
      startGame,
      goToGame,
      copyCode,
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

.status.connecting {
  color: #2196F3;
}

.status.error {
  color: #f44336;
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
  text-align: center;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 20px;
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

.create-btn, .join-btn, .start-btn, .play-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  color: white;
  cursor: pointer;
}

.create-btn { background: #4CAF50; }
.join-btn { background: #2196F3; }
.start-btn { background: #FF9800; }
.play-btn { background: #4CAF50; }

.create-btn:disabled, .join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.divider {
  text-align: center;
  color: #999;
  margin: 20px 0;
}

.game-room {
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.game-code {
  font-size: 18px;
  text-align: center;
  margin-bottom: 20px;
  padding: 10px;
  background: white;
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
  margin: 20px 0;
}

.player {
  flex: 1;
  padding: 15px;
  text-align: center;
  border-radius: 8px;
}

.player.host { background: #e3f2fd; }
.player.guest { background: #fce4ec; }

.vs {
  font-size: 20px;
  font-weight: bold;
  margin: 0 10px;
}

.color {
  display: inline-block;
  margin-left: 5px;
}

.color.white { color: #333; }
.color.black { color: #666; }

.error-message {
  margin-top: 15px;
  padding: 12px;
  background: #ffebee;
  color: #c62828;
  border-radius: 6px;
}
</style>