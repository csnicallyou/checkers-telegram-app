import { createApp } from 'vue';
import App from './App.vue';
import './assets/mobile.css';

// Создаем приложение
const app = createApp(App);

// Монтируем приложение
app.mount('#app');

// Для отладки
console.log('Приложение запущено');