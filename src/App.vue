<template>
  <div id="app">
    <ModeSelection 
      v-if="!gameMode"
      @select-mode="handleModeSelect"
    />
    
    <ColyseusLobby
      v-else-if="gameMode === 'multiplayer' && !gameStarted"
      @back="goBack"
      @game-created="handleGameCreated"
      @game-joined="handleGameJoined"
      @start-game="startGame"
    />
    
    <GameView
      v-else
      :mode="gameMode"
      :multiplayer-mode="gameMode === 'multiplayer'"
      :game-data="currentGame"
      @back-to-menu="backToMenu"
    />
  </div>
</template>

<script>
import { ref } from 'vue';
import ModeSelection from './components/ModeSelection.vue';
import ColyseusLobby from './components/ColyseusLobby.vue';
import GameView from './views/GameView.vue';

export default {
  name: 'App',
  components: {
    ModeSelection,
    ColyseusLobby,
    GameView
  },
  setup() {
    const gameMode = ref(null);
    const gameStarted = ref(false);
    const currentGame = ref(null);

    const handleModeSelect = (mode) => {
      gameMode.value = mode;
      if (mode === 'local') {
        gameStarted.value = true;
      }
    };

    const handleGameCreated = (game) => {
      currentGame.value = game;
    };

    const handleGameJoined = (game) => {
      currentGame.value = game;
    };

    const startGame = (game) => {
      gameStarted.value = true;
      currentGame.value = game;
    };

    const backToMenu = () => {
      gameMode.value = null;
      gameStarted.value = false;
      currentGame.value = null;
    };

    const goBack = () => {
      gameMode.value = null;
    };

    return {
      gameMode,
      gameStarted,
      currentGame,
      handleModeSelect,
      handleGameCreated,
      handleGameJoined,
      startGame,
      backToMenu,
      goBack
    };
  }
};
</script>