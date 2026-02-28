<template>
  <div class="game-view">
    <div class="game-header">
      <button @click="goBack" class="back-button">← В меню</button>
      <h1 class="game-title">Русские шашки</h1>
      <div v-if="multiplayerMode" class="multiplayer-info">
        <span :class="['player-indicator', { 'my-turn': isMyTurn }]">
          {{ isMyTurn ? 'Ваш ход' : 'Ход соперника' }}
        </span>
      </div>
      <div v-else class="local-info">
        <span>Игра на одном устройстве</span>
      </div>
    </div>
    
    <Board
      :board="board"
      :current-player="currentPlayer"
      :last-move="lastMove"
      :best-move="bestMove"
      :show-hints="showHints && (!multiplayerMode || isAdmin)"
      :disabled="(multiplayerMode && !isMyTurn)"
      :flipped="isFlipped"
      @move-made="handleMove"
      @piece-selected="handlePieceSelected"
    />
    
    <GameControls
      v-model:difficulty="difficulty"
      v-model:showHints="showHints"
      :current-player="currentPlayer"
      :can-undo="moveHistory.length > 0 && !multiplayerMode"
      :is-getting-hint="isGettingHint"
      :best-move="bestMove"
      :multiplayer-mode="multiplayerMode"
      :opponent="opponent"
      :my-color="myColor"
      :is-admin="isAdmin"
      @new-game="newGame"
      @undo="undoMove"
      @hint="getHint"
      @back-to-menu="goBack"
    />
    
    <div v-if="gameOver" class="game-over">
      <h2>Игра окончена!</h2>
      <p>Победили: {{ gameOver === 1 ? 'Белые' : 'Черные' }}</p>
      <div class="game-over-buttons">
        <button @click="newGame" class="btn">Новая игра</button>
        <button @click="goBack" class="btn menu-btn">В меню</button>
      </div>
    </div>
    
    <div v-if="isGettingHint" class="hint-overlay">
      <div class="hint-content">
        <div class="spinner"></div>
        <p>Получение подсказки...</p>
      </div>
    </div>

    <div v-if="opponentDisconnected" class="disconnect-overlay">
      <div class="disconnect-content">
        <h3>Соперник отключился</h3>
        <button @click="goBack" class="btn">Вернуться в меню</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import Board from '../components/Board.vue';
import GameControls from '../components/GameControls.vue';
import { GameLogic } from '../services/gameLogic';
import { LocalAI } from '../services/localAI';
import { telegram } from '../services/telegram';
import { wsManager } from '../services/websocket';
import { PLAYER_WHITE, PLAYER_BLACK } from '../utils/constants';
import { adminManager } from '../services/adminManager';

