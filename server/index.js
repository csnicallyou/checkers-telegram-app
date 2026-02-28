// server/index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('colyseus');
const { WebSocketTransport } = require('@colyseus/ws-transport');
const { GameRoom } = require('./rooms/GameRoom');
const { monitor } = require('@colyseus/monitor');

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const server = http.createServer(app);

const gameServer = new Server({
    transport: new WebSocketTransport({
        server: server,
        pingInterval: 5000,
        pingMaxRetries: 3
    })
});

// Регистрируем комнату
gameServer.define('game', GameRoom);

// Исправленный корневой маршрут
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Checkers Colyseus Server</title>
            <style>
                body { font-family: Arial; padding: 40px; background: #f0f0f0; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #333; }
                .status { color: green; font-weight: bold; }
                .info { margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎮 Checkers Colyseus Server</h1>
                <p class="status">✅ SERVER IS RUNNING</p>
                <div class="info">
                    <p>📡 Port: ${process.env.PORT || 3001}</p>
                    <p>🕒 Started: ${new Date().toLocaleString()}</p>
                    <p><a href="/colyseus">📊 Monitor</a></p>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Исправленный health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        time: new Date().toISOString(),
        server: 'colyseus'
    });
});

// Мониторинг
app.use('/colyseus', monitor());

// Обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('🔥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('🔥 Unhandled Rejection:', error);
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n=== 🚀 COLYSEUS SERVER ===');
    console.log(`📡 Порт: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Monitor: http://localhost:${PORT}/colyseus`);
    console.log('==========================\n');
});