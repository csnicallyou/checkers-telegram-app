console.log('📱 Telegram.js загружен');
class TelegramService {
  constructor() {
    this.webApp = null;
    this.initData = null;
    this.user = null;
    this.isReady = false;
  }

  init() {
    try {
      if (window.Telegram?.WebApp) {
        this.webApp = window.Telegram.WebApp;
        this.webApp.ready();
        this.webApp.expand(); // Разворачиваем на весь экран
        
        // Получаем информацию о теме
        const theme = this.webApp.colorScheme;
        document.documentElement.setAttribute('data-theme', theme);
        
        // Настраиваем главный цвет
        this.webApp.setHeaderColor('#5D4037');
        this.webApp.setBackgroundColor('#f0f0f0');
        
        this.isReady = true;
        console.log('Telegram Web App инициализирован');
      } else {
        console.log('Режим разработки');
        this.isReady = true;
      }
      return true;
    } catch (error) {
      console.error('Ошибка инициализации Telegram', error);
      return false;
    }
  }

  vibrate(style = 'light') {
    if (this.webApp?.HapticFeedback) {
      this.webApp.HapticFeedback.impactOccurred(style);
    }
  }
}

export const telegram = new TelegramService();