<template>
  <div class="lobby">
    <div class="header">
      <button @click="goBack" class="back-btn">← Назад</button>
      <h2>Мультиплеер</h2>
      <div style="width: 60px;"></div>
    </div>

    <div v-if="!connected" class="status connecting">
      <div class="spinner"></div>
      <p>Подключение к серверу...</p>
    </div>

    <div v-else-if="!gameId" class="menu">
      <div class="section">
        <h3>Создать новую игру</h3>
        <input 
          v-model="playerName" 
          placeholder="Ваше имя" 
          class="input"
        >
        <button @click="createGame" class="btn create" :disabled="!playerName">
          Создать игру
        </button>
      </div>

      <div class="divider">или</div>

      <div class="section">
        <h3>Присоединиться к игре</h3>
        <input 
          v-model="gameCode" 
          placeholder="Код игры" 
          class="input"
          maxlength="6"
        >
        <input 
          v-model="playerName" 
          placeholder="Ваше имя" 
          class="input"
        >
        <button @click="joinGame" class="btn join" :disabled="!gameCode || !playerName">
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
        <div class="player" :class="{ host: isHost }">
          <span class="name">{{ playerName }}</span>
          <span class="badge">Вы</span>
          <span class="color white">⚪</span>
        </div>
        
        <div class="vs">VS</div>
        
        <div class="player">
          <span class="name">{{ opponent?.name || 'Ожидание...' }}</span>
          <span v-if="opponent" class="color black">⚫</span>
        </div>
      </div>

      <button 
        v-if="isHost && opponent" 
        @click="startGame" 
        class="btn start"
      >
        Начать игру
      </button>
      
      <div v-else-if="isHost && !opponent" class="waiting">
        <p>Ожидание второго игрока...</p>
        <p class="hint">Отправьте код другу: <strong>{{ gameId }}</strong></p>
      </div>
      
      <div v-else-if="!isHost && !opponent" class="waiting">
        <p>Подключение к игре...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { simpleMultiplayer } from '../services/simpleMultiplayer';

export default {
  name: 'SimpleLobby',
  emits: ['back', 'game-created', 'game-joined', 'start-game'],
  setup(props, { emit }) {
    const playerName = ref('');
    const gameCode = ref('');
    const gameId = ref(null);
    const connected = ref(false);
    const isHost = ref(false);
    const opponent = ref(null);
    const error = ref('');

    onMounted(async () => {
      try {
        await simpleMultiplayer.connect();
        connected.value = true;
        
        simpleMultiplayer.onGameCreated = (data) => {
          gameId.value = data.gameId;
          isHost.value = true;
          emit('game-created', { id: data.gameId, host: { name: playerName.value } });
        };
        
        simpleMultiplayer.onGameJoined = (data) => {
          gameId.value = data.gameId;
          isHost.value = false;
          opponent.value = { name: data.host.name };
          emit('game-joined', { id: data.gameId, host: data.host });
        };
        
        simpleMultiplayer.onPlayerJoined = (data) => {
          opponent.value = { name: data.guest.name };
        };
        
        simpleMultiplayer.onGameStarted = () => {
          emit('start-game', { id: gameId.value });
        };
        
        simpleMultiplayer.onError = (msg) => {
          error.value = msg;
        };
        
        simpleMultiplayer.onOpponentLeft = () => {
          opponent.value = null;
          error.value = 'Соперник покинул игру';
        };
        
      } catch (e) {
        error.value = 'Не удалось подключиться к серверу';
      }
    });

    onUnmounted(() => {
      simpleMultiplayer.leaveGame();
    });

    const createGame = () => {
      if (!playerName.value) return;
      simpleMultiplayer.createGame(playerName.value);
    };

    const joinGame = () => {
      if (!gameCode.value || !playerName.value) return;
      simpleMultiplayer.joinGame(gameCode.value, playerName.value);
    };

    const startGame = () => {
      simpleMultiplayer.startGame();
    };

    const copyCode = () => {
      navigator.clipboard.writeText(gameId.value);
      error.value = 'Код скопирован!';
      setTimeout(() => error.value = '', 2000);
    };

    const goBack = () => {
      simpleMultiplayer.leaveGame();
      emit('back');
    };

    return {
      playerName,
      gameCode,
      gameId,
      connected,
      isHost,
      opponent,
      error,
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
  text-align: center;
  border-radius: 8px;
  background: #f0f0f0;
  position: relative;
}

.player.host {
  background: #e3f2fd;
}

.name {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
}

.badge {
  display: inline-block;
  padding: 2px 6px;
  background: #4CAF50;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 5px;
}

.color {
  display: inline-block;
  font-size: 20px;
}

.color.white { color: #333; }
.color.black { color: #666; }

.vs {
  font-size: 20px;
  font-weight: bold;
  margin: 0 15px;
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