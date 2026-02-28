<template>
  <div class="game">
    <div class="board">
      <div v-for="(row, i) in board" :key="i" class="row">
        <div v-for="(cell, j) in row" :key="j" 
             class="cell" :class="{ dark: (i + j) % 2 === 1 }"
             @click="makeMove(i, j)">
          <div v-if="cell === 1" class="piece white">⚪</div>
          <div v-if="cell === 2" class="piece black">⚫</div>
        </div>
      </div>
    </div>
    <p>Ход: {{ currentPlayer === 1 ? 'Белые' : 'Черные' }}</p>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { multiplayer } from '../services/multiplayer';

export default {
  props: ['gameId', 'isHost'],
  setup(props) {
    const board = ref([]);
    const currentPlayer = ref(1);

    const initBoard = () => {
      const b = Array(8).fill().map(() => Array(8).fill(0));
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 2 === 1) b[r][c] = 2;
        }
      }
      for (let r = 5; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 2 === 1) b[r][c] = 1;
        }
      }
      board.value = b;
    };

    initBoard();

    multiplayer.onMove = (data) => {
      board.value = data.board;
      currentPlayer.value = data.currentPlayer;
    };

    const makeMove = (row, col) => {
      // Временно просто передаем клик как ход
      if (currentPlayer.value === 1) {
        board.value[row][col] = 1;
        currentPlayer.value = 2;
      } else {
        board.value[row][col] = 2;
        currentPlayer.value = 1;
      }
      
      multiplayer.sendMove([row, col], board.value, currentPlayer.value);
    };

    return { board, currentPlayer, makeMove };
  }
};
</script>

<style>
.board { display: inline-block; }
.row { display: flex; }
.cell { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; }
.cell.dark { background: #b0a58c; }
.piece { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.white { background: white; }
.black { background: black; color: white; }
</style>