import logging
from fastapi import APIRouter, HTTPException, status, Request, Response
import secrets

from models.game_models import GameState, BetRequest
from services.game_service import (
    initialize_game,
    get_game_state,
    place_bet,
    hit,
    stand,
    new_round,
    reset_game
)
from services.gesture_service import get_current_gesture, reset_gesture_detector

logger = logging.getLogger(__name__)
router = APIRouter()

def get_or_create_session_id(request: Request, response: Response) -> str:
    """
    Get existing session ID from cookie/header or create a new one.
    This ensures session persistence across requests.
    """
    # Try to get session ID from cookie first
    session_id = request.cookies.get("session_id")
    
    # Fallback to header
    if not session_id:
        session_id = request.headers.get("X-Session-ID")
    
    # Create new session if none exists
    if not session_id:
        session_id = secrets.token_urlsafe(32)
        logger.info(f"Created new session: {session_id[:8]}...")
    
    # Set cookie for future requests (7 days expiry)
    response.set_cookie(
        key="session_id",
        value=session_id,
        max_age=7 * 24 * 60 * 60,  # 7 days
        httponly=True,
        secure=False,  # Should be set to True, but idc now lol
        samesite="lax"
    )
    
    return session_id

@router.get("/state", response_model=GameState)
async def get_current_state(request: Request, response: Response):
    """Get current game state, creating a new session if needed."""
    try:
        session_id = get_or_create_session_id(request, response)
        state = get_game_state(session_id)
        
        if not state:
            logger.info(f"Initializing new game for session: {session_id[:8]}...")
            state = initialize_game(session_id)
        
        return state
    except Exception as e:
        logger.error(f"Error getting game state: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve game state"
        )

@router.post("/bet", response_model=GameState)
async def make_bet(bet_request: BetRequest, request: Request, response: Response):
    """Place a bet and start a new round."""
    try:
        session_id = get_or_create_session_id(request, response)
        
        # Validate bet amount
        if bet_request.bet <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bet amount must be greater than 0"
            )
        
        if bet_request.bet > 10000:  # Max bet limit
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bet amount exceeds maximum limit of $10,000"
            )
        
        state = place_bet(session_id, bet_request.bet)
        if not state:
            # Get current game state to check player money
            current_state = get_game_state(session_id)
            if current_state and bet_request.bet > current_state["playerMoney"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient funds. You have ${current_state['playerMoney']}"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unable to place bet. Please try again."
                )
        
        logger.info(f"Bet placed: ${bet_request.bet} for session {session_id[:8]}...")
        return state
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error placing bet: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to place bet"
        )

@router.post("/hit", response_model=GameState)
async def player_hit(request: Request, response: Response):
    """Player takes another card."""
    try:
        session_id = get_or_create_session_id(request, response)
        state = get_game_state(session_id)
        
        if not state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Game not initialized. Please start a new game."
            )
        
        if state["gameState"] != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot hit when game state is '{state['gameState']}'"
            )
        
        result_state = hit(session_id)
        if not result_state:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error processing hit action"
            )
        
        logger.info(f"Hit action for session {session_id[:8]}... - Score: {result_state['playerScore']}")
        return result_state
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing hit: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process hit action"
        )

@router.post("/stand", response_model=GameState)
async def player_stand(request: Request, response: Response):
    """Player stands and dealer plays their hand."""
    try:
        session_id = get_or_create_session_id(request, response)
        state = get_game_state(session_id)
        
        if not state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Game not initialized. Please start a new game."
            )
        
        if state["gameState"] != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot stand when game state is '{state['gameState']}'"
            )
        
        result_state = stand(session_id)
        if not result_state:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error processing stand action"
            )
        
        logger.info(f"Stand action for session {session_id[:8]}... - Winner: {result_state.get('winner', 'N/A')}")
        return result_state
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing stand: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process stand action"
        )

@router.post("/new-round", response_model=GameState)
async def start_new_round(request: Request, response: Response):
    """Start a new round with the same session."""
    try:
        session_id = get_or_create_session_id(request, response)
        result_state = new_round(session_id)
        
        logger.info(f"New round started for session {session_id[:8]}...")
        return result_state
        
    except Exception as e:
        logger.error(f"Error starting new round: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start new round"
        )

@router.post("/reset", response_model=GameState)
async def restart_game(request: Request, response: Response):
    """Reset the entire game and start fresh."""
    try:
        session_id = get_or_create_session_id(request, response)
        
        # Reset gesture detector when game resets
        reset_gesture_detector()
        result_state = reset_game(session_id)
        
        logger.info(f"Game reset for session {session_id[:8]}...")
        return result_state
        
    except Exception as e:
        logger.error(f"Error resetting game: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset game"
        )

@router.get("/gesture")
async def get_gesture():
    """
    Get current gesture detection result with confidence scoring.
    
    Returns gesture information including confidence score and detection quality.
    """
    try:
        gesture_data = get_current_gesture()
        
        return {
            "gesture": gesture_data["gesture"],
            "confidence": round(gesture_data["confidence"], 2),
            "is_confident": gesture_data["is_confident"],
            "timestamp": gesture_data.get("timestamp", None),
            "status": "active" if gesture_data["gesture"] != "idle" else "idle"
        }
        
    except Exception as e:
        logger.error(f"Error getting gesture: {str(e)}")
        return {
            "gesture": "idle",
            "confidence": 0.0,
            "is_confident": False,
            "status": "error"
        }