<template>
  <div class="board-wrapper">
    <div class="board-container">
      <div 
        v-for="row in 8" 
        :key="`row-${row}`" 
        class="board-row"
      >
        <Cell
          v-for="col in 8"
          :key="`cell-${row}-${col}`"
          :piece="board[row-1][col-1]"
          :is-dark="(row + col) % 2 === 1"
          :is-selected="selectedRow === row-1 && selectedCol === col-1"
          :is-valid-move="isValidMove(row-1, col-1)"
          :is-last-move="isLastMove(row-1, col-1)"
          :is-best-move="isBestMove(row-1, col-1)"
          :is-mandatory-capture="isMandatoryCapture(row-1, col-1)"
          @click="handleCellClick(row-1, col-1)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import Cell from './Cell.vue';
import { GameLogic } from '../services/gameLogic';

export default {
  name: 'Board',
  components: { Cell },
  props: {
    board: {
      type: Array,
      required: true
    },
    currentPlayer: {
      type: Number,
      required: true
    },
    lastMove: {
      type: Array,
      default: null
    },
    bestMove: {
      type: Array,
      default: null
    },
    showHints: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['move-made', 'piece-selected'],
  setup(props, { emit }) {
    const selectedRow = ref(null);
    const selectedCol = ref(null);
    const validMoves = ref([]);
    const mandatoryCaptures = ref([]);

    watch(
      () => [props.board, props.currentPlayer, props.disabled],
      () => {
        if (!props.disabled) {
          mandatoryCaptures.value = GameLogic.getMandatoryCaptures(props.board, props.currentPlayer);
        }
        
        if (selectedRow.value !== null && selectedCol.value !== null) {
          const piece = props.board[selectedRow.value]?.[selectedCol.value];
          if (!piece || GameLogic.getPiecePlayer(piece) !== props.currentPlayer || props.disabled) {
            selectedRow.value = null;
            selectedCol.value = null;
            validMoves.value = [];
          }
        }
      },
      { deep: true, immediate: true }
    );

    const isLastMove = (row, col) => {
      if (!props.lastMove) return false;
      return (
        (props.lastMove[0]?.[0] === row && props.lastMove[0]?.[1] === col) ||
        (props.lastMove[1]?.[0] === row && props.lastMove[1]?.[1] === col)
      );
    };

    const isBestMove = (row, col) => {
      if (!props.bestMove || !props.showHints || props.disabled) return false;
      return (
        (props.bestMove[0] === row && props.bestMove[1] === col) ||
        (props.bestMove[2] === row && props.bestMove[3] === col)
      );
    };

    const isMandatoryCapture = (row, col) => {
      if (props.disabled) return false;
      return mandatoryCaptures.value.some(([r, c]) => r === row && c === col);
    };

    const isValidMove = (row, col) => {
      return validMoves.value.some(([r, c]) => r === row && c === col);
    };

    const handleCellClick = (row, col) => {
      if (props.disabled) return;
      
      const piece = props.board[row][col];
      const piecePlayer = GameLogic.getPiecePlayer(piece);
      
      if (piece !== 0 && piecePlayer === props.currentPlayer) {
        const moves = GameLogic.getAllValidMoves(props.board, props.currentPlayer)
          .filter(([r, c]) => r === row && c === col)
          .map(([r, c, tr, tc]) => [tr, tc]);
        
        if (moves.length > 0) {
          selectedRow.value = row;
          selectedCol.value = col;
          validMoves.value = moves;
          
          emit('piece-selected', { row, col, moves });
        }
      }
      else if (selectedRow.value !== null && selectedCol.value !== null) {
        if (isValidMove(row, col)) {
          emit('move-made', {
            startRow: selectedRow.value,
            startCol: selectedCol.value,
            endRow: row,
            endCol: col
          });
          
          selectedRow.value = null;
          selectedCol.value = null;
          validMoves.value = [];
        }
      }
    };

    return {
      selectedRow,
      selectedCol,
      validMoves,
      isLastMove,
      isBestMove,
      isMandatoryCapture,
      isValidMove,
      handleCellClick
    };
  }
};
</script>

<style scoped>
.board-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  width: 100%;
  box-sizing: border-box;
}

.board-container {
  display: inline-block;
  border: 3px solid #333;
  border-radius: 8px;
  overflow: hidden;
  background: #f0d9b5;
  box-shadow: 0 10px 20px rgba(0,0,0,0.3);
  width: fit-content;
}

.board-row {
  display: flex;
}

@media (max-width: 600px) {
  .board-wrapper {
    padding: 5px;
  }
}
</style>