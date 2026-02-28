import axios from 'axios';

const API_BASE_URL = '/.netlify/functions';

class GameAPI {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000
    });
  }

  async getBestMove(board, currentPlayer, difficulty = 'champion') {
    try {
      const response = await this.client.post('/ai', {
        board,
        currentPlayer,
        difficulty,
        action: 'getBestMove'
      });
      
      return response.data.move;
    } catch (error) {
      console.error('Ошибка получения лучшего хода:', error);
      throw error;
    }
  }

  async evaluatePosition(board, currentPlayer) {
    try {
      const response = await this.client.post('/ai', {
        board,
        currentPlayer,
        action: 'evaluate'
      });
      
      return response.data.evaluation;
    } catch (error) {
      console.error('Ошибка оценки позиции:', error);
      return 0;
    }
  }

  async getAllMoves(board, currentPlayer) {
    try {
      const response = await this.client.post('/game', {
        board,
        currentPlayer,
        action: 'getAllMoves'
      });
      
      return response.data.moves;
    } catch (error) {
      console.error('Ошибка получения ходов:', error);
      return [];
    }
  }

  async makeAIMove(board, currentPlayer, difficulty = 'champion') {
    try {
      const response = await this.client.post('/ai', {
        board,
        currentPlayer,
        difficulty,
        action: 'makeMove'
      });
      
      return response.data;
    } catch (error) {
      console.error('Ошибка выполнения хода ИИ:', error);
      throw error;
    }
  }
}

export const gameAPI = new GameAPI();