from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def health_check():
    """
    A quick health-check endpoint to ensure the API is responsive.
    """
    return {"status": "OK", "message": "API is healthy!"}