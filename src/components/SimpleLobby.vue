<template>
  <div class="simple-lobby">
    <div class="header">
      <button @click="goBack" class="back-btn">← Назад</button>
      <h2>Мультиплеер</h2>
      <div style="width: 60px;"></div>
    </div>

    <div v-if="!connected" class="status">
      <div class="spinner"></div>
      <p>Подключение к серверу...</p>
    </div>

    <!-- МЕНЮ (когда нет игры) -->
    <div v-else-if="!gameId" class="menu">
      <div class="section">
        <h3>👉 ХОСТ - создать игру</h3>
        <div class="side-select">
          <button 
            @click="hostSide = 'white'" 
            :class="{ active: hostSide === 'white' }"
          >
            ⚪ Играть за белых
          </button>
          <button 
            @click="hostSide = 'black'" 
            :class="{ active: hostSide === 'black' }"
          >
            ⚫ Играть за черных
          </button>
        </div>
        <button @click="hostCreate" class="host-btn" :disabled="!hostSide">
          Создать игру
        </button>
      </div>

      <div class="divider">или</div>

      <div class="section">
        <h3>👉 ГОСТЬ - присоединиться</h3>
        <input 
          v-model="gameCode" 
          placeholder="Введите код игры" 
          class="input"
          maxlength="6"
          @keyup.enter="guestJoin"
        >
        <button @click="guestJoin" class="guest-btn" :disabled="!gameCode">
          Присоединиться
        </button>
      </div>

      <div v-if="error" class="error">{{ error }}</div>
    </div>

    <!-- КОМНАТА (когда есть игра) -->
    <div v-else class="room">
      <h3>Комната {{ gameId }}</h3>
      
      <div class="game-code">
        Код: <strong>{{ gameId }}</strong>
        <button @click="copyCode" class="copy-btn">📋</button>
      </div>
      
      <div class="players">
        <!-- ХОСТ -->
        <div class="player host-card" :class="{ 'active': isHost }">
          <div class="player-role">ХОСТ</div>
          <div class="player-name">{{ isHost ? 'Вы' : 'Соперник' }}</div>
          <div class="player-side" :class="hostSideClass">
            {{ hostSide === 'white' ? '⚪ Белые' : '⚫ Черные' }}
          </div>
          <div v-if="isHost && hostReady" class="ready-badge">✅ Готов</div>
        </div>
        
        <div class="vs">VS</div>
        
        <!-- ГОСТЬ -->
        <div class="player guest-card" :class="{ 'active': !isHost }">
          <div class="player-role">ГОСТЬ</div>
          <div class="player-name">
            {{ !isHost ? 'Вы' : (guestName || 'Ожидание...') }}
          </div>
          <div v-if="guestSide" class="player-side" :class="guestSideClass">
            {{ guestSide === 'white' ? '⚪ Белые' : '⚫ Черные' }}
          </div>
          <div v-if="!isHost && guestReady" class="ready-badge">✅ Готов</div>
        </div>
      </div>

      <!-- ГОСТЬ: кнопка готовности -->
      <div v-if="!isHost && guestSide" class="guest-controls">
        <button 
          @click="guestSetReady" 
          class="ready-btn"
          :class="{ ready: guestReady }"
          :disabled="guestReady"
        >
          {{ guestReady ? '✅ Вы готовы' : '⏳ Я готов' }}
        </button>
      </div>

      <!-- ХОСТ: статус и кнопка старта -->
      <div v-if="isHost" class="host-controls">
        <div v-if="!guestSide" class="waiting-message">
          <div class="spinner-small"></div>
          <p>⏳ Ожидание подключения гостя...</p>
          <p class="hint">Код игры: <strong>{{ gameId }}</strong></p>
        </div>
        
        <div v-else-if="guestSide && !guestReady" class="waiting-message">
          <p>⏳ Гость ({{ guestName || 'игрок' }}) еще не готов</p>
        </div>
        
        <div v-else-if="guestSide && guestReady" class="start-section">
          <p class="ready-message">✅ Гость готов!</p>
          <button 
            @click="hostStartGame" 
            class="start-btn"
          >
            🎮 Начать игру
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { simpleGame } from '../services/simpleGame';
import { telegram } from '../services/telegram';

