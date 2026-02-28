// src/services/telegramMultiplayer.js
class TelegramMultiplayer {
    constructor() {
        this.ws = null;
        this.gameId = null;
        this.playerId = null;
        this.playerRole = null; // 'host' или 'guest'
        this.playerColor = null; // 1 - белые, 2 - черные
        this.opponent = null;
        this.connected = false;
        
        this.serverUrl = import.meta.env.VITE_SERVER_URL || 'wss://checkers-server-0y7z.onrender.com';
        
        // Колбэки
        this.onGameCreated = null;
        this.onGameJoined = null;
        this.onGameStarted = null;
        this.onOpponentMove = null;
        this.onOpponentLeft = null;
        this.onError = null;
    }

    async createGame(side) {
    if (!this.connected) {
        await this.connect();
    }
    this.send('create_game', { side });
    }

    async sendReady(gameId, ready) {
        this.send('player_ready', { gameId, ready });
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);
                
                this.ws.onopen = () => {
                    console.log('✅ WebSocket connected');
                    this.connected = true;
                    resolve();
                };
                
                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    reject(error);
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (e) {
                        console.error('Error parsing message:', e);
                    }
                };
                
                this.ws.onclose = () => {
                    console.log('🔴 WebSocket disconnected');
                    this.connected = false;
                };
                
            } catch (error) {
                reject(error);
            }
        });
    }

    handleMessage(data) {
        console.log('📩 Received:', data);
        
        switch (data.type) {
            case 'connected':
                this.playerId = data.clientId;
                break;
                
            case 'game_created':
                this.gameId = data.gameId;
                this.playerRole = 'host';
                this.playerColor = data.color;
                if (this.onGameCreated) this.onGameCreated(data);
                break;

            case 'player_joined':
                this.opponent = { name: data.guestName };
                if (this.onPlayerJoined) this.onPlayerJoined(data);
                break;
        
            case 'player_ready':
                if (this.onPlayerReady) this.onPlayerReady(data);
                break;
                
            case 'game_joined':
                this.gameId = data.gameId;
                this.playerRole = 'guest';
                this.playerColor = data.color;
                this.opponent = { name: data.hostName };
                if (this.onGameJoined) this.onGameJoined(data);
                break;
                
            case 'game_started':
                if (this.onGameStarted) this.onGameStarted(data);
                break;
                
            case 'opponent_move':
                if (this.onOpponentMove) this.onOpponentMove(data);
                break;
                
            case 'opponent_left':
                this.opponent = null;
                if (this.onOpponentLeft) this.onOpponentLeft();
                break;
                
            case 'error':
                if (this.onError) this.onError(data.message);
                break;
        }
    }

    async createGame() {
        if (!this.connected) {
            await this.connect();
        }
        this.send('create_game', {});
    }

    async joinGame(gameId) {
        if (!this.connected) {
            await this.connect();
        }
        this.send('join_game', { gameId: gameId.toUpperCase() });
    }

    startGame() {
        this.send('start_game', { gameId: this.gameId });
    }

    sendMove(move, board, currentPlayer) {
        this.send('make_move', {
            gameId: this.gameId,
            move,
            board,
            currentPlayer
        });
    }

    leaveGame() {
        if (this.gameId) {
            this.send('leave_game', { gameId: this.gameId });
        }
        this.gameId = null;
        this.playerRole = null;
        this.playerColor = null;
        this.opponent = null;
    }

    

    send(type, data) {
        if (this.ws && this.connected) {
            this.ws.send(JSON.stringify({ type, ...data }));
        }
    }
}

export const telegramMultiplayer = new TelegramMultiplayer();