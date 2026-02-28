import { GameLogic } from './services/gameLogic';
import { WHITE_KING, BLACK_PAWN, EMPTY } from './utils/constants';

// Тестовая доска с дамкой
const testBoard = Array(8).fill().map(() => Array(8).fill(EMPTY));

// Ставим белую дамку
testBoard[4][4] = WHITE_KING;

// Ставим черные шашки для съедения
testBoard[2][2] = BLACK_PAWN; // По диагонали вверх-влево
testBoard[2][6] = BLACK_PAWN; // По диагонали вверх-вправо
testBoard[6][2] = BLACK_PAWN; // По диагонали вниз-влево
testBoard[6][6] = BLACK_PAWN; // По диагонали вниз-вправо

console.log('Тестовая доска с дамкой:');
console.log(testBoard);

// Проверяем возможность взятия
const captures = GameLogic.getCaptureMoves(testBoard, 4, 4, 1);
console.log('Возможные взятия:', captures);

// Проверяем конкретный ход со взятием
const isValid = GameLogic.isValidMove(testBoard, 4, 4, 0, 0, 1);
console.log('Ход (4,4)->(0,0) валиден?', isValid);

// Выполняем ход
const newBoard = GameLogic.makeMove(testBoard, 4, 4, 0, 0, true);
console.log('Доска после хода:');
console.log(newBoard);
console.log('Шашка на (2,2) должна быть пустой:', newBoard[2][2] === EMPTY);