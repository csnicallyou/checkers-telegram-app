// src/services/colyseusMultiplayer.js
import * as Colyseus from 'colyseus.js';

class ColyseusMultiplayer {
    constructor() {
        this.client = null;
        this.room = null;
        this.playerId = null;
        this.playerColor = null;
        this.opponent = null;
        this.gameId = null;
        this.serverUrl = import.meta.env.VITE_SERVER_URL || 'wss://checkers-server-0y7z.onrender.com';
        
        this.onGameUpdate = null;
        this.onPlayerJoined = null;
        this.onGameStart = null;
        this.onPlayerLeft = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.client = new Colyseus.Client(this.serverUrl);
                console.log('✅ Colyseus client created');
                resolve();
            } catch (error) {
                console.error('❌ Connection error:', error);
                reject(error);
            }
        });
    }

    async createGame(playerName) {
        console.log('🚀 Creating game with:', playerName);
        
        if (!this.client) {
            console.log('🔄 No client, connecting...');
            await this.connect();
        }
        
        try {
            this.room = await this.client.create('game', {
                name: playerName
            });
            
            this.gameId = this.room.id;
            this.playerId = this.room.sessionId;
            
            console.log('✅ Game created:', this.room.id);
            console.log('👤 Player ID:', this.playerId);
            
            this.setupRoomListeners();
            
            return {
                gameId: this.room.id,
                playerId: this.room.sessionId
            };
            
        } catch (error) {
            console.error('❌ Error creating game:', error);
            throw error;
        }
    }

    async joinGame(gameId, playerName) {
        console.log('🚀 Joining game:', gameId, 'as', playerName);
        
        if (!this.client) {
            console.log('🔄 No client, connecting...');
            await this.connect();
        }
        
        try {
            this.room = await this.client.joinById(gameId, {
                name: playerName
            });
            
            this.gameId = this.room.id;
            this.playerId = this.room.sessionId;
            
            console.log('✅ Joined game:', gameId);
            console.log('👤 Player ID:', this.playerId);
            
            this.setupRoomListeners();
            
            return {
                gameId: this.room.id,
                playerId: this.room.sessionId
            };
            
        } catch (error) {
            console.error('❌ Error joining game:', error);
            throw error;
        }
    }

    setupRoomListeners() {
        // Слушаем изменения состояния
        this.room.onStateChange((state) => {
        console.log('📊 State updated:', state);
        
        // Определяем игроков БЕЗОПАСНО
        const players = [];
        this.playerColor = null;
        this.opponent = null;
        
        // Проверяем, что state.players существует
        if (state.players && typeof state.players.forEach === 'function') {
            state.players.forEach((player, id) => {
                players.push({
                    id: id,
                    name: player.name,
                    color: player.color
                });
                
                if (id === this.playerId) {
                    this.playerColor = player.color;
                    console.log('🎨 Это я! Цвет:', player.color);
                } else {
                    this.opponent = {
                        id: id,
                        name: player.name,
                        color: player.color
                    };
                    console.log('👤 Это противник:', player.name);
                }
            });
        } else {
            console.log('⚠️ Нет игроков в состоянии');
        }
        
        console.log('🎨 My color:', this.playerColor);
        console.log('👤 Opponent:', this.opponent);
        
        if (this.onGameUpdate) {
            // Преобразуем одномерный массив в двумерный для доски
            const board2D = [];
            if (state.board && state.board.length === 64) {
                for (let i = 0; i < 8; i++) {
                    board2D.push(state.board.slice(i * 8, (i + 1) * 8));
                }
            } else {
                console.log('⚠️ Некорректная доска:', state.board);
            }
            
            this.onGameUpdate({
                board: board2D,
                currentPlayer: state.currentPlayer,
                players: players,
                lastMove: state.lastMoveRow1 !== 0 ? {
                    startRow: state.lastMoveRow1,
                    startCol: state.lastMoveCol1,
                    endRow: state.lastMoveRow2,
                    endCol: state.lastMoveCol2
                } : null
            });
        }
    });

        // Слушаем события
        this.room.onMessage('player_joined', (data) => {
            console.log('👋 Player joined:', data);
            if (this.onPlayerJoined) {
                this.onPlayerJoined(data);
            }
        });

        this.room.onMessage('game_ready', () => {
            console.log('🎮 Game ready!');
            if (this.onGameStart) {
                this.onGameStart();
            }
        });

        this.room.onMessage('move_made', (data) => {
            console.log('♟️ Move made:', data);
            // Обновление придет через onStateChange
        });

        this.room.onMessage('game_started', () => {
            console.log('🎮 Game started!');
            if (this.onGameStart) {
                this.onGameStart();
            }
        });

        this.room.onMessage('player_left', (data) => {
            console.log('👋 Player left:', data);
            if (this.onPlayerLeft) {
                this.onPlayerLeft(data);
            }
        });

        this.room.onLeave((code) => {
            console.log('👋 Left room:', code);
            this.room = null;
            this.gameId = null;
            this.opponent = null;
        });

        this.room.onError((code, message) => {
            console.error('❌ Room error:', code, message);
        });
    }

    sendMove(startRow, startCol, endRow, endCol) {
        if (this.room) {
            console.log('♟️ Sending move:', { startRow, startCol, endRow, endCol });
            this.room.send('move', {
                startRow, startCol, endRow, endCol
            });
        }
    }

    startGame() {
        if (this.room) {
            console.log('🎮 Starting game');
            this.room.send('start_game');
        }
    }

    leave() {
        if (this.room) {
            this.room.leave();
            this.room = null;
            this.gameId = null;
            this.opponent = null;
        }
    }
}

export const colyseusMultiplayer = new ColyseusMultiplayer();