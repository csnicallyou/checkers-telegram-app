<template>
  <div class="mode-selection">
    <h1 class="title">Русские шашки</h1>
    
    <div class="mode-cards">
      <div class="mode-card" @click="selectMode('local')">
        <div class="card-icon">👥</div>
        <h2>На одном устройстве</h2>
        <p>Играйте вдвоем на одном телефоне или компьютере</p>
        <ul class="features">
          <li>✓ Игра с другом рядом</li>
          <li>✓ Подсказки от ИИ</li>
          <li>✓ Отмена ходов</li>
        </ul>
        <button class="select-btn local-btn">Играть локально</button>
      </div>
      
      <div class="mode-card" @click="selectMode('multiplayer')">
        <div class="card-icon">🌐</div>
        <h2>Мультиплеер</h2>
        <p>Играйте с другом через Telegram</p>
        <ul class="features">
          <li>✓ Игра с другом онлайн</li>
          <li>✓ Создание комнаты</li>
          <li>✓ Приглашение по ссылке</li>
        </ul>
        <button class="select-btn multiplayer-btn">Играть онлайн</button>
      </div>
    </div>
    
    <div class="how-to-play">
      <h3>Как играть?</h3>
      <p>• Белые ходят первыми</p>
      <p>• Шашки ходят только по черным клеткам</p>
      <p>• Если есть возможность взять шашку - нужно обязательно бить</p>
      <p>• Дамка может ходить на любое расстояние</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModeSelection',
  emits: ['select-mode'],
  setup(props, { emit }) {
    const selectMode = (mode) => {
      emit('select-mode', mode);
    };
    
    return {
      selectMode
    };
  }
};
</script>

<style scoped>
.mode-selection {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title {
  color: white;
  font-size: 3em;
  margin-bottom: 40px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  text-align: center;
}

.mode-cards {
  display: flex;
  gap: 30px;
  max-width: 1000px;
  width: 100%;
  justify-content: center;
  flex-wrap: wrap;
}

.mode-card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  width: 350px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  border: 3px solid transparent;
}

.mode-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.mode-card:first-child:hover {
  border-color: #4CAF50;
}

.mode-card:last-child:hover {
  border-color: #2196F3;
}

.card-icon {
  font-size: 64px;
  text-align: center;
  margin-bottom: 20px;
}

.mode-card h2 {
  text-align: center;
  margin-bottom: 15px;
  color: #333;
}

.mode-card p {
  color: #666;
  text-align: center;
  margin-bottom: 20px;
  line-height: 1.5;
}

.features {
  list-style: none;
  padding: 0;
  margin-bottom: 25px;
  flex-grow: 1;
}

.features li {
  padding: 8px 0;
  color: #555;
  border-bottom: 1px solid #f0f0f0;
}

.features li:last-child {
  border-bottom: none;
}

.select-btn {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 10px;
  font-size: 18px;
  font-weight: bold;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.local-btn {
  background: #4CAF50;
}

.local-btn:hover {
  background: #45a049;
}

.multiplayer-btn {
  background: #2196F3;
}

.multiplayer-btn:hover {
  background: #1976D2;
}

.how-to-play {
  margin-top: 50px;
  background: rgba(255, 255, 255, 0.9);
  padding: 30px;
  border-radius: 15px;
  max-width: 600px;
  width: 100%;
}

.how-to-play h3 {
  color: #333;
  margin-bottom: 15px;
  font-size: 1.5em;
}

.how-to-play p {
  color: #555;
  margin: 10px 0;
  padding-left: 20px;
  position: relative;
}

.how-to-play p::before {
  content: "•";
  color: #5D4037;
  font-weight: bold;
  position: absolute;
  left: 5px;
}

@media (max-width: 768px) {
  .title {
    font-size: 2em;
  }
  
  .mode-card {
    width: 100%;
    max-width: 350px;
  }
  
  .mode-cards {
    gap: 20px;
  }
}
</style>