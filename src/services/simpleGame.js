class SimpleGame {
    constructor() {
        this.ws = null;
        this.gameId = null;
        this.mySide = null; // 'white' или 'black'
        this.myColor = null; // 1 или 2
        this.opponentColor = null;
        this.isHost = false;
        this.connected = false;
        
        this.serverUrl = import.meta.env.VITE_SERVER_URL || 'wss://checkers-server-0y7z.onrender.com';
        
        this.onHostCreated = null;
        this.onGuestConnected = null;
        this.onGuestReady = null;
        this.onGameStart = null;
        this.onOpponentMove = null;
        this.onHostLeft = null;
        this.onGuestLeft = null;
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
                    case 'host_created':
                        this.gameId = data.gameId;
                        this.mySide = data.side;
                        this.myColor = data.side === 'white' ? 1 : 2;
                        this.isHost = true;
                        if (this.onHostCreated) this.onHostCreated(data);
                        break;
                        
                    case 'guest_connected':
                        if (this.onGuestConnected) {
                            this.onGuestConnected({
                                gameId: data.gameId,
                                mySide: data.mySide,
                                hostSide: data.hostSide
                            });
                        }
                        break;
                        
                    case 'guest_ready':
                        if (this.onGuestReady) this.onGuestReady();
                        break;
                        
                    case 'game_start':
                        this.myColor = data.myColor;
                        this.opponentColor = data.opponentColor;
                        if (this.onGameStart) this.onGameStart(data);
                        break;
                        
                    case 'opponent_move':
                        if (this.onOpponentMove) this.onOpponentMove(data);
                        break;
                        
                    case 'host_left':
                        if (this.onHostLeft) this.onHostLeft();
                        break;
                        
                    case 'guest_left':
                        if (this.onGuestLeft) this.onGuestLeft();
                        break;
                        
                    case 'error':
                        if (this.onError) this.onError(data.message);
                        break;
                }
            };
        });
    }

    // Хост создает игру
    hostCreate(side) {
        this.ws.send(JSON.stringify({ type: 'host_create', side }));
    }

    // Гость присоединяется
    guestJoin(gameId) {
        this.ws.send(JSON.stringify({ type: 'guest_join', gameId: gameId.toUpperCase() }));
    }

    // Гость говорит "готов"
    guestReady() {
        this.ws.send(JSON.stringify({ type: 'guest_ready', gameId: this.gameId }));
    }

    // Хост начинает игру
    hostStart() {
        this.ws.send(JSON.stringify({ type: 'host_start', gameId: this.gameId }));
    }

    // Отправить ход
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

export const simpleGame = new SimpleGame();