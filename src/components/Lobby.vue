<template>
  <div class="lobby">
    <h2>Мультиплеер</h2>
    
    <div v-if="!connected">
      <p>Подключение...</p>
    </div>

    <div v-else-if="!gameId">
      <div>
        <h3>Создать игру</h3>
        <input v-model="playerName" placeholder="Ваше имя">
        <button @click="createGame">Создать</button>
      </div>

      <hr>

      <div>
        <h3>Присоединиться</h3>
        <input v-model="gameCode" placeholder="Код игры">
        <input v-model="playerName" placeholder="Ваше имя">
        <button @click="joinGame">Присоединиться</button>
      </div>
    </div>

    <div v-else>
      <h3>Комната {{ gameId }}</h3>
      <p>Хост: {{ isHost ? 'Вы' : hostName }}</p>
      <p>Гость: {{ guestName || 'Ожидание...' }}</p>
      
      <button v-if="isHost && guestName" @click="startGame">
        Начать игру
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { multiplayer } from '../services/multiplayer';

export default {
  emits: ['start', 'back'],
  setup(props, { emit }) {
    const playerName = ref('');
    const gameCode = ref('');
    const gameId = ref(null);
    const connected = ref(false);
    const isHost = ref(false);
    const hostName = ref(null);
    const guestName = ref(null);

    onMounted(async () => {
      await multiplayer.connect();
      connected.value = true;
      
      multiplayer.onCreated = () => {
        gameId.value = multiplayer.gameId;
        isHost.value = true;
      };
      
      multiplayer.onJoined = (data) => {
        gameId.value = multiplayer.gameId;
        isHost.value = false;
        hostName.value = data.hostName;
      };
      
      multiplayer.onGuestJoined = (data) => {
        guestName.value = data.guestName;
      };
    });

    const createGame = () => {
      multiplayer.createGame(playerName.value);
    };

    const joinGame = () => {
      multiplayer.joinGame(gameCode.value, playerName.value);
    };

    const startGame = () => {
      emit('start', { gameId: gameId.value, isHost: isHost.value });
    };

    return {
      playerName,
      gameCode,
      gameId,
      connected,
      isHost,
      hostName,
      guestName,
      createGame,
      joinGame,
      startGame
    };
  }
};
</script>