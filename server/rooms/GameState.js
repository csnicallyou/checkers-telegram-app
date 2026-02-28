// server/rooms/GameState.js
const schema = require('colyseus').Schema;
const { MapSchema, ArraySchema } = require('@colyseus/schema');

// Класс для игрока
class Player extends schema.Schema {
    constructor(id, name) {
        super();
        this.id = id;
        this.name = name;
        this.color = null;
        this.connected = true;
    }
}
schema.defineTypes(Player, {
    id: "string",
    name: "string",
    color: "number",
    connected: "boolean"
});

// Класс для состояния игры
class GameState extends schema.Schema {
    constructor() {
        super();
        this.board = this.initializeBoard();
        this.currentPlayer = 1; // 1 - белые, 2 - черные
        this.players = new MapSchema();
        this.winner = null;
        this.lastMove = null;
    }

    initializeBoard() {
        const board = Array(8).fill().map(() => Array(8).fill(0));
        
        // Черные шашки (сверху)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) {
                    board[r][c] = 2; // BLACK_PAWN
                }
            }
        }
        
        // Белые шашки (снизу)
        for (let r = 5; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) {
                    board[r][c] = 1; // WHITE_PAWN
                }
            }
        }
        
        return board;
    }

    addPlayer(id, name) {
        const player = new Player(id, name);
        if (this.players.size === 0) {
            player.color = 1; // белые
        } else if (this.players.size === 1) {
            player.color = 2; // черные
        }
        this.players.set(id, player);
        return player;
    }

    removePlayer(id) {
        this.players.delete(id);
    }

    makeMove(startRow, startCol, endRow, endCol) {
        // Здесь будет логика проверки хода
        // Пока просто сохраняем ход
        this.lastMove = { startRow, startCol, endRow, endCol };
        
        // Меняем игрока
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        
        return true;
    }
}
schema.defineTypes(GameState, {
    board: ["number"],
    currentPlayer: "number",
    players: { map: Player },
    winner: "number",
    lastMove: { startRow: "number", startCol: "number", endRow: "number", endCol: "number" }
});

module.exports = { GameState, Player };