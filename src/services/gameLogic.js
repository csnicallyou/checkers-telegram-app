import { 
  EMPTY, WHITE_PAWN, BLACK_PAWN, WHITE_KING, BLACK_KING, 
  PLAYER_WHITE, PLAYER_BLACK, BOARD_SIZE 
} from '../utils/constants';

export class GameLogic {
  static initializeBoard() {
    const board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY));
    
    // Черные шашки (сверху)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if ((r + c) % 2 === 1) {
          board[r][c] = BLACK_PAWN;
        }
      }
    }
    
    // Белые шашки (снизу)
    for (let r = 5; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if ((r + c) % 2 === 1) {
          board[r][c] = WHITE_PAWN;
        }
      }
    }
    
    return board;
  }

  static getPiecePlayer(piece) {
    if (piece === WHITE_PAWN || piece === WHITE_KING) return PLAYER_WHITE;
    if (piece === BLACK_PAWN || piece === BLACK_KING) return PLAYER_BLACK;
    return null;
  }

  static isKing(piece) {
    return piece === WHITE_KING || piece === BLACK_KING;
  }

  // Проверка, может ли фигура бить с текущей позиции
  static canCaptureFrom(board, row, col, player) {
    const piece = board[row][col];
    if (piece === EMPTY) return false;
    
    const piecePlayer = this.getPiecePlayer(piece);
    if (piecePlayer !== player) return false;
    
    const isKing = this.isKing(piece);
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    
    for (const [dr, dc] of directions) {
      if (isKing) {
        // Для дамки - ищем противника и пустые клетки за ним
        let r = row + dr;
        let c = col + dc;
        let foundOpponent = false;
        
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          if (board[r][c] !== EMPTY) {
            if (this.getPiecePlayer(board[r][c]) !== player) {
              foundOpponent = true;
              // Проверяем клетки за противником
              let r2 = r + dr;
              let c2 = c + dc;
              while (r2 >= 0 && r2 < BOARD_SIZE && c2 >= 0 && c2 < BOARD_SIZE) {
                if (board[r2][c2] === EMPTY) {
                  return true; // Нашли возможность взятия
                }
                r2 += dr;
                c2 += dc;
              }
            }
            break;
          }
          r += dr;
          c += dc;
        }
      } else {
        // Обычная шашка - проверяем взятие через одну клетку
        const r2 = row + dr * 2;
        const c2 = col + dc * 2;
        const r1 = row + dr;
        const c1 = col + dc;
        
        if (r2 >= 0 && r2 < BOARD_SIZE && c2 >= 0 && c2 < BOARD_SIZE) {
          if (board[r2][c2] === EMPTY) {
            const midPiece = board[r1][c1];
            if (midPiece !== EMPTY && this.getPiecePlayer(midPiece) !== player) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }

  // Получить все обязательные взятия для игрока
  static getMandatoryCaptures(board, player) {
    const captures = [];
    
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board[r][c];
        if (piece !== EMPTY && this.getPiecePlayer(piece) === player) {
          if (this.canCaptureFrom(board, r, c, player)) {
            captures.push([r, c]);
          }
        }
      }
    }
    
    return captures;
  }

  // Проверить, есть ли обязательные взятия
  static hasMandatoryCaptures(board, player) {
    return this.getMandatoryCaptures(board, player).length > 0;
  }

  // Получить все возможные взятия для конкретной фигуры
  static getCaptureMoves(board, row, col, player) {
    const moves = [];
    const piece = board[row][col];
    if (piece === EMPTY) return moves;
    
    const piecePlayer = this.getPiecePlayer(piece);
    if (piecePlayer !== player) return moves;
    
    const isKing = this.isKing(piece);
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    
    for (const [dr, dc] of directions) {
        if (isKing) {
        // Дамка - ищем все возможные взятия
        let r = row + dr;
        let c = col + dc;
        let foundOpponent = false;
        let opponentPos = null;
        
        // Ищем первого противника на пути
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            if (board[r][c] !== EMPTY) {
            if (this.getPiecePlayer(board[r][c]) !== player) {
                foundOpponent = true;
                opponentPos = [r, c];
            }
            break; // Нашли любую фигуру
            }
            r += dr;
            c += dc;
        }
        
        // Если нашли противника, добавляем ВСЕ пустые клетки за ним
        if (foundOpponent && opponentPos) {
            let r2 = opponentPos[0] + dr;
            let c2 = opponentPos[1] + dc;
            
            while (r2 >= 0 && r2 < BOARD_SIZE && c2 >= 0 && c2 < BOARD_SIZE) {
            if (board[r2][c2] === EMPTY) {
                moves.push([r2, c2]); // Добавляем каждую пустую клетку за противником
                r2 += dr;
                c2 += dc;
            } else {
                break; // Наткнулись на другую фигуру
            }
            }
        }
        } else {
        // Обычная шашка - проверяем взятие через одну клетку
        const r2 = row + dr * 2;
        const c2 = col + dc * 2;
        const r1 = row + dr;
        const c1 = col + dc;
        
        if (r2 >= 0 && r2 < BOARD_SIZE && c2 >= 0 && c2 < BOARD_SIZE) {
            if (board[r2][c2] === EMPTY) {
            const midPiece = board[r1][c1];
            if (midPiece !== EMPTY && this.getPiecePlayer(midPiece) !== player) {
                moves.push([r2, c2]);
            }
            }
        }
        }
    }
    
    return moves;
    }

  // Получить простые ходы для фигуры
  static getSimpleMoves(board, row, col, player) {
    const moves = [];
    const piece = board[row][col];
    const isKing = this.isKing(piece);
    
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    
    for (const [dr, dc] of directions) {
      if (isKing) {
        // Дамка - может ходить на любое расстояние
        let r = row + dr;
        let c = col + dc;
        
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          if (board[r][c] === EMPTY) {
            moves.push([r, c]);
            r += dr;
            c += dc;
          } else {
            break;
          }
        }
      } else {
        // Обычная шашка - только на 1 клетку вперед
        if (player === PLAYER_WHITE && dr < 0) {
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            if (board[nr][nc] === EMPTY) {
              moves.push([nr, nc]);
            }
          }
        } else if (player === PLAYER_BLACK && dr > 0) {
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            if (board[nr][nc] === EMPTY) {
              moves.push([nr, nc]);
            }
          }
        }
      }
    }
    
    return moves;
  }

  // Проверить валидность хода
  // Проверить валидность хода (ИСПРАВЛЕНО для дамки)
