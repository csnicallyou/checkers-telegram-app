class TelegramMultiplayer {
    constructor() {
        this.ws = null;
        this.gameId = null;
        this.playerId = null;
        this.playerRole = null;
        this.playerName = null;
        this.playerColor = null;
        this.opponentName = null;
        this.opponentColor = null;
        this.connected = false;
        
        this.serverUrl = import.meta.env.VITE_SERVER_URL || 'wss://checkers-server-0y7z.onrender.com';
        
        this.onGameCreated = null;
        this.onGameJoined = null;
        this.onPlayerJoined = null;
        this.onPlayerReady = null;
        this.onGameStarted = null;
        this.onOpponentMove = null;
        this.onOpponentLeft = null;
        this.onError = null;
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
                        console.log('📩 Received:', data);
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
        switch (data.type) {
            case 'connected':
                this.playerId = data.clientId;
                break;
                
            case 'game_created':
                this.gameId = data.gameId;
                this.playerRole = data.role; // берем роль из данных
                this.playerName = data.playerName;
                this.playerColor = data.hostSide === 'white' ? 1 : 2;
                if (this.onGameCreated) {
                    this.onGameCreated({
                        gameId: data.gameId,
                        role: data.role,
                        hostSide: data.hostSide,
                        guestSide: data.guestSide
                    });
                }
                break;
                
            case 'game_joined':
                this.gameId = data.gameId;
                this.playerRole = data.role; // берем роль из данных
                this.playerName = data.guestName;
                this.playerColor = data.guestSide === 'white' ? 1 : 2;
                this.opponentName = data.hostName;
                this.opponentColor = data.hostSide === 'white' ? 1 : 2;
                if (this.onGameJoined) {
                    this.onGameJoined({
                        gameId: data.gameId,
                        role: data.role,
                        hostName: data.hostName,
                        hostSide: data.hostSide,
                        guestName: data.guestName,
                        guestSide: data.guestSide
                    });
                }
                break;
                
            case 'player_joined':
                this.opponentName = data.guestName;
                this.opponentColor = data.guestSide === 'white' ? 1 : 2;
                if (this.onPlayerJoined) {
                    this.onPlayerJoined({
                        guestName: data.guestName,
                        guestSide: data.guestSide
                    });
                }
                break;
                
            case 'player_ready':
                if (this.onPlayerReady) {
                    this.onPlayerReady({
                        role: data.role,
                        playerName: data.playerName,
                        ready: data.ready
                    });
                }
                break;
                
            case 'game_started':
                this.playerRole = data.playerRole;
                this.playerName = data.playerName;
                this.playerColor = data.playerColor;
                this.opponentName = data.opponentName;
                this.opponentColor = data.opponentColor;
                if (this.onGameStarted) {
                    this.onGameStarted({
                        playerRole: data.playerRole,
                        playerName: data.playerName,
                        playerColor: data.playerColor,
                        opponentName: data.opponentName,
                        opponentColor: data.opponentColor
                    });
                }
                break;
                
            case 'opponent_move':
                if (this.onOpponentMove) this.onOpponentMove(data);
                break;
                
            case 'opponent_left':
                if (this.onOpponentLeft) this.onOpponentLeft();
                break;
                
            case 'error':
                if (this.onError) this.onError(data.message);
                break;
        }
    }

    async createGame(playerName, side) {
        if (!this.connected) {
            await this.connect();
        }
        this.playerName = playerName;
        this.send('create_game', { playerName, side });
    }

    async joinGame(gameId, playerName) {
        if (!this.connected) {
            await this.connect();
        }
        this.playerName = playerName;
        this.send('join_game', { playerName, gameId: gameId.toUpperCase() });
    }

    sendReady(gameId, ready) {
        this.send('player_ready', { gameId, ready });
    }

    startGame(gameId) {
        this.send('start_game', { gameId });
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
        this.opponentName = null;
        this.opponentColor = null;
    }

    send(type, data) {
        if (this.ws && this.connected) {
            this.ws.send(JSON.stringify({ type, ...data }));
        }
    }
}

export const telegramMultiplayer = new TelegramMultiplayer();