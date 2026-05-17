from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/", response_model=List[schemas.UserOut])
def search_users(
    search: str = Query(default="", description="Search by name or email"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.User).filter(models.User.id != current_user.id)
    if search:
        like = f"%{search.lower()}%"
        query = query.filter(
            (models.User.name.ilike(like)) | (models.User.email.ilike(like))
        )
    return query.limit(20).all()
