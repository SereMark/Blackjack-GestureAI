import uvicorn
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exception_handlers import http_exception_handler

from routes.root_routes import router as root_router
from routes.game_routes import router as game_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


app = FastAPI(
    title="Blackjack-GestureAI Game API",
    description="API for Blackjack game with gesture recognition integration",
    version="1.0.0",
    docs_url="/docs"
)

# Add exception handler
app.add_exception_handler(HTTPException, http_exception_handler)

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include routers
app.include_router(root_router, tags=["Utility"])
app.include_router(game_router, prefix="/game", tags=["Game"])

if __name__ == "__main__":
    logger.info("Starting development server...")
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True, log_level="info")