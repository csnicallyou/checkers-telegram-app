// server/rooms/GameState.js
const { Schema, MapSchema, defineTypes } = require('@colyseus/schema');

class Player extends Schema {
    constructor(id, name) {
        super();
        this.id = id;
        this.name = name;
        this.color = 0;
        this.connected = true;
    }
}
defineTypes(Player, {
    id: "string",
    name: "string",
    color: "number",
    connected: "boolean"
});

class GameState extends Schema {
    constructor() {
        super();
        // Используем одномерный массив для доски
        this.board = new Array(64).fill(0);
        this.initializeBoard();
        this.currentPlayer = 1;
        this.players = new MapSchema();
        this.winner = 0;
        this.lastMoveRow1 = 0;
        this.lastMoveCol1 = 0;
        this.lastMoveRow2 = 0;
        this.lastMoveCol2 = 0;
    }

    initializeBoard() {
        // Заполняем доску (индексы 0-63)
        // Черные шашки (ряды 0-2)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row * 8 + col] = 2; // BLACK_PAWN
                }
            }
        }
        
        // Белые шашки (ряды 5-7)
        for (let row = 5; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row * 8 + col] = 1; // WHITE_PAWN
                }
            }
        }
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
        // Сохраняем ход
        this.lastMoveRow1 = startRow;
        this.lastMoveCol1 = startCol;
        this.lastMoveRow2 = endRow;
        this.lastMoveCol2 = endCol;
        
        // Временно просто меняем игрока
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        
        return true;
    }
}
defineTypes(GameState, {
    board: ["number"],
    currentPlayer: "number",
    players: { map: Player },
    winner: "number",
    lastMoveRow1: "number",
    lastMoveCol1: "number",
    lastMoveRow2: "number",
    lastMoveCol2: "number"
});

module.exports = { GameState, Player };