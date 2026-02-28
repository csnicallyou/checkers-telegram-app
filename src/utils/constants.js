// Константы игры из const.py
export const BOARD_SIZE = 8;
export const CELL_SIZE = 60;

// Типы фигур
export const EMPTY = 0;
export const WHITE_PAWN = 1;
export const BLACK_PAWN = 2;
export const WHITE_KING = 3;
export const BLACK_KING = 4;

// Игроки
export const PLAYER_WHITE = 1;
export const PLAYER_BLACK = 2;

// Цвета для UI
export const COLORS = {
  LIGHT: 'beige',
  DARK: '#5D4037',
  PIECE_WHITE: 'white',
  PIECE_BLACK: 'black',
  HIGHLIGHT: 'red',
  LAST_MOVE: 'yellow',
  BEST_MOVE: 'orange',
  BEST_MOVE_ARROW: 'gold'
};

// Веса для оценки позиции
export const EVALUATION_WEIGHTS = {
  PIECE_VALUE: 100,
  KING_VALUE: 330,
  CAPTURE_BONUS: 60,
  BACK_ROW_BONUS: 25,
  CENTER_CONTROL: 12,
  MOBILITY_BONUS: 3,
  DANGER_PENALTY: 40,
  PROTECTION_BONUS: 20,
  KING_PROTECTION: 10,
  PAWN_CHAIN_BONUS: 15,
  TEMPO_BONUS: 5,
  ENDGAME_KING_BONUS: 50
};

// Уровни сложности
export const AI_DIFFICULTY = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
  EXPERT: 'expert',
  CHAMPION: 'champion'
};

export const DIFFICULTY_SETTINGS = {
  [AI_DIFFICULTY.EASY]: { depth: 2, time: 0.5, name: 'Легкий' },
  [AI_DIFFICULTY.NORMAL]: { depth: 4, time: 1.0, name: 'Средний' },
  [AI_DIFFICULTY.HARD]: { depth: 6, time: 2.0, name: 'Сложный' },
  [AI_DIFFICULTY.EXPERT]: { depth: 8, time: 3.0, name: 'Эксперт' },
  [AI_DIFFICULTY.CHAMPION]: { depth: 10, time: 5.0, name: 'Чемпион' }
};