export default {
  name: 'GameView',
  components: { Board, GameControls },
  props: {
    mode: {
      type: String,
      default: 'local'
    },
    multiplayerMode: {
      type: Boolean,
      default: false
    },
    gameData: {
      type: Object,
      default: null
    }
  },
  emits: ['back-to-menu', 'back-to-lobby'],
  setup(props, { emit }) {
    const board = ref(GameLogic.initializeBoard());
    const currentPlayer = ref(PLAYER_WHITE);
    const moveHistory = ref([]);
    const lastMove = ref(null);
    const difficulty = ref('champion');
    const showHints = ref(false);
    const bestMove = ref(null);
    const isGettingHint = ref(false);
    const gameOver = ref(null);
    const justPromoted = ref(false);
    const currentCaptureChain = ref(null);
    const opponent = ref(null);
    const opponentDisconnected = ref(false);
    const gameId = ref(null);
    
    const myColor = ref(1);
    const opponentColor = ref(2);
    const isAdmin = ref(false);
    
    // ID администратора (замените на ваш реальный ID)
    const ADMIN_USER_ID = 8147229815; // Ваш ID из логов

    const isMyTurn = computed(() => {
      if (!props.multiplayerMode) return true;
      return currentPlayer.value === myColor.value;
    });

    const isFlipped = computed(() => {
      if (!props.multiplayerMode) return false;
      console.log('🔄 Проверка переворота: myColor =', myColor.value, 'flipped =', myColor.value === 2);
      return myColor.value === 2;
    });

    const initGame = () => {
      if (!props.multiplayerMode || !props.gameData) return;
      
      const { myColor: playerColor, opponentColor: oppColor, opponentName } = props.gameData;
      
      if (playerColor === undefined || oppColor === undefined) return;
      
      myColor.value = playerColor;
      opponentColor.value = oppColor;
      opponent.value = { name: opponentName || 'Соперник' };
      gameId.value = props.gameData.gameId || wsManager.gameId;
    };

    const setupMultiplayerListeners = () => {
      if (!props.multiplayerMode) return;
      
      wsManager.callbacks.onOpponentMove = (data) => {
        console.log('♟️ Получен ход соперника:', data);
        const { move, board: newBoard, currentPlayer: newPlayer } = data;
        board.value = newBoard;
        currentPlayer.value = newPlayer;
        lastMove.value = [[move[0], move[1]], [move[2], move[3]]];
        telegram.vibrate('light');
      };

      wsManager.callbacks.onHostLeft = () => {
        console.log('👋 Хост покинул игру');
        opponentDisconnected.value = true;
        telegram.showAlert('Хост покинул игру');
      };
      
      wsManager.callbacks.onGuestLeft = () => {
        console.log('👋 Гость покинул игру');
        opponentDisconnected.value = true;
        telegram.showAlert('Гость покинул игру');
      };
    };

    onMounted(() => {
      telegram.init();
      initGame();
      setupMultiplayerListeners();
      
      // Проверяем, является ли пользователь админом через adminManager
      const userId = telegram.getUser()?.id;
      isAdmin.value = adminManager.isAdmin(userId);
      console.log('👤 User ID:', userId, 'isAdmin:', isAdmin.value);
      
      // Если пользователь не админ, проверяем есть ли запрос
      if (!isAdmin.value && userId) {
        const request = adminManager.checkRequest(userId);
        if (request && request.gameId === gameId.value) {
          // Автоматически выдаем админку на эту игру
          isAdmin.value = true;
          adminManager.removeRequest(userId);
          telegram.showNotification('✨ Вы получили временные права администратора на эту игру!');
        }
      }
    });

    onUnmounted(() => {
      // Очищаем только колбэки, соединение оставляем
      wsManager.callbacks.onOpponentMove = null;
      wsManager.callbacks.onHostLeft = null;
      wsManager.callbacks.onGuestLeft = null;
    });

    const handleMove = async (move) => {
      const { startRow, startCol, endRow, endCol } = move;
      
      if (props.multiplayerMode && !isMyTurn.value) {
        telegram.showAlert('Сейчас не ваш ход!');
        return;
      }
      
      const isValid = GameLogic.isValidMove(
        board.value, startRow, startCol, endRow, endCol, currentPlayer.value
      );
      
      if (!isValid) {
        telegram.showAlert('Недопустимый ход!');
        return;
      }
      
      await executeMove(startRow, startCol, endRow, endCol);
    };

    const executeMove = async (startRow, startCol, endRow, endCol) => {
      const isCapture = Math.abs(endRow - startRow) > 1;
      
      moveHistory.value.push({
        board: JSON.parse(JSON.stringify(board.value)),
        currentPlayer: currentPlayer.value,
        lastMove: lastMove.value ? [...lastMove.value] : null,
        justPromoted: justPromoted.value,
        currentCaptureChain: currentCaptureChain.value ? [...currentCaptureChain.value] : null
      });
      
      board.value = GameLogic.makeMove(board.value, startRow, startCol, endRow, endCol);
      const promoted = GameLogic.checkForKing(board.value, endRow, endCol);
      lastMove.value = [[startRow, startCol], [endRow, endCol]];
      
      const status = GameLogic.getGameStatus(board.value);
      if (status) {
        gameOver.value = status;
        if (props.multiplayerMode) wsManager.disconnect();
        telegram.showAlert(`Игра окончена! Победили ${status === PLAYER_WHITE ? 'белые' : 'черные'}`);
        return;
      }
      
      if (isCapture) {
        const canContinue = GameLogic.canContinueCapture(
          board.value, endRow, endCol, currentPlayer.value, promoted
        );
        
        if (canContinue) {
          justPromoted.value = promoted;
          currentCaptureChain.value = [endRow, endCol];
          if (props.multiplayerMode) {
            wsManager.sendMove([startRow, startCol, endRow, endCol], board.value, currentPlayer.value);
          }
          telegram.showNotification('Можете продолжать бой!');
          return;
        }
      }
      
      justPromoted.value = false;
      currentCaptureChain.value = null;
      currentPlayer.value = currentPlayer.value === PLAYER_WHITE ? PLAYER_BLACK : PLAYER_WHITE;
      
      if (props.multiplayerMode) {
        wsManager.sendMove([startRow, startCol, endRow, endCol], board.value, currentPlayer.value);
      }
      
      if (!GameLogic.hasMoves(board.value, currentPlayer.value)) {
        const winner = currentPlayer.value === PLAYER_WHITE ? PLAYER_BLACK : PLAYER_WHITE;
        gameOver.value = winner;
        if (props.multiplayerMode) wsManager.disconnect();
        telegram.showAlert(`Игра окончена! Победили ${winner === PLAYER_WHITE ? 'белые' : 'черные'}`);
        return;
      }
      
      bestMove.value = null;
    };

    const newGame = () => {
      board.value = GameLogic.initializeBoard();
      currentPlayer.value = PLAYER_WHITE;
      moveHistory.value = [];
      lastMove.value = null;
      bestMove.value = null;
      gameOver.value = null;
      justPromoted.value = false;
      currentCaptureChain.value = null;
    };

    const undoMove = () => {
      if (moveHistory.value.length === 0 || isGettingHint.value || props.multiplayerMode) return;
      
      const lastState = moveHistory.value.pop();
      board.value = lastState.board;
      currentPlayer.value = lastState.currentPlayer;
      lastMove.value = lastState.lastMove;
      justPromoted.value = lastState.justPromoted || false;
      currentCaptureChain.value = lastState.currentCaptureChain || null;
      bestMove.value = null;
    };

    const getHint = () => {
      if (props.multiplayerMode && !isAdmin.value) {
        telegram.showAlert('Подсказки доступны только разработчику');
        return;
      }
      
      if (isGettingHint.value) return;
      if (!GameLogic.hasMoves(board.value, currentPlayer.value)) {
        telegram.showAlert('У вас нет доступных ходов');
        return;
      }
      
      isGettingHint.value = true;
      bestMove.value = null;
      
      setTimeout(() => {
        const hint = LocalAI.getHint(board.value, currentPlayer.value);
        if (hint) {
          bestMove.value = hint;
          const [startRow, startCol, endRow, endCol] = hint;
          telegram.showNotification(`Подсказка: с (${startRow+1},${startCol+1}) на (${endRow+1},${endCol+1})`);
        }
        isGettingHint.value = false;
      }, 100);
    };

    const handlePieceSelected = ({ row, col, moves }) => {
      if (props.multiplayerMode && !isMyTurn.value) return;
      console.log('Выбрана фигура:', row, col, 'ходы:', moves);
    };

    const goBack = () => {
      // Не закрываем соединение при возврате в меню
      emit('back-to-menu');
    };

    return {
      board,
      currentPlayer,
      moveHistory,
      lastMove,
      difficulty,
      showHints,
      bestMove,
      isGettingHint,
      gameOver,
      opponent,
      opponentDisconnected,
      isMyTurn,
      isFlipped,
      myColor,
      isAdmin,
      handleMove,
      handlePieceSelected,
      newGame,
      undoMove,
      getHint,
      goBack
    };
  }
};
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.game-header {
  width: 100%;
  max-width: 600px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 10px;
  box-sizing: border-box;
}

