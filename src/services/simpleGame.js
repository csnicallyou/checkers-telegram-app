class SimpleGame {
    constructor() {
        this.ws = null;
        this.gameId = null;
        this.myName = null;
        this.mySide = null;
        this.myColor = null;
        this.opponentName = null;
        this.opponentColor = null;
        this.isHost = false;
        this.connected = false;
        
        this.serverUrl = import.meta.env.VITE_SERVER_URL || 'wss://checkers-server-0y7z.onrender.com';
        
        this.onHostCreated = null;
        this.onGuestJoined = null;
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
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
            
            this.ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                console.log('📩 Получено:', data);
                
                switch(data.type) {
                    case 'host_created':
                        this.gameId = data.gameId;
                        this.mySide = data.side;
                        this.myColor = data.side === 'white' ? 1 : 2;
                        this.isHost = true;
                        if (this.onHostCreated) this.onHostCreated(data);
                        break;
                        
                    case 'guest_joined':
                        if (this.isHost) {
                            // Мы хост - к нам присоединился гость
                            if (this.onGuestJoined) {
                                this.onGuestJoined({
                                    guestName: data.guestName,
                                    guestSide: data.guestSide
                                });
                            }
                        } else {
                            // Мы гость - мы присоединились к игре
                            this.gameId = data.gameId;
                            this.myName = data.myName;
                            this.mySide = data.mySide;
                            this.myColor = data.mySide === 'white' ? 1 : 2;
                            this.opponentName = data.hostName;
                            this.opponentColor = data.hostSide === 'white' ? 1 : 2;
                            this.isHost = false;
                            if (this.onGuestJoined) {
                                this.onGuestJoined({
                                    gameId: data.gameId,
                                    mySide: data.mySide,
                                    hostName: data.hostName,
                                    hostSide: data.hostSide
                                });
                            }
                        }
                        break;
                        
                    case 'guest_ready':
                        if (this.onGuestReady) this.onGuestReady();
                        break;
                        
                    case 'game_start':
                        this.myColor = data.myColor;
                        this.opponentName = data.opponentName;
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

    hostCreate(side) {
        const playerName = this.getTelegramName();
        this.myName = playerName;
        this.ws.send(JSON.stringify({ 
            type: 'host_create', 
            side,
            playerName 
        }));
    }

    guestJoin(gameId) {
        const playerName = this.getTelegramName();
        this.myName = playerName;
        this.ws.send(JSON.stringify({ 
            type: 'guest_join', 
            gameId: gameId.toUpperCase(),
            playerName 
        }));
    }

    guestReady() {
        this.ws.send(JSON.stringify({ 
            type: 'guest_ready', 
            gameId: this.gameId 
        }));
    }

    hostStart() {
        this.ws.send(JSON.stringify({ 
            type: 'host_start', 
            gameId: this.gameId 
        }));
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

    getTelegramName() {
        // Пытаемся получить имя из Telegram
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            return user.first_name || user.username || 'Игрок';
        }
        // Если нет Telegram, используем localStorage или имя по умолчанию
        const savedName = localStorage.getItem('playerName');
        return savedName || 'Игрок';
    }

    disconnect() {
        if (this.ws) this.ws.close();
    }
}

export const simpleGame = new SimpleGame();