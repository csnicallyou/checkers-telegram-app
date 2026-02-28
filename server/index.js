// server/index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('colyseus');
const { WebSocketTransport } = require('@colyseus/ws-transport');
const { GameRoom } = require('./rooms/GameRoom');
const { monitor } = require('@colyseus/monitor');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Настройка Colyseus
const gameServer = new Server({
    transport: new WebSocketTransport({
        server: server
    })
});

// Регистрируем комнату
gameServer.define('game', GameRoom);

// Простой эндпоинт для проверки
app.get('/', (req, res) => {
    res.send(`
        <h1>✅ Checkers Colyseus Server</h1>
        <p>Server is running!</p>
        <p>Active rooms: ${gameServer.getRooms().length}</p>
        <p><a href="/colyseus">Monitor</a></p>
    `);
});

// Мониторинг (опционально)
app.use('/colyseus', monitor());

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`\n=== 🚀 COLYSEUS SERVER ===`);
    console.log(`📡 Порт: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Monitor: http://localhost:${PORT}/colyseus`);
    console.log('==========================\n');
});

// Обработка ошибок
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
});