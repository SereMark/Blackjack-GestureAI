from pydantic import BaseModel

# Pydantic schemas for Items
class ItemBase(BaseModel):
    name: str
    description: str

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int