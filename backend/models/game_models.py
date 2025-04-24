from pydantic import BaseModel
from typing import List, Literal

class Card(BaseModel):
    rank: str
    suit: str

class GameState(BaseModel):
    deck: List[Card]
    dealerHand: List[Card]
    playerHand: List[Card]
    dealerScore: int
    playerScore: int
    playerMoney: int
    bet: int
    gameState: Literal["idle", "in_progress", "round_over"]

class BetRequest(BaseModel):
    bet: int

class GameResult(BaseModel):
    winner: Literal["player", "dealer", "push"]
    playerMoney: int

class GestureResponse(BaseModel):
    gesture: Literal["idle", "hit", "stand"]