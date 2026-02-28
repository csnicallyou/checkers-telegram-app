import { GameLogic } from './gameLogic';
import { PLAYER_WHITE, PLAYER_BLACK } from '../utils/constants';

// Простой локальный ИИ только для подсказок
export class LocalAI {
  // Оценка позиции
  static evaluatePosition(board, player) {
    try {
      let score = 0;
      
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece === 0) continue;
          
          const piecePlayer = GameLogic.getPiecePlayer(piece);
          const isKing = GameLogic.isKing(piece);
          const multiplier = piecePlayer === player ? 1 : -1;
          
          // Базовая стоимость
          if (isKing) {
            score += 300 * multiplier;
          } else {
            score += 100 * multiplier;
          }
          
          // Бонус за продвижение
          if (!isKing) {
            if (piecePlayer === PLAYER_WHITE) {
              score += (7 - r) * 5 * multiplier;
            } else {
              score += r * 5 * multiplier;
            }
          }
          
          // Бонус за центр
          if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
            score += 10 * multiplier;
          }
        }
      }
      
      return score;
    } catch (error) {
      console.error('Ошибка в evaluatePosition:', error);
      return 0;
    }
  }

  // Минимакс для поиска лучшего хода (глубина 2)
  static findBestMove(board, player, depth = 2) {
    try {
      console.log('findBestMove вызван для игрока:', player);
      
      const moves = GameLogic.getAllValidMoves(board, player);
      console.log('Доступно ходов:', moves.length);
      
      if (moves.length === 0) return null;
      if (moves.length === 1) {
        console.log('Только один ход:', moves[0]);
        return moves[0];
      }
      
      let bestMove = null;
      let bestScore = -Infinity;
      
      // Ограничиваем количество анализируемых ходов для скорости
      const movesToAnalyze = moves.slice(0, 10);
      
      for (const move of movesToAnalyze) {
        const [startRow, startCol, endRow, endCol, isCapture] = move;
        
        // Пробуем ход
        let newBoard = GameLogic.makeMove(board, startRow, startCol, endRow, endCol);
        GameLogic.checkForKing(newBoard, endRow, endCol);
        
        // Оцениваем позицию
        let score;
        if (depth > 1) {
          // Рекурсивно ищем ответ противника
          const opponent = player === PLAYER_WHITE ? PLAYER_BLACK : PLAYER_WHITE;
          const opponentMoves = GameLogic.getAllValidMoves(newBoard, opponent);
          
          if (opponentMoves.length === 0) {
            score = 10000; // Мат
          } else {
            let worstScore = Infinity;
            // Анализируем только первые 3 ответа противника
            for (const oppMove of opponentMoves.slice(0, 3)) {
              const [or, oc, er, ec] = oppMove;
              const testBoard = GameLogic.makeMove(
                newBoard, or, oc, er, ec
              );
              const evalScore = this.evaluatePosition(testBoard, player);
              worstScore = Math.min(worstScore, evalScore);
            }
            score = worstScore;
          }
        } else {
          score = this.evaluatePosition(newBoard, player);
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      
      console.log('Лучший ход:', bestMove, 'с оценкой:', bestScore);
      return bestMove;
    } catch (error) {
      console.error('Ошибка в findBestMove:', error);
      return null;
    }
  }

  // Получить подсказку для текущего игрока
  static getHint(board, player) {
    try {
      console.log('getHint вызван');
      return this.findBestMove(board, player, 2);
    } catch (error) {
      console.error('Ошибка в getHint:', error);
      return null;
    }
  }
}