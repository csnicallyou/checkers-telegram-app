import { init as initTelegramApp } from '@telegram-apps/sdk';

class TelegramService {
  constructor() {
    this.webApp = null;
    this.initData = null;
    this.user = null;
  }

  init() {
    try {
      this.webApp = initTelegramApp();
      this.initData = this.webApp.initData;
      this.user = this.initData?.user;
      
      // Настраиваем внешний вид
      this.webApp.setHeaderColor('#5D4037');
      this.webApp.setBackgroundColor('#f0f0f0');
      
      console.log('Telegram Web App инициализирован', this.user);
      return true;
    } catch (error) {
      console.error('Ошибка инициализации Telegram', error);
      return false;
    }
  }

  showPopup(params) {
    if (this.webApp) {
      this.webApp.showPopup(params);
    }
  }

  showAlert(message) {
    if (this.webApp) {
      this.webApp.showAlert(message);
    }
  }

  showConfirm(message) {
    if (this.webApp) {
      return this.webApp.showConfirm(message);
    }
    return Promise.resolve(confirm(message));
  }

  get isTelegram() {
    return !!this.webApp;
  }
}

export const telegram = new TelegramService();