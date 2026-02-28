// backend/bot.js
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Токен бота из .env файла
const token = process.env.BOT_TOKEN;
// URL вашего приложения на Netlify
const appUrl = process.env.APP_URL || 'https://your-app.netlify.app';

// Создаем бота
const bot = new TelegramBot(token, { polling: true });

// Хранилище активных игр (в реальном проекте используйте БД)
const activeGames = new Map();

// Команда /start
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'Игрок';
    const gameId = match[1]; // Код игры из ссылки
    
    console.log(`Пользователь ${userName} (${userId}) запустил бота`);
    
    // Кнопка для открытия Mini App
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: '🎮 Играть в шашки',
                    web_app: {
                        url: appUrl
                    }
                }]
            ]
        }
    };

    let welcomeMessage = `Привет, ${userName}! 👋\n\nДобро пожаловать в Русские шашки!`;
    
    if (gameId) {
        welcomeMessage = `Привет, ${userName}! 👋\n\nВы присоединяетесь к игре с кодом: *${gameId}*`;
        
        // Сохраняем информацию о подключении
        if (!activeGames.has(gameId)) {
            activeGames.set(gameId, { host: null, guest: null });
        }
        
        const game = activeGames.get(gameId);
        if (!game.host) {
            game.host = { id: userId, name: userName };
            welcomeMessage += `\n\nВы создали новую игру как хост (белые)`;
        } else if (!game.guest && game.host.id !== userId) {
            game.guest = { id: userId, name: userName };
            welcomeMessage += `\n\nВы присоединились к игре как гость (черные)`;
            
            // Уведомляем хоста
            bot.sendMessage(game.host.id, 
                `✅ Игрок ${userName} присоединился к вашей игре!\n\nНажмите кнопку "Играть в шашки" чтобы начать.`,
                options
            );
        }
    }
    
    bot.sendMessage(chatId, welcomeMessage, options);
});

// Обработка данных из Mini App
bot.on('message', (msg) => {
    if (msg.web_app_data) {
        handleWebAppData(msg);
    }
});

// Обработка данных от веб-приложения
async function handleWebAppData(msg) {
    const chatId = msg.chat.id;
    const data = JSON.parse(msg.web_app_data.data);
    
    console.log('Получены данные из Mini App:', data);
    
    switch (data.action) {
        case 'create_game':
            const gameId = generateGameId();
            activeGames.set(gameId, {
                host: { id: chatId, name: msg.from.first_name },
                guest: null,
                createdAt: Date.now()
            });
            
            bot.sendMessage(chatId, 
                `✅ Игра создана!\n\n` +
                `Код игры: *${gameId}*\n\n` +
                `Отправьте этот код другу, чтобы он мог присоединиться.\n` +
                `Или поделитесь ссылкой:\n` +
                `https://t.me/${process.env.BOT_USERNAME}/game?start=${gameId}`
            , { parse_mode: 'Markdown' });
            break;
            
        case 'player_joined':
            // Уведомляем хоста
            bot.sendMessage(data.hostId, 
                `✅ Игрок ${data.playerName} присоединился к игре!\n\nНажмите кнопку "Играть в шашки" чтобы начать.`
            );
            break;
            
        case 'game_over':
            const winner = data.winner === 1 ? 'Белые' : 'Черные';
            bot.sendMessage(chatId, 
                `🏆 Игра окончена!\n\nПобедили: *${winner}*`,
                { parse_mode: 'Markdown' }
            );
            break;
            
        case 'chat_message':
            // Пересылаем сообщение в чат
            bot.sendMessage(data.targetId, 
                `💬 Сообщение от ${data.playerName}: ${data.text}`
            );
            break;
    }
}

// Получить информацию об игре
app.get('/api/game/:gameId', (req, res) => {
    const gameId = req.params.gameId;
    const game = activeGames.get(gameId);
    
    if (game) {
        res.json({ success: true, game });
    } else {
        res.json({ success: false, error: 'Game not found' });
    }
});

// Проверить статус игры
app.get('/api/game/:gameId/status', (req, res) => {
    const gameId = req.params.gameId;
    const game = activeGames.get(gameId);
    
    if (game) {
        res.json({
            success: true,
            status: game.guest ? 'ready' : 'waiting',
            host: game.host,
            guest: game.guest
        });
    } else {
        res.json({ success: false, error: 'Game not found' });
    }
});

// Генерация ID игры
function generateGameId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Очистка старых игр (каждый час)
setInterval(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [gameId, game] of activeGames.entries()) {
        if (game.createdAt < oneHourAgo) {
            activeGames.delete(gameId);
            console.log(`Игра ${gameId} удалена (устарела)`);
        }
    }
}, 60 * 60 * 1000);

// Запуск API сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API сервер запущен на порту ${PORT}`);
});

console.log('Бот запущен и ожидает сообщения...');