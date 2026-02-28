<template>
  <div id="app">
    <Suspense>
      <template #default>
        <ModeSelection 
          v-if="!gameMode"
          @select-mode="handleModeSelect"
        />
        
        <Lobby  
          v-else-if="gameMode === 'multiplayer' && !gameStarted"
          @back-to-mode-selection="backToModeSelection"
          @start="startGame"
        />
        
        <GameView
          v-else
          :mode="gameMode"
          :multiplayer-mode="gameMode === 'multiplayer'"
          :game-data="currentGame"
          @back-to-menu="backToMenu"
        />
      </template>
      <template #fallback>
        <div class="loading">
          <div class="spinner"></div>
          <p>Загрузка...</p>
        </div>
      </template>
    </Suspense>
  </div>
</template>

<script>
import { ref, defineAsyncComponent } from 'vue';

// Ленивая загрузка компонентов
const ModeSelection = defineAsyncComponent(() => 
  import('./components/ModeSelection.vue')
);
const Lobby = defineAsyncComponent(() => 
  import('./components/Lobby.vue')
);
const GameView = defineAsyncComponent(() => 
  import('./views/GameView.vue')
);

export default {
  name: 'App',
  components: {
    ModeSelection,
    Lobby,
    GameView
  },
  setup() {
    const gameMode = ref(null);
    const gameStarted = ref(false);
    const currentGame = ref(null);

    const handleModeSelect = (mode) => {
      console.log('Выбран режим:', mode);
      gameMode.value = mode;
      
      if (mode === 'local') {
        gameStarted.value = true;
      }
    };

    const startGame = (gameData) => {
      console.log('🎮 App.vue получил данные игры:', gameData);
      gameStarted.value = true;
      currentGame.value = gameData;
    };

    const backToMenu = () => {
      console.log('Возврат в меню');
      gameMode.value = null;
      gameStarted.value = false;
      currentGame.value = null;
    };

    const backToModeSelection = () => {
      console.log('Возврат к выбору режима');
      gameMode.value = null;
      gameStarted.value = false;
      currentGame.value = null;
    };

    return {
      gameMode,
      gameStarted,
      currentGame,
      handleModeSelect,
      startGame,
      backToMenu,
      backToModeSelection
    };
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

#app {
  width: 100%;
  min-height: 100vh;
}

.loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>