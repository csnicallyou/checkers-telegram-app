// Глобальный WebSocket менеджер
class WebSocketManager {
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
        
        this.callbacks = {
            onHostCreated: null,
            onGuestJoined: null,
            onGuestReady: null,
            onGameStart: null,
            onOpponentMove: null,
            onHostLeft: null,
            onGuestLeft: null,
            onError: null
        };
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                console.log('✅ WebSocket уже подключен');
                resolve();
                return;
            }

            console.log('🔄 Подключение к серверу...');
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
            
            this.ws.onclose = () => {
                console.log('🔴 WebSocket closed');
                this.connected = false;
                
                // Пытаемся переподключиться через 1 секунду
                setTimeout(() => {
                    if (!this.connected) {
                        console.log('🔄 Автоматическое переподключение...');
                        this.connect().catch(() => {});
                    }
                }, 1000);
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
                        if (this.callbacks.onHostCreated) this.callbacks.onHostCreated(data);
                        break;
                        
                    case 'guest_joined':
                        if (this.isHost) {
                            if (this.callbacks.onGuestJoined) {
                                this.callbacks.onGuestJoined({
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
                            if (this.callbacks.onGuestJoined) {
                                this.callbacks.onGuestJoined({
                                    gameId: data.gameId,
                                    mySide: data.mySide,
                                    hostName: data.hostName,
                                    hostSide: data.hostSide
                                });
                            }
                        }
                        break;
                        
                    case 'guest_ready':
                        if (this.callbacks.onGuestReady) this.callbacks.onGuestReady();
                        break;
                        
                    case 'game_start':
                        this.myColor = data.myColor;
                        this.opponentName = data.opponentName;
                        this.opponentColor = data.opponentColor;
                        if (this.callbacks.onGameStart) this.callbacks.onGameStart(data);
                        break;
                        
                    case 'opponent_move':
                        if (this.callbacks.onOpponentMove) {
                            this.callbacks.onOpponentMove({
                                move: data.move,
                                board: data.board,
                                currentPlayer: data.currentPlayer
                            });
                        }
                        break;
                        
                    case 'host_left':
                        if (this.callbacks.onHostLeft) this.callbacks.onHostLeft();
                        break;
                        
                    case 'guest_left':
                        if (this.callbacks.onGuestLeft) this.callbacks.onGuestLeft();
                        break;
                        
                    case 'error':
                        if (this.callbacks.onError) this.callbacks.onError(data.message);
                        break;
                }
            };
        });
    }

    // Методы для отправки
    hostCreate(side) {
        const playerName = this.getTelegramName();
        this.myName = playerName;
        console.log('📤 Отправка host_create:', { side, playerName });
        this.send('host_create', { side, playerName });
        // gameId генерируется на сервере, нам не нужно его здесь создавать
    }

    guestJoin(gameId) {
        const playerName = this.getTelegramName();
        this.myName = playerName;
        // Проверяем длину кода
        if (gameId.length !== 4) {
            console.error('❌ Код игры должен быть 4 символа');
            return;
        }
        console.log('📤 Отправка guest_join:', { gameId, playerName });
        this.send('guest_join', { 
            gameId: gameId.toUpperCase(), 
            playerName 
        });
     }

    guestReady() {
        this.send('guest_ready', { gameId: this.gameId });
    }

    hostStart() {
        this.send('host_start', { gameId: this.gameId });
    }

    sendMove(move, board, currentPlayer) {
        this.send('move', {
            gameId: this.gameId,
            move,
            board,
            currentPlayer
        });
    }

    send(type, data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket не подключен');
            return;
        }
        this.ws.send(JSON.stringify({ type, ...data }));
    }

    getTelegramName() {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            return user.first_name || user.username || 'Игрок';
        }
        return localStorage.getItem('playerName') || 'Игрок';
    }

    disconnect() {
        if (this.ws) this.ws.close();
    }
}

// Создаем ОДИН глобальный экземпляр
export const wsManager = new WebSocketManager();