import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

async def generic_exception_handler(request: Request, exc: Exception):
    # Log the full error for debugging
    logger.error(f"Unhandled exception occurred: {type(exc).__name__}: {str(exc)}", exc_info=True)
    
    # Provide a user-friendly error message
    error_message = "An internal server error occurred. Please try again later."
    
    # For specific exceptions, provide more helpful messages
    if "session" in str(exc).lower():
        error_message = "Session error occurred. Please refresh the page and try again."
    elif "database" in str(exc).lower() or "connection" in str(exc).lower():
        error_message = "Database connection error. Please try again in a moment."
    elif "timeout" in str(exc).lower():
        error_message = "Request timed out. Please try again."
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": error_message,
            "type": "ServerError"
        }
    )