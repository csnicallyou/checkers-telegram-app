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
        this.setState(new GameState());
        
        this.onMessage('move', (client, data) => {
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
                endCol: data.endCol,
                board: this.state.board,
                currentPlayer: this.state.currentPlayer
            });
        });

        this.onMessage('start_game', () => {
            this.broadcast('game_started');
        });
    }

    onJoin(client, options) {
        console.log('👤 Игрок подключился:', client.sessionId, options.name);
        const player = this.state.addPlayer(client.sessionId, options.name);
        
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

        if (this.state.players.size === 2) {
            this.broadcast('game_ready');
        }
    }

    onLeave(client) {
        console.log('👋 Игрок отключился:', client.sessionId);
        const player = this.state.players.get(client.sessionId);
        
        if (player) {
            this.broadcast('player_left', {
                playerId: client.sessionId,
                playerName: player.name
            });
            this.state.removePlayer(client.sessionId);
        }
        
        if (this.state.players.size === 0) {
            this.disconnect();
        }
    }
}

module.exports = { GameRoom };