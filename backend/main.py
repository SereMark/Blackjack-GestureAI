import uvicorn
import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exception_handlers import http_exception_handler
from utils.error_handlers import generic_exception_handler
from services.game_service import cleanup_old_sessions

from routes.root_routes import router as root_router
from routes.game_routes import router as game_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Background task for cleaning up old sessions
async def session_cleanup_task():
    """Background task to periodically clean up old sessions."""
    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour
            cleaned = cleanup_old_sessions(max_age_hours=24)
            if cleaned > 0:
                logger.info(f"Session cleanup completed: {cleaned} sessions removed")
        except Exception as e:
            logger.error(f"Error in session cleanup task: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events."""
    # Startup
    logger.info("Starting Blackjack-GestureAI API server")
    
    # Start background cleanup task
    cleanup_task = asyncio.create_task(session_cleanup_task())
    
    try:
        yield
    finally:
        # Shutdown
        logger.info("Shutting down Blackjack-GestureAI API server")
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            logger.info("Session cleanup task cancelled")
        
        # Final cleanup of sessions
        try:
            final_cleaned = cleanup_old_sessions(max_age_hours=0)  # Clean all sessions
            logger.info(f"Final cleanup: {final_cleaned} sessions removed")
        except Exception as e:
            logger.error(f"Error in final cleanup: {e}")

app = FastAPI(
    title="Blackjack-GestureAI Game API",
    description="API for Blackjack game with gesture recognition integration",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add exception handlers
app.add_exception_handler(Exception, generic_exception_handler)
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

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": "blackjack-gesture-ai",
        "version": "1.0.0"
    }

# Include routers
app.include_router(root_router, tags=["Utility"])
app.include_router(game_router, prefix="/game", tags=["Game"])

if __name__ == "__main__":
    logger.info("Starting development server...")
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000, 
        reload=True,
        log_level="info"
    )