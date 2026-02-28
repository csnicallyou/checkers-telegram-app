class SimpleMultiplayer {
    constructor() {
        this.ws = null;
        this.gameId = null;
        this.playerId = null;
        this.playerName = null;
        this.isHost = false;
        this.opponent = null;
        this.connected = false;
        this.playerSide = 'white'; // 'white' или 'black'
        
        this.serverUrl = import.meta.env.VITE_SERVER_URL || 'wss://checkers-server-0y7z.onrender.com';
        
        this.onGameCreated = null;
        this.onGameJoined = null;
        this.onPlayerJoined = null;
        this.onGameStarted = null;
        this.onOpponentMove = null;
        this.onOpponentLeft = null;
        this.onSideSelected = null;
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
                        console.log('📩 Received:', data.type, data);
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
                console.log('🆔 Client ID:', data.clientId);
                break;
                
            case 'game_created':
                this.gameId = data.gameId;
                this.isHost = true;
                this.playerSide = data.side || 'white';
                if (this.onGameCreated) this.onGameCreated(data);
                break;
                
            case 'game_joined':
                this.gameId = data.gameId;
                this.isHost = false;
                this.opponent = { name: data.host.name };
                this.playerSide = data.side || 'black';
                if (this.onGameJoined) this.onGameJoined(data);
                break;
                
            case 'player_joined':
                this.opponent = { name: data.guest.name };
                if (this.onPlayerJoined) this.onPlayerJoined(data);
                break;
                
            case 'side_selected':
                this.playerSide = data.side;
                if (this.onSideSelected) this.onSideSelected(data.side);
                break;
                
            case 'game_started':
                if (this.onGameStarted) this.onGameStarted();
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

    async createGame(playerName, side = 'white') {
        this.playerName = playerName;
        this.playerSide = side;
        if (!this.connected) {
            await this.connect();
        }
        this.send('create_game', { playerName, side });
    }

    async joinGame(gameId, playerName) {
        this.playerName = playerName;
        if (!this.connected) {
            await this.connect();
        }
        this.send('join_game', { gameId: gameId.toUpperCase(), playerName });
    }

    sendSideSelection(side) {
        if (this.gameId) {
            this.send('select_side', { gameId: this.gameId, side });
        }
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
        this.opponent = null;
        this.isHost = false;
    }

    send(type, data) {
        if (this.ws && this.connected) {
            this.ws.send(JSON.stringify({ type, ...data }));
        } else {
            console.warn('Cannot send, not connected');
        }
    }
}

export const simpleMultiplayer = new SimpleMultiplayer();