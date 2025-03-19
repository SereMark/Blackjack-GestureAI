from typing import List

from fastapi import APIRouter, HTTPException, status
from models.item_models import Item, ItemCreate
from services.item_service import (
    get_all_items,
    create_item,
    get_item_by_id,
    update_item,
    delete_item
)

router = APIRouter()

@router.get("/", response_model=List[Item])
def list_items():
    """
    Retrieve all items from the in-memory database.
    """
    return get_all_items()

@router.post("/", response_model=Item)
def create_new_item(item: ItemCreate):
    """
    Create a new item in the in-memory database.
    """
    return create_item(item)

@router.get("/{item_id}", response_model=Item)
def read_item(item_id: int):
    """
    Retrieve a single item by its ID.
    """
    found = get_item_by_id(item_id)
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    return found

@router.put("/{item_id}", response_model=Item)
def modify_item(item_id: int, item_data: ItemCreate):
    """
    Update an existing item by ID.
    """
    updated = update_item(item_id, item_data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    return updated

@router.delete("/{item_id}")
def remove_item(item_id: int):
    """
    Delete an item by its ID.
    """
    success = delete_item(item_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    return {"message": f"Item with ID {item_id} deleted"}