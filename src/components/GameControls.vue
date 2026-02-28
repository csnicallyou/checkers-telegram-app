<template>
  <div class="game-controls">
    <div class="game-info">
      <div class="player-turn" :class="{ 'white-turn': currentPlayer === 1, 'black-turn': currentPlayer === 2 }">
        {{ currentPlayer === 1 ? 'Ход белых' : 'Ход черных' }}
      </div>
    </div>
    
    <div class="game-buttons">
      <button @click="$emit('new-game')" class="btn new-game-btn" :disabled="isGettingHint">
        Новая игра
      </button>
      
      <button @click="$emit('undo')" class="btn undo-btn" :disabled="!canUndo || isGettingHint || multiplayerMode">
        Отменить ход
      </button>
      
      <button v-if="!multiplayerMode" @click="$emit('hint')" class="btn hint-btn" :disabled="isGettingHint">
        {{ isGettingHint ? 'Поиск...' : 'Подсказка' }}
      </button>
      
      <button @click="$emit('back-to-menu')" class="btn menu-btn">
        В меню
      </button>
      
      <label v-if="!multiplayerMode" class="hint-toggle">
        <input 
          type="checkbox" 
          :checked="showHints"
          @change="$emit('update:showHints', $event.target.checked)"
          :disabled="isGettingHint"
        >
        Подсвечивать подсказку
      </label>
    </div>
    
    <div v-if="multiplayerMode && opponent" class="opponent-info">
      <p>Соперник: {{ opponent.name }}</p>
    </div>
    
    <div v-if="showHints && bestMove && !multiplayerMode" class="game-status">
      <p>Лучший ход: с ({{ bestMove[0]+1 }},{{ bestMove[1]+1 }}) на ({{ bestMove[2]+1 }},{{ bestMove[3]+1 }})</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GameControls',
  props: {
    currentPlayer: Number,
    difficulty: String,
    showHints: Boolean,
    canUndo: Boolean,
    isGettingHint: Boolean,
    bestMove: Array,
    multiplayerMode: Boolean,
    opponent: Object
  },
  emits: ['update:difficulty', 'update:showHints', 'new-game', 'undo', 'hint', 'back-to-menu']
};
</script>

<style scoped>
.game-controls {
  padding: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  margin: 20px auto;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 8px 16px rgba(0,0,0,0.2);
}

.game-info {
  text-align: center;
  margin-bottom: 20px;
}

.player-turn {
  font-size: 24px;
  font-weight: bold;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s;
}

.player-turn.white-turn {
  color: white;
  background: #333;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.player-turn.black-turn {
  color: #333;
  background: #f0f0f0;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.game-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.btn {
  padding: 12px 24px;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.2s;
  min-width: 140px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.2);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.new-game-btn {
  background: #2196F3;
}

.new-game-btn:hover:not(:disabled) {
  background: #1976D2;
}

.undo-btn {
  background: #FF9800;
}

.undo-btn:hover:not(:disabled) {
  background: #F57C00;
}

.hint-btn {
  background: #4CAF50;
}

.hint-btn:hover:not(:disabled) {
  background: #388E3C;
}

.menu-btn {
  background: #9C27B0;
}

.menu-btn:hover:not(:disabled) {
  background: #7B1FA2;
}

.hint-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 12px 20px;
  background: #f5f5f5;
  border-radius: 8px;
  user-select: none;
  font-size: 16px;
  transition: background 0.2s;
  border: 1px solid #ddd;
}

.hint-toggle:hover {
  background: #e8e8e8;
}

.hint-toggle input {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.game-status, .opponent-info {
  text-align: center;
  padding: 12px;
  background: #e3f2fd;
  border-radius: 8px;
  margin-top: 15px;
  font-size: 16px;
  color: #1565C0;
  border: 1px solid #90caf9;
}

.game-status p, .opponent-info p {
  margin: 0;
  font-weight: 500;
}

@media (max-width: 480px) {
  .game-controls {
    padding: 15px;
  }
  
  .btn {
    padding: 10px 16px;
    min-width: 120px;
    font-size: 14px;
  }
  
  .player-turn {
    font-size: 20px;
    padding: 10px;
  }
}
</style>