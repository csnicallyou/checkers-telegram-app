<template>
  <div class="multiplayer-lobby">
    <!-- ... остальной код ... -->
    
    <div v-else class="game-room">
      <h3>Комната игры</h3>
      <div class="game-code">
        Код: <strong>{{ currentGame.id }}</strong>
        <button @click="copyCode" class="copy-btn">📋</button>
      </div>
      
      <div class="players">
        <div class="player host" :class="{ 'current': isHost }">
          <span class="player-name">{{ gamePlayers.host || 'Ожидание...' }}</span>
          <span class="player-color white">⚪ Белые</span>
          <span v-if="isHost" class="player-badge">Вы</span>
        </div>
        
        <div class="vs">VS</div>
        
        <div class="player guest" :class="{ 'current': !isHost && gamePlayers.guest }">
          <span class="player-name">{{ gamePlayers.guest || 'Ожидание...' }}</span>
          <span v-if="gamePlayers.guest" class="player-color black">⚫ Черные</span>
          <span v-if="!isHost && gamePlayers.guest" class="player-badge">Вы</span>
        </div>
      </div>

      <!-- ... остальной код ... -->
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, reactive } from 'vue';
import { colyseusMultiplayer } from '../services/colyseusMultiplayer';
import { telegram } from '../telegram';

export default {
  name: 'ColyseusLobby',
  emits: ['back', 'game-created', 'game-joined', 'start-game'],
  setup(props, { emit }) {
    const playerName = ref('');
    const gameIdInput = ref('');
    const currentGame = ref(null);
    const connectionStatus = ref('disconnected');
    const errorMessage = ref('');
    const gameStarted = ref(false);
    const isHost = ref(false);
    
    const gamePlayers = reactive({
      host: null,
      guest: null
    });

    const connect = async () => {
      connectionStatus.value = 'connecting';
      try {
        await colyseusMultiplayer.connect();
        connectionStatus.value = 'connected';
        
        // Настраиваем обработчики
        colyseusMultiplayer.onGameUpdate = (data) => {
          console.log('Game update:', data);
          
          // Обновляем информацию об игроках
          if (data.players) {
            data.players.forEach(player => {
              if (player.color === 1) {
                gamePlayers.host = player.name;
              } else if (player.color === 2) {
                gamePlayers.guest = player.name;
              }
            });
          }
        };

        colyseusMultiplayer.onPlayerJoined = (data) => {
          console.log('Player joined:', data);
          if (data.player.color === 2) {
            gamePlayers.guest = data.player.name;
          }
          telegram.vibrate();
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
          id: result.gameId
        };
        
        gamePlayers.host = playerName.value;
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
        
        currentGame.value = {
          id: gameIdInput.value.toUpperCase()
        };
        
        gamePlayers.guest = playerName.value;
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
      gamePlayers,
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
/* Добавьте стили */
.player-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 6px;
  background: #4CAF50;
  color: white;
  border-radius: 4px;
  font-size: 12px;
}

.player.current {
  border: 2px solid #4CAF50;
}
</style>