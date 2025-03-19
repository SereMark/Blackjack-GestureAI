from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def read_root():
    """
    Basic root endpoint.
    """
    return {"Hello": "World"}