// server/rooms/GameRoom.js
const { Room } = require('colyseus');
const { GameState } = require('./GameState');

class GameRoom extends Room {
    constructor() {
        super();
        this.maxClients = 2;
    }

    onCreate(options) {
        console.log('📦 Комната создана:', this.roomId);
        
        // Инициализация состояния
        this.setState(new GameState());
        
        // Обработка сообщений от клиентов
        this.onMessage('move', (client, data) => {
            const player = this.state.players.get(client.sessionId);
            
            // Проверяем, что ходит правильный игрок
            if (player.color !== this.state.currentPlayer) return;
            
            // Выполняем ход
            const success = this.state.makeMove(
                data.startRow, data.startCol,
                data.endRow, data.endCol
            );
            
            if (success) {
                // Отправляем обновление всем
                this.broadcast('move_made', {
                    startRow: data.startRow,
                    startCol: data.startCol,
                    endRow: data.endRow,
                    endCol: data.endCol,
                    board: this.state.board,
                    currentPlayer: this.state.currentPlayer
                });
            }
        });

        this.onMessage('chat', (client, data) => {
            const player = this.state.players.get(client.sessionId);
            this.broadcast('chat_message', {
                player: player.name,
                text: data.text,
                color: player.color
            });
        });
    }

    onJoin(client, options) {
        console.log('👤 Игрок подключился:', client.sessionId, options.name);
        
        // Добавляем игрока в состояние
        const player = this.state.addPlayer(client.sessionId, options.name);
        
        // Отправляем информацию о присоединении
        this.broadcast('player_joined', {
            player: {
                id: client.sessionId,
                name: player.name,
                color: player.color
            },
            players: Array.from(this.state.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                color: p.color
            }))
        });

        // Если комната заполнена, уведомляем о готовности
        if (this.state.players.size === 2) {
            this.broadcast('game_ready', {
                message: 'Оба игрока подключены!'
            });
        }
    }

    onLeave(client, consented) {
        console.log('👋 Игрок отключился:', client.sessionId);
        
        const player = this.state.players.get(client.sessionId);
        if (player) {
            player.connected = false;
            this.broadcast('player_left', {
                playerId: client.sessionId,
                playerName: player.name
            });
        }
        
        // Если комната пуста, закрываем её через 10 секунд
        if (this.state.players.size === 0) {
            this.disconnect();
        }
    }

    onDispose() {
        console.log('🗑️ Комната закрыта:', this.roomId);
    }
}

module.exports = { GameRoom };