from typing import List, Optional

from models.item_models import Item, ItemCreate

# For demonstration: a simple in-memory "database" (ofc wont do this fr, will probably use SQLite)
fake_items_db: List[Item] = []

def get_all_items() -> List[Item]:
    """Retrieve all items from the in-memory DB."""
    return fake_items_db

def create_item(item_data: ItemCreate) -> Item:
    """Create a new item in the in-memory DB."""
    new_id = len(fake_items_db) + 1
    new_item = Item(id=new_id, **item_data.dict())
    fake_items_db.append(new_item)
    return new_item

def get_item_by_id(item_id: int) -> Optional[Item]:
    """Retrieve a single item from the in-memory DB by ID."""
    return next((itm for itm in fake_items_db if itm.id == item_id), None)

def update_item(item_id: int, item_data: ItemCreate) -> Item:
    """Update an existing item by ID."""
    for i, itm in enumerate(fake_items_db):
        if itm.id == item_id:
            updated_item = Item(id=item_id, **item_data.dict())
            fake_items_db[i] = updated_item
            return updated_item
    return None

def delete_item(item_id: int) -> bool:
    """Delete an item by its ID, returning success status."""
    for i, itm in enumerate(fake_items_db):
        if itm.id == item_id:
            del fake_items_db[i]
            return True
    return False