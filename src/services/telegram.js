// src/telegram.js
class TelegramService {
    constructor() {
        this.webApp = null;
        this.user = null;
        this.isReady = false;
    }

    init() {
        try {
            if (window.Telegram?.WebApp) {
                this.webApp = window.Telegram.WebApp;
                this.webApp.ready();
                this.webApp.expand();
                
                // Получаем информацию о пользователе
                this.user = this.webApp.initDataUnsafe?.user;
                
                console.log('✅ Telegram Web App инициализирован', this.user);
                this.isReady = true;
            } else {
                console.log('⚠️ Telegram Web App не доступен (режим разработки)');
                this.isReady = false;
            }
            return true;
        } catch (error) {
            console.error('❌ Ошибка инициализации Telegram:', error);
            return false;
        }
    }

    getUser() {
        return this.user;
    }

    getChatId() {
        return this.user?.id || null;
    }

    vibrate(style = 'light') {
        if (this.webApp?.HapticFeedback) {
            this.webApp.HapticFeedback.impactOccurred(style);
        } else {
            console.log('📳 Вибрация (тест):', style);
        }
    }

    showAlert(message) {
        if (this.webApp) {
            this.webApp.showAlert(message);
        } else {
            alert(message);
        }
    }

    showNotification(message) {
        if (this.webApp) {
            this.webApp.showPopup({
                title: 'Уведомление',
                message: message,
                buttons: [{ type: 'ok' }]
            });
        } else {
            console.log('🔔', message);
        }
    }
}

export const telegram = new TelegramService();