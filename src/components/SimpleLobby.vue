<template>
  <div class="simple-lobby">
    <h2>Мультиплеер</h2>
    
    <div v-if="!connected" class="status">
      <p>Подключение к серверу...</p>
    </div>

    <!-- МЕНЮ -->
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
        <button @click="hostCreate" class="host-btn">
          Создать игру
        </button>
      </div>

      <hr>

      <div class="section">
        <h3>👉 ГОСТЬ - присоединиться</h3>
        <input v-model="gameCode" placeholder="Введите код игры">
        <button @click="guestJoin" class="guest-btn">
          Присоединиться
        </button>
      </div>

      <div v-if="error" class="error">{{ error }}</div>
    </div>

    <!-- КОМНАТА -->
    <div v-else class="room">
      <h3>Комната {{ gameId }}</h3>
      
      <div class="players">
        <div class="player host">
          <strong>ХОСТ</strong>
          <span>{{ isHost ? 'Вы' : 'Соперник' }}</span>
          <span :class="hostSideClass">
            {{ hostSide === 'white' ? '⚪ Белые' : '⚫ Черные' }}
          </span>
        </div>
        
        <div class="vs">VS</div>
        
        <div class="player guest">
          <strong>ГОСТЬ</strong>
          <span>{{ !isHost ? 'Вы' : 'Соперник' }}</span>
          <span v-if="guestSide" :class="guestSideClass">
            {{ guestSide === 'white' ? '⚪ Белые' : '⚫ Черные' }}
          </span>
          <span v-else>Ожидание...</span>
        </div>
      </div>

      <!-- ГОСТЬ: кнопка готовности -->
      <div v-if="!isHost && guestSide" class="guest-controls">
        <button 
          @click="guestSetReady" 
          class="ready-btn"
          :class="{ ready: guestReady }"
        >
          {{ guestReady ? '✅ Готов' : '⏳ Я готов' }}
        </button>
      </div>

      <!-- ХОСТ: статус и кнопка старта -->
      <div v-if="isHost" class="host-controls">
        <p v-if="!guestSide">⏳ Ожидание гостя...</p>
        <div v-else>
          <p v-if="!guestReady">⏳ Гость еще не готов</p>
          <p v-else class="ready-message">✅ Гость готов!</p>
          <button 
            v-if="guestReady"
            @click="hostStartGame" 
            class="start-btn"
          >
            🎮 Начать игру
          </button>
        </div>
      </div>
    </div>

    <button @click="goBack" class="back-btn">← Назад</button>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { simpleGame } from '../services/simpleGame';

export default {
  emits: ['back', 'game-start'],
  setup(props, { emit }) {
    const gameCode = ref('');
    const gameId = ref(null);
    const hostSide = ref('white');
    const guestSide = ref(null);
    const isHost = ref(false);
    const guestReady = ref(false);
    const connected = ref(false);
    const error = ref('');

    const hostSideClass = computed(() => ({
      white: hostSide.value === 'white',
      black: hostSide.value === 'black'
    }));

    const guestSideClass = computed(() => ({
      white: guestSide.value === 'white',
      black: guestSide.value === 'black'
    }));

    onMounted(async () => {
      await simpleGame.connect();
      connected.value = true;
      
      simpleGame.onHostCreated = (data) => {
        gameId.value = data.gameId;
        isHost.value = true;
        hostSide.value = data.side;
      };
      
      simpleGame.onGuestConnected = (data) => {
        gameId.value = data.gameId;
        isHost.value = false;
        guestSide.value = data.mySide;
        hostSide.value = data.hostSide;
      };
      
      simpleGame.onGuestReady = () => {
        guestReady.value = true;
      };
      
      simpleGame.onGameStart = (data) => {
        emit('game-start', {
          myColor: data.myColor,
          opponentColor: data.opponentColor
        });
      };
      
      simpleGame.onHostLeft = () => {
        error.value = 'Хост покинул игру';
        setTimeout(() => {
          gameId.value = null;
          isHost.value = false;
          guestSide.value = null;
        }, 2000);
      };
      
      simpleGame.onGuestLeft = () => {
        guestSide.value = null;
        guestReady.value = false;
        error.value = 'Гость покинул игру';
      };
      
      simpleGame.onError = (msg) => {
        error.value = msg;
      };
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

    const goBack = () => {
      simpleGame.disconnect();
      emit('back');
    };

    return {
      gameCode,
      gameId,
      hostSide,
      guestSide,
      isHost,
      guestReady,
      connected,
      error,
      hostSideClass,
      guestSideClass,
      hostCreate,
      guestJoin,
      guestSetReady,
      hostStartGame,
      goBack
    };
  }
};
</script>

<style scoped>
.simple-lobby {
  max-width: 400px;
  margin: 20px auto;
  padding: 20px;
  background: white;
  border-radius: 8px;
}

.section {
  margin: 20px 0;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
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
}

.side-select button.active {
  border-color: #4CAF50;
  background: #e8f5e9;
}

input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 2px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 10px 20px;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  font-weight: bold;
}

.host-btn {
  background: #4CAF50;
  color: white;
  width: 100%;
}

.guest-btn {
  background: #2196F3;
  color: white;
  width: 100%;
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

.player.host {
  background: #e3f2fd;
}

.player.guest {
  background: #fce4ec;
}

.player span {
  display: block;
  margin: 5px 0;
}

.vs {
  font-size: 20px;
  font-weight: bold;
  margin: 0 10px;
}

.white { color: #2196F3; font-weight: bold; }
.black { color: #f44336; font-weight: bold; }

.guest-controls, .host-controls {
  text-align: center;
  margin: 20px 0;
}

.ready-btn {
  background: #ff9800;
  color: white;
  padding: 10px 30px;
}

.ready-btn.ready {
  background: #4CAF50;
}

.start-btn {
  background: #4CAF50;
  color: white;
  padding: 10px 30px;
  font-size: 16px;
}

.ready-message {
  color: #4CAF50;
  font-weight: bold;
}

.error {
  color: #f44336;
  margin: 10px 0;
  padding: 10px;
  background: #ffebee;
  border-radius: 4px;
}

.back-btn {
  margin-top: 20px;
  background: #9e9e9e;
  color: white;
  width: 100%;
}

hr {
  margin: 20px 0;
}
</style>