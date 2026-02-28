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
                console.log('✅ WebSocket connected');
                resolve();
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            };
            
            this.ws.onclose = () => {
                console.log('🔴 WebSocket closed');
                this.connected = false;
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
                            if (this.onGuestJoined) {
                                this.onGuestJoined({
                                    guestName: data.guestName,
                                    guestSide: data.guestSide
                                });
                            }
                        } else {
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
                        console.log('📩 Получен ход соперника:', data);
                        if (this.onOpponentMove) {
                            this.onOpponentMove({
                                move: data.move,
                                board: data.board,
                                currentPlayer: data.currentPlayer
                            });
                        }
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

    // НОВЫЙ МЕТОД: проверка и восстановление соединения
    async ensureConnection() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('✅ Соединение уже открыто');
            return true;
        }
        
        console.log('🔄 Переподключение к серверу...');
        try {
            await this.connect();
            console.log('✅ Переподключено успешно');
            return true;
        } catch (err) {
            console.error('❌ Ошибка переподключения:', err);
            return false;
        }
    }

    hostCreate(side) {
        const playerName = this.getTelegramName();
        this.myName = playerName;
        console.log('📤 Отправка host_create:', { side, playerName });
        this.ws.send(JSON.stringify({ 
            type: 'host_create', 
            side,
            playerName 
        }));
    }

    guestJoin(gameId) {
        const playerName = this.getTelegramName();
        this.myName = playerName;
        console.log('📤 Отправка guest_join:', { gameId, playerName });
        this.ws.send(JSON.stringify({ 
            type: 'guest_join', 
            gameId: gameId.toUpperCase(),
            playerName 
        }));
    }

    guestReady() {
        console.log('📤 Отправка guest_ready:', { gameId: this.gameId });
        this.ws.send(JSON.stringify({ 
            type: 'guest_ready', 
            gameId: this.gameId 
        }));
    }

    hostStart() {
        console.log('🎮 Хост начинает игру:', this.gameId);
        this.ws.send(JSON.stringify({ 
            type: 'host_start', 
            gameId: this.gameId 
        }));
    }

    // ИСПРАВЛЕННЫЙ МЕТОД: sendMove с проверкой соединения
    sendMove(move, board, currentPlayer) {
        console.log('📤 Отправка хода:', { move, currentPlayer });
        
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('🔄 Сокет закрыт, пытаемся переподключиться перед отправкой');
            this.ensureConnection().then(connected => {
                if (connected) {
                    console.log('✅ Переподключено, отправляем ход');
                    // Пробуем отправить снова
                    this.ws.send(JSON.stringify({
                        type: 'move',
                        gameId: this.gameId,
                        move,
                        board,
                        currentPlayer
                    }));
                } else {
                    console.error('❌ Не удалось переподключиться, ход не отправлен');
                }
            });
            return;
        }
        
        this.ws.send(JSON.stringify({
            type: 'move',
            gameId: this.gameId,
            move,
            board,
            currentPlayer
        }));
    }

    getTelegramName() {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            return user.first_name || user.username || 'Игрок';
        }
        const savedName = localStorage.getItem('playerName');
        return savedName || 'Игрок';
    }

    disconnect() {
        if (this.ws) this.ws.close();
    }
}

export const simpleGame = new SimpleGame();