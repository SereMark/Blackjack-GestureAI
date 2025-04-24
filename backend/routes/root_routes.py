from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def read_root():
    return {
        "api": "Blackjack-GestureAI Game API",
        "version": "1.0.0",
        "description": "Backend API for the Blackjack game with gesture recognition integration",
        "endpoints": {
            "game": "/game",
            "docs": "/docs"
        }
    }