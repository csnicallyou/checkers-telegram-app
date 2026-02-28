// src/services/colyseusMultiplayer.js
import * as Colyseus from 'colyseus.js';

class ColyseusMultiplayer {
    constructor() {
        this.client = null;
        this.room = null;
        this.playerId = null;
        this.playerColor = null;
        this.opponent = null;
        this.serverUrl = import.meta.env.VITE_SERVER_URL || 'ws://localhost:3001';
        
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
        if (!this.client) await this.connect();
        
        try {
            this.room = await this.client.create('game', {
                name: playerName
            });
            
            console.log('✅ Game created:', this.room.id);
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
        if (!this.client) await this.connect();
        
        try {
            this.room = await this.client.joinById(gameId, {
                name: playerName
            });
            
            console.log('✅ Joined game:', gameId);
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
        this.room.onStateChange((state) => {
            console.log('State updated:', state);
            
            const players = Array.from(state.players.values());
            this.playerId = this.room.sessionId;
            
            players.forEach(p => {
                if (p.id === this.playerId) {
                    this.playerColor = p.color;
                } else {
                    this.opponent = p;
                }
            });
            
            if (this.onGameUpdate) {
                this.onGameUpdate({
                    board: state.board,
                    currentPlayer: state.currentPlayer,
                    players: players,
                    lastMove: state.lastMove
                });
            }
        });

        this.room.onMessage('player_joined', (data) => {
            console.log('Player joined:', data);
            if (this.onPlayerJoined) this.onPlayerJoined(data);
        });

        this.room.onMessage('game_ready', (data) => {
            console.log('Game ready:', data);
            if (this.onGameStart) this.onGameStart();
        });

        this.room.onMessage('move_made', (data) => {
            console.log('Move made:', data);
            if (this.onGameUpdate) {
                this.onGameUpdate({
                    board: data.board,
                    currentPlayer: data.currentPlayer,
                    lastMove: {
                        startRow: data.startRow,
                        startCol: data.startCol,
                        endRow: data.endRow,
                        endCol: data.endCol
                    }
                });
            }
        });

        this.room.onMessage('player_left', (data) => {
            console.log('Player left:', data);
            if (this.onPlayerLeft) this.onPlayerLeft(data);
        });

        this.room.onLeave((code) => {
            console.log('Left room:', code);
            this.room = null;
        });
    }

    sendMove(startRow, startCol, endRow, endCol) {
        if (this.room) {
            this.room.send('move', {
                startRow, startCol, endRow, endCol
            });
        }
    }

    startGame() {
        if (this.room) {
            this.room.send('start_game');
        }
    }

    leave() {
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
    }
}

export const colyseusMultiplayer = new ColyseusMultiplayer();