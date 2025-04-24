from fastapi import APIRouter, HTTPException, status, Depends

from models.game_models import GameState, BetRequest, GestureResponse
from services.game_service import (
    initialize_game,
    get_game_state,
    place_bet,
    hit,
    stand,
    new_round,
    reset_game,
    process_gesture
)

router = APIRouter()

def get_session_id() -> str:
    return "fixed-session-id"

@router.get("/state", response_model=GameState)
async def get_current_state(session_id: str = Depends(get_session_id)):
    state = get_game_state(session_id)
    if not state:
        state = initialize_game(session_id)
    return state

@router.post("/bet", response_model=GameState)
async def make_bet(bet_request: BetRequest, session_id: str = Depends(get_session_id)):
    state = place_bet(session_id, bet_request.bet)
    return state

@router.post("/hit", response_model=GameState)
async def player_hit(session_id: str = Depends(get_session_id)):
    state = hit(session_id)
    if not state or state["gameState"] != "in_progress" and state["gameState"] != "round_over":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot hit in current game state"
        )
    return state

@router.post("/stand", response_model=GameState)
async def player_stand(session_id: str = Depends(get_session_id)):
    state = stand(session_id)
    if not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game not initialized"
        )
    return state

@router.post("/new-round", response_model=GameState)
async def start_new_round(session_id: str = Depends(get_session_id)):
    return new_round(session_id)

@router.post("/reset", response_model=GameState)
async def restart_game(session_id: str = Depends(get_session_id)):
    return reset_game(session_id)

@router.get("/gesture", response_model=GestureResponse)
async def get_gesture():
    import random
    gestures = ["idle", "idle", "idle", "hit", "stand"]
    return {"gesture": random.choice(gestures)}

@router.post("/process-gesture", response_model=GameState)
async def handle_gesture(gesture: GestureResponse, session_id: str = Depends(get_session_id)):
    return process_gesture(session_id, gesture.gesture)