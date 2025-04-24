from typing import List, Dict, Any, Optional
import random

_games = {}

def create_deck() -> List[Dict[str, str]]:
    suits = ["hearts", "diamonds", "clubs", "spades"]
    ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    deck = []
    for s in suits:
        for r in ranks:
            deck.append({"rank": r, "suit": s})
    return deck

def shuffle_deck(deck: List[Dict[str, str]]) -> List[Dict[str, str]]:
    deck_copy = deck.copy()
    random.shuffle(deck_copy)
    return deck_copy

def calculate_score(hand: List[Dict[str, str]]) -> int:
    total = 0
    aces = 0
    for c in hand:
        if c["rank"] == "A":
            total += 11
            aces += 1
        elif c["rank"] in ["K", "Q", "J"]:
            total += 10
        else:
            total += int(c["rank"])
    
    while aces > 0 and total > 21:
        total -= 10
        aces -= 1
    
    return total

def deal_initial_hands(deck: List[Dict[str, str]]) -> Dict[str, List[Dict[str, str]]]:
    player_hand = deck[:2]
    dealer_hand = deck[2:4]
    return {"playerHand": player_hand, "dealerHand": dealer_hand}

def initialize_game(session_id: str) -> Dict[str, Any]:
    if session_id not in _games:
        _games[session_id] = {
            "deck": [],
            "dealerHand": [],
            "playerHand": [],
            "dealerScore": 0,
            "playerScore": 0,
            "playerMoney": 1000,
            "bet": 0,
            "gameState": "idle"
        }
    return dict(_games[session_id])

def get_game_state(session_id: str) -> Optional[Dict[str, Any]]:
    game = _games.get(session_id)
    return dict(game) if game else None

def place_bet(session_id: str, bet_amount: int) -> Dict[str, Any]:
    game = _games.get(session_id)
    if not game:
        game = initialize_game(session_id)
        game = _games.get(session_id)
    
    if bet_amount >= 1 and bet_amount <= game["playerMoney"]:
        game["bet"] = bet_amount
        deck = shuffle_deck(create_deck())
        hands = deal_initial_hands(deck)
        
        game["deck"] = deck[4:]
        game["dealerHand"] = hands["dealerHand"]
        game["playerHand"] = hands["playerHand"]
        game["dealerScore"] = calculate_score(game["dealerHand"])
        game["playerScore"] = calculate_score(game["playerHand"])
        game["gameState"] = "in_progress"
    
    return dict(game)

def hit(session_id: str) -> Dict[str, Any]:
    game = _games.get(session_id)
    if not game or game["gameState"] != "in_progress" or not game["deck"]:
        return dict(game) if game else None
    
    card = game["deck"][0]
    game["deck"] = game["deck"][1:]
    game["playerHand"].append(card)
    game["playerScore"] = calculate_score(game["playerHand"])
    
    if game["playerScore"] > 21:
        return handle_round_over(session_id, "dealer")
    
    return dict(game)

def stand(session_id: str) -> Dict[str, Any]:
    game = _games.get(session_id)
    if not game or game["gameState"] != "in_progress":
        return dict(game) if game else None
    
    while game["dealerScore"] < 17 and game["deck"]:
        card = game["deck"][0]
        game["deck"] = game["deck"][1:]
        game["dealerHand"].append(card)
        game["dealerScore"] = calculate_score(game["dealerHand"])
    
    decide_winner(session_id)
    return get_game_state(session_id)

def decide_winner(session_id: str) -> None:
    game = _games.get(session_id)
    if not game:
        return
    
    if game["dealerScore"] > 21:
        handle_round_over(session_id, "player")
    elif game["dealerScore"] > game["playerScore"]:
        handle_round_over(session_id, "dealer")
    elif game["dealerScore"] < game["playerScore"]:
        if game["playerScore"] <= 21:
            handle_round_over(session_id, "player")
        else:
            handle_round_over(session_id, "dealer")
    else:
        handle_round_over(session_id, "push")

def handle_round_over(session_id: str, winner: str) -> Dict[str, Any]:
    game = _games.get(session_id)
    if not game:
        return {}
    
    if winner == "player":
        game["playerMoney"] += game["bet"]
    elif winner == "dealer":
        game["playerMoney"] -= game["bet"]
    
    game["gameState"] = "round_over"
    return dict(game)

def new_round(session_id: str) -> Dict[str, Any]:
    game = _games.get(session_id)
    if not game:
        return initialize_game(session_id)
    
    game["deck"] = []
    game["dealerHand"] = []
    game["playerHand"] = []
    game["dealerScore"] = 0
    game["playerScore"] = 0
    game["bet"] = 0
    game["gameState"] = "idle"
    return dict(game)

def reset_game(session_id: str) -> Dict[str, Any]:
    _games[session_id] = {
        "deck": [],
        "dealerHand": [],
        "playerHand": [],
        "dealerScore": 0,
        "playerScore": 0,
        "playerMoney": 1000,
        "bet": 0,
        "gameState": "idle"
    }
    return dict(_games[session_id])

def process_gesture(session_id: str, gesture: str) -> Dict[str, Any]:
    if session_id not in _games:
        initialize_game(session_id)
    
    if gesture == "hit":
        return hit(session_id)
    elif gesture == "stand":
        return stand(session_id)
    
    return get_game_state(session_id)