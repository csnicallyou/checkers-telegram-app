import { GameLogic } from './gameLogic';
import { PLAYER_WHITE, PLAYER_BLACK } from '../utils/constants';

// Веса для оценки позиции (из вашего const.py)
const PIECE_VALUE = 100;
const KING_VALUE = 330;
const CAPTURE_BONUS = 60;
const BACK_ROW_BONUS = 25;
const CENTER_CONTROL = 12;
const MOBILITY_BONUS = 3;
const DANGER_PENALTY = 40;
const PROTECTION_BONUS = 20;
const KING_PROTECTION = 10;
const PAWN_CHAIN_BONUS = 15;
const TEMPO_BONUS = 5;
const ENDGAME_KING_BONUS = 50;

class StrongAI {
    constructor(depth = 6) {
        this.depth = depth;
        this.nodes = 0;
        this.cutoffs = 0;
    }

    // Главный метод для получения лучшего хода
    getBestMove(board, player, depth = null) {
        this.nodes = 0;
        this.cutoffs = 0;
        const searchDepth = depth || this.depth;
        
        console.log(`🤖 AI ищет лучший ход (глубина: ${searchDepth})...`);
        
        const moves = GameLogic.getAllValidMoves(board, player);
        if (moves.length === 0) return null;
        if (moves.length === 1) return moves[0];
        
        // Сортируем ходы: сначала взятия
        moves.sort((a, b) => {
            const aIsCapture = Math.abs(a[2] - a[0]) > 1;
            const bIsCapture = Math.abs(b[2] - b[0]) > 1;
            if (aIsCapture && !bIsCapture) return -1;
            if (!aIsCapture && bIsCapture) return 1;
            return 0;
        });
        
        let bestMove = null;
        let bestScore = player === PLAYER_WHITE ? -Infinity : Infinity;
        
        for (const move of moves) {
            const [startRow, startCol, endRow, endCol, isCapture] = move;
            
            // Пробуем ход
            let newBoard = GameLogic.makeMove(board, startRow, startCol, endRow, endCol);
            GameLogic.checkForKing(newBoard, endRow, endCol);
            
            // Проверяем возможность продолжения боя
            let justPromoted = GameLogic.isKing(newBoard[endRow][endCol]) && 
                              !GameLogic.isKing(board[startRow][startCol]);
            
            let score;
            if (isCapture && GameLogic.canContinueCapture(newBoard, endRow, endCol, player, justPromoted)) {
                // Продолжаем цепочку взятий - не меняем игрока
                score = this.minimax(newBoard, searchDepth - 1, -Infinity, Infinity, player === PLAYER_WHITE, true);
            } else {
                // Ход закончен - меняем игрока
                score = this.minimax(newBoard, searchDepth - 1, -Infinity, Infinity, player !== PLAYER_WHITE, false);
            }
            
            if (player === PLAYER_WHITE) {
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            } else {
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        }
        
        console.log(`📊 Анализ завершен: узлов=${this.nodes}, отсечений=${this.cutoffs}`);
        console.log(`🎯 Лучший ход:`, bestMove, `оценка:`, bestScore);
        
        return bestMove;
    }

    // Минимакс с альфа-бета отсечением
    minimax(board, depth, alpha, beta, maximizing, isCaptureChain = false) {
        this.nodes++;
        
        // Проверка окончания игры
        const winner = GameLogic.getGameStatus(board);
        if (winner) {
            return winner === PLAYER_WHITE ? 1000000 : -1000000;
        }
        
        if (depth === 0) {
            return this.evaluatePosition(board, maximizing ? PLAYER_WHITE : PLAYER_BLACK);
        }
        
        const player = maximizing ? PLAYER_WHITE : PLAYER_BLACK;
        const moves = GameLogic.getAllValidMoves(board, player, isCaptureChain);
        
        if (moves.length === 0) {
            return maximizing ? -1000000 : 1000000;
        }
        
        // Сортируем ходы для лучшего отсечения
        moves.sort((a, b) => {
            const aIsCapture = Math.abs(a[2] - a[0]) > 1;
            const bIsCapture = Math.abs(b[2] - b[0]) > 1;
            if (aIsCapture && !bIsCapture) return -1;
            if (!aIsCapture && bIsCapture) return 1;
            return 0;
        });
        
        if (maximizing) {
            let value = -Infinity;
            for (const move of moves) {
                const [startRow, startCol, endRow, endCol, isCapture] = move;
                
                let newBoard = GameLogic.makeMove(board, startRow, startCol, endRow, endCol);
                const promoted = GameLogic.checkForKing(newBoard, endRow, endCol);
                
                let justPromoted = GameLogic.isKing(newBoard[endRow][endCol]) && 
                                  !GameLogic.isKing(board[startRow][startCol]);
                
                if (isCapture && GameLogic.canContinueCapture(newBoard, endRow, endCol, player, justPromoted)) {
                    value = Math.max(value, this.minimax(newBoard, depth - 1, alpha, beta, maximizing, true));
                } else {
                    value = Math.max(value, this.minimax(newBoard, depth - 1, alpha, beta, !maximizing, false));
                }
                
                alpha = Math.max(alpha, value);
                if (beta <= alpha) {
                    this.cutoffs++;
                    break;
                }
            }
            return value;
        } else {
            let value = Infinity;
            for (const move of moves) {
                const [startRow, startCol, endRow, endCol, isCapture] = move;
                
                let newBoard = GameLogic.makeMove(board, startRow, startCol, endRow, endCol);
                const promoted = GameLogic.checkForKing(newBoard, endRow, endCol);
                
                let justPromoted = GameLogic.isKing(newBoard[endRow][endCol]) && 
                                  !GameLogic.isKing(board[startRow][startCol]);
                
                if (isCapture && GameLogic.canContinueCapture(newBoard, endRow, endCol, player, justPromoted)) {
                    value = Math.min(value, this.minimax(newBoard, depth - 1, alpha, beta, maximizing, true));
                } else {
                    value = Math.min(value, this.minimax(newBoard, depth - 1, alpha, beta, !maximizing, false));
                }
                
                beta = Math.min(beta, value);
                if (beta <= alpha) {
                    this.cutoffs++;
                    break;
                }
            }
            return value;
        }
    }

    // Продвинутая оценка позиции
    evaluatePosition(board, player) {
        let score = 0;
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece === 0) continue;
                
                const piecePlayer = GameLogic.getPiecePlayer(piece);
                const isKing = GameLogic.isKing(piece);
                const multiplier = piecePlayer === player ? 1 : -1;
                
                // Базовая стоимость фигур
                if (isKing) {
                    score += KING_VALUE * multiplier;
                } else {
                    score += PIECE_VALUE * multiplier;
                }
                
                // Бонус за продвижение (чем ближе к дамкам, тем лучше)
                if (!isKing) {
                    if (piecePlayer === PLAYER_WHITE) {
                        score += (7 - r) * 5 * multiplier;
                    } else {
                        score += r * 5 * multiplier;
                    }
                }
                
                // Бонус за контроль центра
                if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
                    score += CENTER_CONTROL * multiplier;
                }
                
