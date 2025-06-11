import logging
import threading
from typing import List, Dict, Any, Optional
import random
import time

logger = logging.getLogger(__name__)

# Thread-safe storage for game sessions
_games = {}
_games_lock = threading.RLock()

def create_deck() -> List[Dict[str, str]]:
    """Create a standard 52-card deck."""
    suits = ["hearts", "diamonds", "clubs", "spades"]
    ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    deck = []
    for suit in suits:
        for rank in ranks:
            deck.append({"rank": rank, "suit": suit})
    return deck

def shuffle_deck(deck: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Create a shuffled copy of the deck."""
    deck_copy = deck.copy()
    random.shuffle(deck_copy)
    return deck_copy

def calculate_score(hand: List[Dict[str, str]]) -> int:
    """Calculate the blackjack score for a hand."""
    if not hand:
        return 0
    
    total = 0
    aces = 0
    
    for card in hand:
        rank = card["rank"]
        if rank == "A":
            total += 11
            aces += 1
        elif rank in ["K", "Q", "J"]:
            total += 10
        else:
            total += int(rank)
    
    # Adjust for aces
    while aces > 0 and total > 21:
        total -= 10
        aces -= 1
    
    return total

def is_blackjack(hand: List[Dict[str, str]]) -> bool:
    """Check if hand is a blackjack (21 with exactly 2 cards)."""
    return len(hand) == 2 and calculate_score(hand) == 21

def cards_equal(card1: Dict[str, str], card2: Dict[str, str]) -> bool:
    """Check if two cards are equal."""
    return card1["rank"] == card2["rank"] and card1["suit"] == card2["suit"]

def remove_used_cards_from_deck(deck: List[Dict[str, str]], used_cards: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Remove used cards from a deck."""
    filtered_deck = []
    
    for deck_card in deck:
        is_used = False
        for used_card in used_cards:
            if cards_equal(deck_card, used_card):
                is_used = True
                break
        if not is_used:
            filtered_deck.append(deck_card)
    
    return filtered_deck

def deal_initial_hands(deck: List[Dict[str, str]]) -> Dict[str, Any]:
    """Deal initial hands to player and dealer."""
    if len(deck) < 4:
        logger.warning("Insufficient cards in deck, creating new deck")
        deck = shuffle_deck(create_deck())
    
    player_hand = deck[:2]
    dealer_hand = deck[2:4]
    remaining_deck = deck[4:]
    
    logger.debug(f"Dealt initial hands - Player: {len(player_hand)} cards, Dealer: {len(dealer_hand)} cards")
    
    return {
        "playerHand": player_hand,
        "dealerHand": dealer_hand,
        "remaining_deck": remaining_deck
    }

def ensure_sufficient_deck(game: Dict[str, Any], cards_needed: int = 1) -> None:
    """Ensure the deck has enough cards, reshuffling if necessary."""
    if len(game["deck"]) < cards_needed:
        logger.info("Deck running low, reshuffling...")
        
        # Create new deck and remove cards already in play
        new_deck = create_deck()
        used_cards = game["playerHand"] + game["dealerHand"]
        filtered_deck = remove_used_cards_from_deck(new_deck, used_cards)
        game["deck"] = shuffle_deck(filtered_deck)
        
        logger.info(f"Reshuffled deck - {len(game['deck'])} cards available")

def initialize_game(session_id: str) -> Dict[str, Any]:
    """Initialize a new game session."""
    with _games_lock:
        if session_id not in _games:
            logger.info(f"Initializing new game for session: {session_id[:8]}...")
            
            _games[session_id] = {
                "deck": [],
                "dealerHand": [],
                "playerHand": [],
                "dealerScore": 0,
                "playerScore": 0,
                "playerMoney": 1000,
                "bet": 0,
                "gameState": "idle",
                "winner": None,
                "message": "Welcome to Blackjack! Place your bet to start.",
                "isBlackjack": False,
                "roundsWon": 0,
                "roundsLost": 0,
                "roundsPushed": 0,
                "lastActivity": time.time()
            }
        
        return dict(_games[session_id])

def get_game_state(session_id: str) -> Optional[Dict[str, Any]]:
    """Get current game state for a session."""
    with _games_lock:
        game = _games.get(session_id)
        if game:
            # Update last activity
            game["lastActivity"] = time.time()
            return dict(game)
        return None

def place_bet(session_id: str, bet_amount: int) -> Optional[Dict[str, Any]]:
    """Place a bet and deal initial cards."""
    with _games_lock:
        game = _games.get(session_id)
        if not game:
            logger.warning(f"Game not found for session {session_id[:8]}, initializing...")
            initialize_game(session_id)
            game = _games.get(session_id)
        
        # Validate bet
        if bet_amount < 1:
            logger.warning(f"Invalid bet amount: {bet_amount}")
            return None
        
        if bet_amount > game["playerMoney"]:
            logger.warning(f"Insufficient funds: bet {bet_amount}, balance {game['playerMoney']}")
            return None
        
        # Place bet and deal cards
        game["bet"] = bet_amount
        deck = shuffle_deck(create_deck())
        hands = deal_initial_hands(deck)
        
        game["deck"] = hands["remaining_deck"]
        game["dealerHand"] = hands["dealerHand"]
        game["playerHand"] = hands["playerHand"]
        game["dealerScore"] = calculate_score(game["dealerHand"])
        game["playerScore"] = calculate_score(game["playerHand"])
        game["winner"] = None
        game["message"] = ""
        game["isBlackjack"] = False
        game["lastActivity"] = time.time()
        
        logger.info(f"Bet placed: ${bet_amount} - Player: {game['playerScore']}, Dealer: {game['dealerScore']}")
        
        # Check for immediate blackjack
        player_blackjack = is_blackjack(game["playerHand"])
        dealer_blackjack = is_blackjack(game["dealerHand"])
        
        if player_blackjack or dealer_blackjack:
            game["isBlackjack"] = True
            if player_blackjack and dealer_blackjack:
                logger.info("Both have blackjack - Push")
                return handle_round_over(session_id, "push", "Both have Blackjack!")
            elif player_blackjack:
                logger.info("Player blackjack - Win")
                return handle_round_over(session_id, "player", "Blackjack! You win!")
            else:
                logger.info("Dealer blackjack - Loss")
                return handle_round_over(session_id, "dealer", "Dealer has Blackjack!")
        
        game["gameState"] = "in_progress"
        game["message"] = "Game in progress. Hit or Stand?"
        
        return dict(game)

def hit(session_id: str) -> Optional[Dict[str, Any]]:
    """Player takes another card."""
    with _games_lock:
        game = _games.get(session_id)
        if not game or game["gameState"] != "in_progress":
            logger.warning(f"Invalid hit attempt for session {session_id[:8]}")
            return dict(game) if game else None
        
        # Ensure we have enough cards
        ensure_sufficient_deck(game, 1)
        
        if not game["deck"]:
            logger.error("No cards available in deck")
            return dict(game)
        
        # Deal card
        card = game["deck"].pop(0)
        game["playerHand"].append(card)
        game["playerScore"] = calculate_score(game["playerHand"])
        game["lastActivity"] = time.time()
        
        logger.info(f"Player hit - Card: {card['rank']}{card['suit']}, New score: {game['playerScore']}")
        
        if game["playerScore"] > 21:
            logger.info("Player busted")
            return handle_round_over(session_id, "dealer", "Bust! You went over 21.")
        elif game["playerScore"] == 21:
            game["message"] = "You have 21! Consider standing."
        else:
            game["message"] = f"You have {game['playerScore']}. Hit or Stand?"
        
        return dict(game)

def stand(session_id: str) -> Optional[Dict[str, Any]]:
    """Player stands and dealer plays their hand."""
    with _games_lock:
        game = _games.get(session_id)
        if not game or game["gameState"] != "in_progress":
            logger.warning(f"Invalid stand attempt for session {session_id[:8]}")
            return dict(game) if game else None
        
        logger.info(f"Player stands with {game['playerScore']}")
        
        # Dealer plays according to rules (hit on 16, stand on 17)
        while game["dealerScore"] < 17:
            ensure_sufficient_deck(game, 1)
            
            if not game["deck"]:
                logger.error("No cards available for dealer")
                break
                
            card = game["deck"].pop(0)
            game["dealerHand"].append(card)
            game["dealerScore"] = calculate_score(game["dealerHand"])
            
            logger.info(f"Dealer hit - Card: {card['rank']}{card['suit']}, New score: {game['dealerScore']}")
        
        game["lastActivity"] = time.time()
        
        # Determine winner
        return decide_winner(session_id)

def decide_winner(session_id: str) -> Dict[str, Any]:
    """Determine the winner of the round."""
    with _games_lock:
        game = _games.get(session_id)
        if not game:
            logger.error(f"Game not found for winner determination: {session_id[:8]}")
            return {}
        
        player_score = game["playerScore"]
        dealer_score = game["dealerScore"]
        
        logger.info(f"Final scores - Player: {player_score}, Dealer: {dealer_score}")
        
        # Determine winner
        if player_score > 21:
            return handle_round_over(session_id, "dealer", "You busted!")
        elif dealer_score > 21:
            return handle_round_over(session_id, "player", "Dealer busted! You win!")
        elif player_score > dealer_score:
            return handle_round_over(session_id, "player", f"You win! {player_score} beats {dealer_score}")
        elif dealer_score > player_score:
            return handle_round_over(session_id, "dealer", f"Dealer wins! {dealer_score} beats {player_score}")
        else:
            return handle_round_over(session_id, "push", f"Push! Both have {player_score}")

def handle_round_over(session_id: str, winner: str, message: str = "") -> Dict[str, Any]:
    """Handle end of round, update money and statistics."""
    with _games_lock:
        game = _games.get(session_id)
        if not game:
            logger.error(f"Game not found for round over: {session_id[:8]}")
            return {}
        
        bet_amount = game["bet"]
        original_money = game["playerMoney"]
        
        if winner == "player":
            if game.get("isBlackjack", False):
                # Blackjack pays 3:2 - player gets bet back plus 1.5x bet as winnings
                winnings = int(bet_amount * 1.5)
                game["playerMoney"] += bet_amount + winnings
                logger.info(f"Player wins with blackjack: +${bet_amount + winnings} (bet back + ${winnings} winnings)")
            else:
                # Normal win pays 1:1 - player gets bet back plus bet amount as winnings
                game["playerMoney"] += bet_amount * 2
                logger.info(f"Player wins: +${bet_amount * 2} (bet back + winnings)")
            game["roundsWon"] += 1
        elif winner == "dealer":
            game["playerMoney"] -= bet_amount
            game["roundsLost"] += 1
            logger.info(f"Dealer wins: -${bet_amount}")
        else:  # push
            game["roundsPushed"] += 1
            logger.info("Push - no money changes hands")
        
        game["gameState"] = "round_over"
        game["winner"] = winner
        game["message"] = message
        game["lastActivity"] = time.time()
        
        logger.info(f"Round over - Winner: {winner}, Balance: ${original_money} -> ${game['playerMoney']}")
        
        return dict(game)

def new_round(session_id: str) -> Dict[str, Any]:
    """Start a new round keeping player money and statistics."""
    with _games_lock:
        game = _games.get(session_id)
        if not game:
            logger.info(f"No existing game found, initializing new one for {session_id[:8]}")
            return initialize_game(session_id)
        
        # Preserve persistent data
        player_money = game["playerMoney"]
        rounds_won = game.get("roundsWon", 0)
        rounds_lost = game.get("roundsLost", 0)
        rounds_pushed = game.get("roundsPushed", 0)
        
        # Reset round-specific data
        game.update({
            "deck": [],
            "dealerHand": [],
            "playerHand": [],
            "dealerScore": 0,
            "playerScore": 0,
            "bet": 0,
            "gameState": "idle",
            "winner": None,
            "message": "Place your bet to start a new round",
            "isBlackjack": False,
            "playerMoney": player_money,
            "roundsWon": rounds_won,
            "roundsLost": rounds_lost,
            "roundsPushed": rounds_pushed,
            "lastActivity": time.time()
        })
        
        logger.info(f"New round started for session {session_id[:8]} - Balance: ${player_money}")
        
        return dict(game)

def reset_game(session_id: str) -> Dict[str, Any]:
    """Reset the entire game to initial state."""
    with _games_lock:
        logger.info(f"Resetting game for session {session_id[:8]}")
        
        _games[session_id] = {
            "deck": [],
            "dealerHand": [],
            "playerHand": [],
            "dealerScore": 0,
            "playerScore": 0,
            "playerMoney": 1000,
            "bet": 0,
            "gameState": "idle",
            "winner": None,
            "message": "Welcome to Blackjack! Place your bet to start.",
            "isBlackjack": False,
            "roundsWon": 0,
            "roundsLost": 0,
            "roundsPushed": 0,
            "lastActivity": time.time()
        }
        
        return dict(_games[session_id])