export default {
  name: 'SimpleLobby',
  emits: ['back', 'game-start'],
  setup(props, { emit }) {
    const gameCode = ref('');
    const gameId = ref(null);
    const hostSide = ref('white');
    const guestSide = ref(null);
    const guestName = ref(null);
    const isHost = ref(false);
    const hostReady = ref(false);
    const guestReady = ref(false);
    const connected = ref(false);
    const error = ref('');

    const hostSideClass = computed(() => ({
      'white-side': hostSide.value === 'white',
      'black-side': hostSide.value === 'black'
    }));

    const guestSideClass = computed(() => ({
      'white-side': guestSide.value === 'white',
      'black-side': guestSide.value === 'black'
    }));

    onMounted(async () => {
      telegram.init();
      
      try {
        await simpleGame.connect();
        connected.value = true;
        console.log('✅ Connected to server');
        
        simpleGame.onHostCreated = (data) => {
            console.log('🎮 Игра создана:', data);
            gameId.value = data.gameId;
            isHost.value = true;
            hostSide.value = data.side;
            hostName.value = simpleGame.myName;
            guestSide.value = null;
            guestName.value = null;
            guestReady.value = false;
        };

        simpleGame.onGuestJoined = (data) => {
            console.log('👋 Событие guestJoined:', data, 'isHost:', isHost.value);
            
            if (isHost.value) {
                // Мы хост - к нам присоединился гость
                guestName.value = data.guestName;
                guestSide.value = data.guestSide;
                console.log(`✅ Хост видит подключение гостя ${data.guestName} за ${data.guestSide}`);
            } else {
                // Мы гость - мы присоединились
                gameId.value = data.gameId;
                guestSide.value = data.mySide;
                hostSide.value = data.hostSide;
                hostName.value = data.hostName;
                console.log(`✅ Гость подключился за ${data.mySide}, хост: ${data.hostName}`);
            }
        };

        simpleGame.onGuestReady = () => {
            console.log('✅ Гость готов');
            guestReady.value = true;
        };

        simpleGame.onGameStart = (data) => {
            console.log('🎮 Игра начинается:', data);
            emit('game-start', {
                myColor: data.myColor,
                opponentColor: data.opponentColor,
                opponentName: data.opponentName
            });
        };
        
        simpleGame.onHostLeft = () => {
          error.value = 'Хост покинул игру';
          setTimeout(() => {
            gameId.value = null;
            isHost.value = false;
            guestSide.value = null;
            error.value = '';
          }, 2000);
        };
        
        simpleGame.onGuestLeft = () => {
          if (isHost.value) {
            guestSide.value = null;
            guestReady.value = false;
            error.value = 'Гость покинул игру';
            setTimeout(() => {
              error.value = '';
            }, 2000);
          }
        };
        
        simpleGame.onError = (msg) => {
          error.value = msg;
        };
        
      } catch (e) {
        console.error('Connection error:', e);
        error.value = 'Не удалось подключиться к серверу';
      }
    });

    onUnmounted(() => {
      simpleGame.disconnect();
    });

    const hostCreate = () => {
      simpleGame.hostCreate(hostSide.value);
    };

    const guestJoin = () => {
      if (!gameCode.value) return;
      simpleGame.guestJoin(gameCode.value);
    };

    const guestSetReady = () => {
      guestReady.value = true;
      simpleGame.guestReady();
    };

    const hostStartGame = () => {
      simpleGame.hostStart();
    };

    const copyCode = () => {
      navigator.clipboard.writeText(gameId.value);
      error.value = 'Код скопирован!';
      setTimeout(() => error.value = '', 2000);
    };

    const goBack = () => {
      simpleGame.disconnect();
      emit('back');
    };

    return {
      gameCode,
      gameId,
      hostSide,
      guestSide,
      guestName,
      isHost,
      hostReady,
      guestReady,
      connected,
      error,
      hostSideClass,
      guestSideClass,
      hostCreate,
      guestJoin,
      guestSetReady,
      hostStartGame,
      copyCode,
      goBack
    };
  }
};
</script>

<style scoped>
.simple-lobby {
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

.side-select {
  display: flex;
  gap: 10px;
  margin: 15px 0;
}

.side-select button {
  flex: 1;
  padding: 10px;
  cursor: pointer;
  border: 2px solid #ddd;
  background: white;
  border-radius: 6px;
  font-size: 14px;
}

.side-select button.active {
  border-color: #4CAF50;
  background: #e8f5e9;
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

.host-btn, .guest-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  color: white;
  cursor: pointer;
}

.host-btn {
  background: #4CAF50;
}

.guest-btn {
  background: #2196F3;
}

.host-btn:disabled, .guest-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.divider {
  text-align: center;
  color: #999;
  margin: 20px 0;
}

.room {
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.game-code {
  font-size: 18px;
  text-align: center;
  margin: 20px 0;
  padding: 15px;
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
  margin: 30px 0;
  gap: 15px;
}

.player {
  flex: 1;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  background: white;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.player.active {
  border-color: #4CAF50;
  background: #e8f5e9;
}

.host-card {
  background: #e3f2fd;
}

.guest-card {
  background: #fce4ec;
}

.player-role {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.player-name {
  font-weight: bold;
  margin-bottom: 10px;
}

.player-side {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.white-side {
  background: #2196F3;
  color: white;
}

.black-side {
  background: #f44336;
  color: white;
}

.ready-badge {
  margin-top: 10px;
  color: #4CAF50;
  font-weight: bold;
}

.vs {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.guest-controls, .host-controls {
  text-align: center;
  margin: 20px 0;
}

.ready-btn {
  padding: 12px 30px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  background: #ff9800;
  color: white;
  transition: all 0.2s;
}

.ready-btn.ready {
  background: #4CAF50;
}

.ready-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.waiting-message {
  padding: 20px;
  background: #fff3cd;
  border-radius: 8px;
  color: #856404;
}

.spinner-small {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

.hint {
  font-size: 14px;
  margin-top: 10px;
}

.start-section {
  text-align: center;
}

.ready-message {
  color: #4CAF50;
  font-weight: bold;
  margin-bottom: 15px;
}

.start-btn {
  padding: 15px 40px;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  background: #4CAF50;
  color: white;
  transition: all 0.2s;
}

.start-btn:hover {
  transform: scale(1.05);
  background: #45a049;
}

.error {
  margin-top: 15px;
  padding: 12px;
  background: #ffebee;
  color: #c62828;
  border-radius: 6px;
}

@media (max-width: 480px) {
  .simple-lobby {
    margin: 10px;
    padding: 15px;
  }
  
  .players {
    flex-direction: column;
    gap: 10px;
  }
  
  .player {
    width: 100%;
  }
  
  .vs {
    transform: rotate(90deg);
    margin: 5px 0;
  }
}
</style>