// server/rooms/GameRoom.js
const { Room } = require('colyseus');
const { GameState } = require('./GameState');

class GameRoom extends Room {
    onCreate(options) {
        console.log('📦 Комната создана:', this.roomId);
        this.setState(new GameState());
        this.maxClients = 2;
        
        this.onMessage('move', (client, data) => {
            try {
                const player = this.state.players.get(client.sessionId);
                if (!player || player.color !== this.state.currentPlayer) return;
                
                this.state.makeMove(
                    data.startRow, data.startCol,
                    data.endRow, data.endCol
                );
                
                this.broadcast('move_made', {
                    startRow: data.startRow,
                    startCol: data.startCol,
                    endRow: data.endRow,
                    endCol: data.endCol
                });
            } catch (error) {
                console.error('Move error:', error);
            }
        });

        this.onMessage('start_game', () => {
            this.broadcast('game_started');
        });
    }

    onJoin(client, options) {
        console.log('👤 Игрок подключился:', client.sessionId, options?.name || 'Anonymous');
        const player = this.state.addPlayer(client.sessionId, options?.name || 'Player');
        
        this.broadcast('player_joined', {
            player: {
                id: client.sessionId,
                name: player.name,
                color: player.color
            }
        });

        if (this.state.players.size === 2) {
            this.broadcast('game_ready');
        }
    }

    onLeave(client) {
        console.log('👋 Игрок отключился:', client.sessionId);
        
        this.broadcast('player_left', {
            playerId: client.sessionId
        });
        
        this.state.removePlayer(client.sessionId);
        
        if (this.state.players.size === 0) {
            this.disconnect();
        }
    }
}

module.exports = { GameRoom };