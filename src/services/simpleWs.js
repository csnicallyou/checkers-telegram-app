class SimpleWs {
    constructor() {
        this.ws = null;
        this.gameId = null;
        this.myColor = null;
        this.oppColor = null;
        this.isHost = false;
        this.connected = false;
        
        this.serverUrl = import.meta.env.VITE_SERVER_URL || 'wss://checkers-server-0y7z.onrender.com';
        
        this.onCreated = null;
        this.onJoined = null;
        this.onGuestJoined = null;
        this.onHostReady = null;
        this.onGuestReady = null;
        this.onBothReady = null;
        this.onGameStart = null;
        this.onOpponentMove = null;
        this.onOpponentLeft = null;
        this.onError = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = () => {
                this.connected = true;
                resolve();
            };
            
            this.ws.onerror = reject;
            
            this.ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                console.log('📩', data);
                
                switch(data.type) {
                    case 'created':
                        this.gameId = data.gameId;
                        this.myColor = data.side === 'white' ? 1 : 2;
                        this.isHost = true;
                        if (this.onCreated) this.onCreated(data);
                        break;
                        
                    case 'joined':
                        this.gameId = data.gameId;
                        this.myColor = data.side === 'white' ? 1 : 2;
                        this.isHost = false;
                        if (this.onJoined) this.onJoined(data);
                        break;
                        
                    case 'guest_joined':
                        if (this.onGuestJoined) this.onGuestJoined();
                        break;
                        
                    case 'host_ready':
                        if (this.onHostReady) this.onHostReady();
                        break;
                        
                    case 'guest_ready':
                        if (this.onGuestReady) this.onGuestReady();
                        break;
                        
                    case 'both_ready':
                        if (this.onBothReady) this.onBothReady();
                        break;
                        
                    case 'game_start':
                        this.myColor = data.myColor;
                        this.oppColor = data.oppColor;
                        if (this.onGameStart) this.onGameStart(data);
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
            };
        });
    }

    createGame(side) {
        this.ws.send(JSON.stringify({ type: 'create', side }));
    }

    joinGame(gameId) {
        this.ws.send(JSON.stringify({ type: 'join', gameId }));
    }

    sendReady() {
        this.ws.send(JSON.stringify({ type: 'ready', gameId: this.gameId }));
    }

    startGame() {
        this.ws.send(JSON.stringify({ type: 'start', gameId: this.gameId }));
    }

    sendMove(move, board, currentPlayer) {
        this.ws.send(JSON.stringify({
            type: 'move',
            gameId: this.gameId,
            move,
            board,
            currentPlayer
        }));
    }

    leave() {
        if (this.ws) this.ws.close();
    }
}

export const simpleWs = new SimpleWs();