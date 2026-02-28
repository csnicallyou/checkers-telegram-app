<template>
  <div class="game-controls">
    <div class="game-info">
      <div class="player-turn" :class="{ 'white-turn': currentPlayer === 1, 'black-turn': currentPlayer === 2 }">
        {{ currentPlayer === 1 ? 'Ход белых' : 'Ход черных' }}
      </div>
      
      <!-- Информация о сторонах в мультиплеере -->
      <div v-if="multiplayerMode" class="sides-info">
        <div class="side-badge" :class="{ 'active': myColor === 1 }">
          <span class="side-icon">⚪</span>
          <span class="side-text">Белые</span>
          <span v-if="myColor === 1" class="you-badge">(Вы)</span>
        </div>
        <div class="vs-small">VS</div>
        <div class="side-badge" :class="{ 'active': myColor === 2 }">
          <span class="side-icon">⚫</span>
          <span class="side-text">Черные</span>
          <span v-if="myColor === 2" class="you-badge">(Вы)</span>
        </div>
      </div>
    </div>
    
    <div class="game-buttons">
      <button @click="$emit('new-game')" class="btn new-game-btn" :disabled="isGettingHint">
        Новая игра
      </button>
      
      <button @click="$emit('undo')" class="btn undo-btn" :disabled="!canUndo || isGettingHint || multiplayerMode">
        Отменить ход
      </button>
      
      <button v-if="!multiplayerMode || isAdmin" 
              @click="$emit('hint')" 
              class="btn hint-btn" 
              :disabled="isGettingHint">
        {{ isGettingHint ? 'Поиск...' : 'Подсказка' }}
      </button>
      
      <button @click="$emit('back-to-menu')" class="btn menu-btn">
        В меню
      </button>
      
      <!-- Чекбокс для всех в одиночной игре -->
      <label v-if="!multiplayerMode" class="hint-toggle">
        <input 
          type="checkbox" 
          :checked="showHints"
          @change="$emit('update:showHints', $event.target.checked)"
          :disabled="isGettingHint"
        >
        Подсвечивать подсказку
      </label>
      
      <!-- Чекбокс только для админа в мультиплеере -->
      <label v-if="multiplayerMode && isAdmin" class="hint-toggle admin-toggle">
        <input 
          type="checkbox" 
          :checked="showHints"
          @change="$emit('update:showHints', $event.target.checked)"
          :disabled="isGettingHint"
        >
        👑 Подсвечивать подсказку (только для вас)
      </label>
    </div>
    
    <div v-if="multiplayerMode && opponent" class="opponent-info">
      <p>Соперник: {{ opponent.name }}</p>
    </div>
    
    <!-- Отображение лучшего хода для админа в мультиплеере -->
    <div v-if="showHints && bestMove && multiplayerMode && isAdmin" class="game-status admin-hint">
      <p>Лучший ход: с ({{ bestMove[0]+1 }},{{ bestMove[1]+1 }}) на ({{ bestMove[2]+1 }},{{ bestMove[3]+1 }})</p>
      <p class="hint-note">(видите только вы)</p>
    </div>
    
    <!-- Отображение лучшего хода в одиночной игре -->
    <div v-if="showHints && bestMove && !multiplayerMode" class="game-status">
      <p>Лучший ход: с ({{ bestMove[0]+1 }},{{ bestMove[1]+1 }}) на ({{ bestMove[2]+1 }},{{ bestMove[3]+1 }})</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GameControls',
  props: {
    currentPlayer: {
      type: Number,
      required: true
    },
    difficulty: {
      type: String,
      default: 'champion'
    },
    showHints: {
      type: Boolean,
      default: false
    },
    canUndo: {
      type: Boolean,
      default: false
    },
    isGettingHint: {
      type: Boolean,
      default: false
    },
    bestMove: {
      type: Array,
      default: null
    },
    multiplayerMode: {
      type: Boolean,
      default: false
    },
    opponent: {
      type: Object,
      default: null
    },
    myColor: {
      type: Number,
      default: 1 // 1 - белые, 2 - черные
    },
    isAdmin: {
      type: Boolean,
      default: false
    }
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
  margin-bottom: 10px;
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

/* Стили для отображения сторон */
.sides-info {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 8px;
}

.side-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 20px;
  background: white;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.side-badge.active {
  border-color: #4CAF50;
  background: #e8f5e9;
  transform: scale(1.05);
}

.side-icon {
  font-size: 18px;
}

.side-text {
  font-size: 14px;
  font-weight: 500;
}

.you-badge {
  font-size: 12px;
  color: #4CAF50;
  font-weight: bold;
  margin-left: 2px;
}

.vs-small {
  font-size: 14px;
  font-weight: bold;
  color: #666;
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

/* Стили для админского чекбокса */
.admin-toggle {
  border-color: #9C27B0 !important;
  background: #f3e5f5 !important;
}

.admin-toggle:hover {
  background: #e1bee7 !important;
}

.admin-hint {
  background: #f3e5f5 !important;
  border-color: #9C27B0 !important;
  color: #6a1b9a !important;
}

.hint-note {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
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
  
  .sides-info {
    gap: 8px;
    padding: 5px;
  }
  
  .side-badge {
    padding: 4px 8px;
  }
  
  .side-icon {
    font-size: 16px;
  }
  
  .side-text {
    font-size: 12px;
  }
}
</style>