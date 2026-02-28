class Multiplayer {
    constructor() {
        this.ws = null;
        this.gameId = null;
        this.isHost = false;
        this.connected = false;
        
        this.serverUrl = import.meta.env.VITE_SERVER_URL || 'wss://checkers-server-0y7z.onrender.com';
        
        this.onCreated = null;
        this.onJoined = null;
        this.onGuestJoined = null;
        this.onMove = null;
        this.onError = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
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
                        this.isHost = true;
                        if (this.onCreated) this.onCreated(data);
                        break;
                        
                    case 'joined':
                        this.gameId = data.gameId;
                        this.isHost = false;
                        if (this.onJoined) this.onJoined(data);
                        break;
                        
                    case 'guest_joined':
                        if (this.onGuestJoined) this.onGuestJoined(data);
                        break;
                        
                    case 'move':
                        if (this.onMove) this.onMove(data);
                        break;
                        
                    case 'error':
                        if (this.onError) this.onError(data.message);
                        break;
                }
            };
        });
    }

    createGame(playerName) {
        this.ws.send(JSON.stringify({ type: 'create', playerName }));
    }

    joinGame(gameId, playerName) {
        this.ws.send(JSON.stringify({ type: 'join', gameId, playerName }));
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

    disconnect() {
        if (this.ws) this.ws.close();
    }
}

export const multiplayer = new Multiplayer();