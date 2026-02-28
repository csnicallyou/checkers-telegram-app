import json
import sys
import os

# Добавляем путь к Python модулям
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from strong_ai import StrongCheckersAI, StrongAdvisor
    from game import CheckersGame, GameRules
    from const import *
except ImportError as e:
    print(f"Import error: {e}", file=sys.stderr)
    # Создаем заглушки для демо
    PLAYER_WHITE = 1
    PLAYER_BLACK = 2

def handler(event, context):
    """Netlify Function handler for AI"""
    try:
        # Парсим входные данные
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                },
                'body': ''
            }

        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        board_data = body.get('board')
        current_player = body.get('currentPlayer')
        difficulty = body.get('difficulty', 'champion')

        # Создаем игру из переданной доски
        game = CheckersGame()
        if board_data:
            game.board = board_data
            game.current_player = current_player

        if action == 'getBestMove':
            ai = StrongCheckersAI(game, difficulty)
            move = ai.find_best_move()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'move': move})
            }
            
        elif action == 'makeMove':
            ai = StrongCheckersAI(game, difficulty)
            move = ai.find_best_move()
            
            if move:
                # Выполняем ход
                start_r, start_c, end_r, end_c = move
                game.make_move(start_r, start_c, end_r, end_c)
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({
                        'move': move,
                        'newBoard': game.board,
                        'currentPlayer': game.current_player
                    })
                }
            
        elif action == 'evaluate':
            ai = StrongCheckersAI(game)
            evaluation = ai.evaluate_position(game)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'evaluation': evaluation})
            }

        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': 'Invalid action'})
        }

    except Exception as e:
        print(f"Error in AI function: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': str(e)})
        }