                // Бонус за защиту (фигуры поддерживают друг друга)
                const protectionScore = this.getProtectionScore(board, r, c, piecePlayer);
                if (protectionScore > 0) {
                    score += PROTECTION_BONUS * multiplier * protectionScore;
                }
                
                // Штраф за опасные позиции
                if (this.isInDanger(board, r, c, piecePlayer)) {
                    score -= DANGER_PENALTY * multiplier;
                }
                
                // Бонус за дамки в эндшпиле
                if (isKing && this.isEndgame(board)) {
                    score += ENDGAME_KING_BONUS * multiplier;
                }
            }
        }
        
        // Бонус за темп (очередь хода)
        if (this.getCurrentPlayer(board) === player) {
            score += TEMPO_BONUS;
        }
        
        // Бонус за построение цепочек
        score += this.evaluatePawnChains(board, player) * PAWN_CHAIN_BONUS;
        
        // Бонус за возможность взятия
        score += this.evaluateCapturePotential(board, player) * CAPTURE_BONUS;
        
        return score;
    }

    // Оценка защиты фигуры
    getProtectionScore(board, row, col, player) {
        let score = 0;
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        
        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                const piece = board[nr][nc];
                if (piece !== 0 && GameLogic.getPiecePlayer(piece) === player) {
                    score++;
                }
            }
        }
        return score;
    }

    // Проверка, находится ли фигура под ударом
    isInDanger(board, row, col, player) {
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        
        for (const [dr, dc] of directions) {
            // Проверяем возможность взятия
            const attackerRow = row - dr;
            const attackerCol = col - dc;
            const landingRow = row + dr;
            const landingCol = col + dc;
            
            if (attackerRow >= 0 && attackerRow < 8 && 
                attackerCol >= 0 && attackerCol < 8 &&
                landingRow >= 0 && landingRow < 8 && 
                landingCol >= 0 && landingCol < 8) {
                
                const attacker = board[attackerRow][attackerCol];
                const landing = board[landingRow][landingCol];
                
                if (attacker !== 0 && 
                    GameLogic.getPiecePlayer(attacker) !== player &&
                    landing === 0) {
                    
                    if (GameLogic.isKing(attacker) || 
                        (player === PLAYER_WHITE && dr > 0) || 
                        (player === PLAYER_BLACK && dr < 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Проверка эндшпиля
    isEndgame(board) {
        let pieces = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] !== 0) pieces++;
            }
        }
        return pieces <= 8;
    }

    // Оценка построения цепочек
    evaluatePawnChains(board, player) {
        let chains = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece !== 0 && GameLogic.getPiecePlayer(piece) === player && !GameLogic.isKing(piece)) {
                    // Проверяем соседние клетки по диагонали
                    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
                    for (const [dr, dc] of directions) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                            const neighbor = board[nr][nc];
                            if (neighbor !== 0 && 
                                GameLogic.getPiecePlayer(neighbor) === player &&
                                !GameLogic.isKing(neighbor)) {
                                chains++;
                            }
                        }
                    }
                }
            }
        }
        return chains / 2; // Каждая цепочка посчитана дважды
    }

    // Оценка потенциала взятия
    evaluateCapturePotential(board, player) {
        let potential = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece !== 0 && GameLogic.getPiecePlayer(piece) === player) {
                    const captures = GameLogic.getCaptureMoves(board, r, c, player);
                    potential += captures.length;
                }
            }
        }
        return potential;
    }

    getCurrentPlayer(board) {
        // Простая эвристика: считаем, что ход белых, если игра не окончена
        // В реальности нужно передавать currentPlayer
        return PLAYER_WHITE;
    }
}

export const strongAI = new StrongAI(10); // Глубина 6 по умолчанию