.game-title {
  color: white;
  margin: 0;
  font-size: clamp(1.2rem, 5vw, 2rem);
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  text-align: center;
}

.back-button {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  border-radius: 8px;
  cursor: pointer;
  font-size: clamp(12px, 3vw, 16px);
  white-space: nowrap;
}

.multiplayer-info, .local-info {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-weight: bold;
  font-size: clamp(12px, 3vw, 16px);
  white-space: nowrap;
}

.player-indicator {
  padding: 4px 8px;
  border-radius: 4px;
}

.player-indicator.my-turn {
  background: #4CAF50;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.game-over {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 30px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  z-index: 1000;
  min-width: 300px;
}

.game-over h2 {
  margin-bottom: 15px;
  color: #333;
}

.game-over p {
  margin-bottom: 20px;
  font-size: 18px;
  color: #666;
}

.game-over-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.hint-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  pointer-events: none;
}

.hint-content {
  background: white;
  padding: 20px 30px;
  border-radius: 10px;
  text-align: center;
  min-width: 200px;
  pointer-events: auto;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}

.disconnect-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
}

.disconnect-content {
  background: white;
  padding: 40px;
  border-radius: 12px;
  text-align: center;
}

.disconnect-content h3 {
  margin-bottom: 20px;
  color: #d32f2f;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #5D4037;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

.btn {
  padding: 10px 20px;
  background: #5D4037;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin: 0 5px;
  transition: background 0.2s;
}

.btn:hover {
  background: #3e2c26;
}

.menu-btn {
  background: #9C27B0;
}

.menu-btn:hover {
  background: #7B1FA2;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 480px) {
  .game-view {
    padding: 10px;
  }
  
  .game-header {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .back-button {
    padding: 6px 12px;
  }
}
</style>