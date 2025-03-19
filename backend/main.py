import uvicorn
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import route modules
from routes.item_routes import router as item_router
from routes.health_routes import router as health_router
from routes.root_routes import router as root_router

# ------------------------------------------------------------------------------
# Logging Configuration
# ------------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------------------
# FastAPI App Initialization
# ------------------------------------------------------------------------------
app = FastAPI(
    title="Blackjack-GestureAI Placeholder API",
    description="A starter template for demonstration purposes.",
    version="0.1.0"
)

# ------------------------------------------------------------------------------
# CORS Middleware
# ------------------------------------------------------------------------------
origins = [
    "http://localhost:3000",   # React dev server
    "http://localhost:5173",   # Vite dev server
    "http://127.0.0.1:5173",   # Local dev URL
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Register Routers
# ------------------------------------------------------------------------------
app.include_router(item_router, prefix="/items", tags=["Items"])
app.include_router(health_router, prefix="/health", tags=["Utility"])
app.include_router(root_router, tags=["Utility"])  # root has no prefix

# ------------------------------------------------------------------------------
# Entry Point for Uvicorn
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)