import json
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from game import CheckersGame
    from const import *
except ImportError as e:
    print(f"Import error: {e}", file=sys.stderr)

def handler(event, context):
    """Netlify Function handler for game logic"""
    try:
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

        game = CheckersGame()
        if board_data:
            game.board = board_data
            game.current_player = current_player

        if action == 'getAllMoves':
            moves = game.get_all_moves_for_player()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'moves': moves})
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
        print(f"Error in game function: {e}", file=sys.stderr)
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': str(e)})
        }