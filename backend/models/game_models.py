from pydantic import BaseModel
from typing import List, Optional

class Card(BaseModel):
    rank: str  # A, 2-10, J, Q, K
    suit: str  # hearts, diamonds, clubs, spades

class GameState(BaseModel):
    dealerHand: List[Card]
    playerHand: List[Card]
    dealerScore: int
    playerScore: int
    playerMoney: int
    bet: int
    gameState: str  # idle, in_progress, round_over
    winner: Optional[str] = None  # player, dealer, push
    message: str = ""
    isBlackjack: bool = False
    roundsWon: int = 0
    roundsLost: int = 0
    roundsPushed: int = 0

class BetRequest(BaseModel):
    bet: int