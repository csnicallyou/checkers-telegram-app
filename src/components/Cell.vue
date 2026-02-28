<template>
  <div 
    class="cell" 
    :class="{
      'dark': isDark,
      'light': !isDark,
      'selected': isSelected,
      'valid-move': isValidMove,
      'last-move': isLastMove,
      'best-move': isBestMove,
      'mandatory-capture': isMandatoryCapture
    }"
    @click="$emit('click')"
  >
    <div 
      v-if="piece !== 0" 
      class="piece" 
      :class="{
        'white-piece': piece === 1 || piece === 3,
        'black-piece': piece === 2 || piece === 4,
        'king': piece === 3 || piece === 4
      }"
    >
      <span v-if="piece === 3 || piece === 4" class="king-symbol">♔</span>
    </div>
    <div v-if="isValidMove" class="move-dot"></div>
  </div>
</template>

<script>
export default {
  name: 'Cell',
  props: {
    piece: Number,
    isDark: Boolean,
    isSelected: Boolean,
    isValidMove: Boolean,
    isLastMove: Boolean,
    isBestMove: Boolean,
    isMandatoryCapture: Boolean
  },
  emits: ['click']
};
</script>

<style scoped>
.cell {
  width: min(12vw, 70px);
  height: min(12vw, 70px);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  box-sizing: border-box;
  aspect-ratio: 1 / 1; /* Важно для квадратных клеток */
}

@media (max-width: 600px) {
  .cell {
    width: min(11vw, 60px);
    height: min(11vw, 60px);
  }
}

@media (max-width: 400px) {
  .cell {
    width: min(10vw, 50px);
    height: min(10vw, 50px);
  }
}

.cell.dark {
  background-color: #5D4037;
}

.cell.light {
  background-color: #f0d9b5;
}

.cell.selected {
  outline: 4px solid #ff4444;
  outline-offset: -2px;
  z-index: 10;
}

.cell.last-move {
  background-color: rgba(255, 255, 0, 0.3);
}

.cell.best-move {
  background-color: rgba(255, 165, 0, 0.3);
}

.cell.mandatory-capture {
  outline: 4px solid #ff0000;
  outline-offset: -2px;
  animation: pulseBorder 1.5s infinite;
}

.piece {
  width: 85%;
  height: 85%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  transition: transform 0.2s;
  z-index: 5;
}

.piece:hover {
  transform: scale(1.05);
  cursor: pointer;
}

.white-piece {
  background: white;
  border: 2px solid #333;
  color: #333;
}

.black-piece {
  background: #333;
  border: 2px solid #666;
  color: white;
}

.king {
  font-size: min(5vw, 30px);
  font-weight: bold;
}

.white-piece.king {
  color: #ffd700;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}

.black-piece.king {
  color: #ffd700;
  text-shadow: 1px 1px 2px rgba(255,255,255,0.5);
}

.king-symbol {
  line-height: 1;
  display: block;
}

.move-dot {
  width: 30%;
  height: 30%;
  border-radius: 50%;
  background-color: rgba(76, 175, 80, 0.8);
  position: absolute;
  animation: pulse 1.5s infinite;
  z-index: 20;
  pointer-events: none;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
}

@keyframes pulseBorder {
  0% { outline-color: #ff0000; }
  50% { outline-color: #ff6666; }
  100% { outline-color: #ff0000; }
}
</style>