static isValidMove(board, startRow, startCol, endRow, endCol, currentPlayer) {
  const piece = board[startRow][startCol];
  if (piece === EMPTY) return false;
  
  const player = this.getPiecePlayer(piece);
  if (player !== currentPlayer) return false;
  
  // Целевая клетка должна быть пустой
  if (board[endRow][endCol] !== EMPTY) return false;
  
  const dr = endRow - startRow;
  const dc = endCol - startCol;
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);
  
  // Должно быть движение по диагонали
  if (absDr !== absDc || absDr === 0) return false;
  
  const isKing = this.isKing(piece);
  
  // Проверяем наличие обязательных взятий
  const hasCaptures = this.hasMandatoryCaptures(board, currentPlayer);
  
  // Для дамки
  if (isKing) {
    const stepR = dr > 0 ? 1 : -1;
    const stepC = dc > 0 ? 1 : -1;
    
    let r = startRow + stepR;
    let c = startCol + stepC;
    let foundOpponent = false;
    let opponentPos = null;
    let pathClear = true;
    
    // Проверяем путь
    while (r !== endRow || c !== endCol) {
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
        pathClear = false;
        break;
      }
      
      if (board[r][c] !== EMPTY) {
        if (this.getPiecePlayer(board[r][c]) !== player) {
          if (!foundOpponent) {
            foundOpponent = true;
            opponentPos = [r, c];
          } else {
            // Не может быть двух противников на пути
            pathClear = false;
            break;
          }
        } else {
          // Своя фигура на пути
          pathClear = false;
          break;
        }
      }
      
      r += stepR;
      c += stepC;
    }
    
    // Если нашли противника, проверяем что мы остановились за ним
    if (foundOpponent && opponentPos) {
      // Проверяем, что мы находимся за противником (в той же линии)
      if (pathClear) {
        // Проверяем, что между противником и целевой клеткой нет других фигур
        let checkR = opponentPos[0] + stepR;
        let checkC = opponentPos[1] + stepC;
        let pathAfterOpponentClear = true;
        
        while (checkR !== endRow || checkC !== endCol) {
          if (board[checkR][checkC] !== EMPTY) {
            pathAfterOpponentClear = false;
            break;
          }
          checkR += stepR;
          checkC += stepC;
        }
        
        if (pathAfterOpponentClear) {
          return true;
        }
      }
      return false;
    } else if (pathClear && !hasCaptures) {
      // Простой ход без взятия (только если нет обязательных взятий)
      return true;
    }
    
    return false;
  } else {
    // Обычная шашка
    if (absDr === 2) {
      // Проверка взятия
      const midRow = (startRow + endRow) / 2;
      const midCol = (startCol + endCol) / 2;
      const midPiece = board[midRow][midCol];
      
      if (midPiece !== EMPTY && this.getPiecePlayer(midPiece) !== player) {
        return true;
      }
      return false;
    } else if (absDr === 1 && !hasCaptures) {
      // Простой ход
      if (player === PLAYER_WHITE && dr < 0) return true;
      if (player === PLAYER_BLACK && dr > 0) return true;
    }
  }
  
  return false;
}
  // Выполнить ход
  static makeMove(board, startRow, startCol, endRow, endCol) {
    const newBoard = board.map(row => [...row]);
    const piece = newBoard[startRow][startCol];
    const isKing = this.isKing(piece);
    const isCapture = Math.abs(endRow - startRow) > 1;
    
    // Перемещаем фигуру
    newBoard[endRow][endCol] = piece;
    newBoard[startRow][startCol] = EMPTY;
    
    // Если это взятие, убираем съеденную фигуру
    if (isCapture) {
      const dr = endRow > startRow ? 1 : -1;
      const dc = endCol > startCol ? 1 : -1;
      
      let r = startRow + dr;
      let c = startCol + dc;
      
      // Ищем первую вражескую фигуру на пути и убираем её
      while (r !== endRow || c !== endCol) {
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
        
        if (newBoard[r][c] !== EMPTY) {
          newBoard[r][c] = EMPTY;
          break;
        }
        
        r += dr;
        c += dc;
      }
    }
    
    return newBoard;
  }

  // Проверить превращение в дамку
  static checkForKing(board, row, col) {
    const piece = board[row][col];
    
    if (piece === WHITE_PAWN && row === 0) {
      board[row][col] = WHITE_KING;
      return true;
    } else if (piece === BLACK_PAWN && row === 7) {
      board[row][col] = BLACK_KING;
      return true;
    }
    
    return false;
  }

  // Проверить, может ли фигура продолжать бой после взятия
  static canContinueCapture(board, row, col, player, justPromoted = false) {
    // Если только что стала дамкой - не может продолжать бой
    if (justPromoted) return false;
    
    // Получаем все возможные взятия с текущей позиции
    const captures = this.getCaptureMoves(board, row, col, player);
    
    // Для отладки
    if (captures.length > 0) {
        console.log('Можно продолжать бой! Доступные взятия:', captures);
    }
    
    return captures.length > 0;
    }

  // Получить все возможные ходы для игрока
  static getAllValidMoves(board, player, justPromoted = false) {
    const moves = [];
    
    // Сначала проверяем обязательные взятия
    const hasCaptures = this.hasMandatoryCaptures(board, player);
    
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board[r][c];
        if (piece !== EMPTY && this.getPiecePlayer(piece) === player) {
          // Если фигура только что стала дамкой, она не может бить
          if (justPromoted) {
            const simpleMoves = this.getSimpleMoves(board, r, c, player);
            simpleMoves.forEach(([tr, tc]) => {
              moves.push([r, c, tr, tc, false]);
            });
          } else {
            // Получаем все возможные взятия
            const captureMoves = this.getCaptureMoves(board, r, c, player);
            
            // Если есть обязательные взятия, добавляем только их
            if (hasCaptures) {
              captureMoves.forEach(([tr, tc]) => {
                moves.push([r, c, tr, tc, true]);
              });
            } else {
              // Иначе добавляем и простые ходы
              captureMoves.forEach(([tr, tc]) => {
                moves.push([r, c, tr, tc, true]);
              });
              
              const simpleMoves = this.getSimpleMoves(board, r, c, player);
              simpleMoves.forEach(([tr, tc]) => {
                moves.push([r, c, tr, tc, false]);
              });
            }
          }
        }
      }
    }
    
    return moves;
  }

  // Проверить статус игры
  static getGameStatus(board) {
    let whitePieces = 0;
    let blackPieces = 0;
    
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board[r][c];
        if (piece === WHITE_PAWN || piece === WHITE_KING) whitePieces++;
        if (piece === BLACK_PAWN || piece === BLACK_KING) blackPieces++;
      }
    }
    
    if (whitePieces === 0) return PLAYER_BLACK;
    if (blackPieces === 0) return PLAYER_WHITE;
    
    return null;
  }

  // Проверить, есть ли ходы у игрока
  static hasMoves(board, player) {
    const moves = this.getAllValidMoves(board, player);
    return moves.length > 0;
  }
}