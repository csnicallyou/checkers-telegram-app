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
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.pendingMessages = []; // Очередь сообщений, которые не удалось отправить
        
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
            try {
                console.log('🔄 Подключение к серверу...');
                this.ws = new WebSocket(this.serverUrl);
                
                this.ws.onopen = () => {
                    console.log('✅ WebSocket connected');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    
                    // Если у нас был gameId, отправляем запрос на восстановление сессии
                    if (this.gameId) {
                        console.log('🔄 Восстановление сессии игры:', this.gameId);
                        this.send('reconnect', {
                            gameId: this.gameId,
                            playerName: this.myName
                        });
                    }
                    
                    // Отправляем все накопившиеся сообщения
                    while (this.pendingMessages.length > 0) {
                        const msg = this.pendingMessages.shift();
                        this.ws.send(JSON.stringify(msg));
                    }
                    
                    resolve();
                };
                
                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    this.connected = false;
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    console.log('🔴 WebSocket closed');
                    this.connected = false;
                    this.attemptReconnect();
                };
                
                this.ws.onmessage = (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        console.log('📩 Получено:', data);
                        
                        switch(data.type) {
                            case 'reconnect_success':
                                console.log('✅ Сессия восстановлена');
                                break;
                                
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
                    } catch (error) {
                        console.error('❌ Ошибка парсинга сообщения:', error);
                    }
                };
                
            } catch (error) {
                console.error('❌ Ошибка создания WebSocket:', error);
                reject(error);
            }
        });
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('❌ Превышено максимальное количество попыток переподключения');
            if (this.onError) this.onError('Потеряно соединение с сервером');
            return;
        }
        
        this.reconnectAttempts++;
        console.log(`🔄 Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
        
        setTimeout(() => {
            if (!this.connected) {
                this.connect().catch(() => {});
            }
        }, 3000 * this.reconnectAttempts);
    }

    checkConnection() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('⚠️ WebSocket не в открытом состоянии, сообщение будет отправлено после переподключения');
            return false;
        }
        return true;
    }

    send(type, data) {
        const message = JSON.stringify({ type, ...data });
        
        if (!this.checkConnection()) {
            // Сохраняем сообщение для отправки после переподключения
            console.log('📥 Сообщение добавлено в очередь:', { type, ...data });
            this.pendingMessages.push({ type, ...data });
            return;
        }
        
        this.ws.send(message);
    }

    hostCreate(side) {
        const playerName = this.getTelegramName();
        this.myName = playerName;
        console.log('📤 Отправка host_create:', { side, playerName });
        this.send('host_create', { side, playerName });
    }

    guestJoin(gameId) {
        const playerName = this.getTelegramName();
        this.myName = playerName;
        console.log('📤 Отправка guest_join:', { gameId, playerName });
        this.send('guest_join', { gameId: gameId.toUpperCase(), playerName });
    }

    guestReady() {
        console.log('📤 Отправка guest_ready:', { gameId: this.gameId });
        this.send('guest_ready', { gameId: this.gameId });
    }

    hostStart() {
        console.log('🎮 Хост начинает игру:', this.gameId);
        this.send('host_start', { gameId: this.gameId });
    }

    sendMove(move, board, currentPlayer) {
        console.log('📤 Отправка хода:', { move, currentPlayer });
        this.send('move', {
            gameId: this.gameId,
            move,
            board,
            currentPlayer
        });
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
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.gameId = null;
        this.myName = null;
        this.mySide = null;
        this.myColor = null;
        this.opponentName = null;
        this.opponentColor = null;
        this.isHost = false;
        this.reconnectAttempts = 0;
        this.pendingMessages = [];
    }
}

export const simpleGame = new SimpleGame();