from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from uuid import UUID

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter()


def _get_task_and_role(db: Session, task_id: UUID, user_id: UUID):
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id)
        .options(joinedload(models.Task.assignee), joinedload(models.Task.creator))
        .first()
    )
    if not task:
        return None, None

    member = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == task.project_id,
        models.ProjectMember.user_id == user_id,
    ).first()
    return task, (member.role if member else None)


def _task_to_dict(task: models.Task) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "project_id": task.project_id,
        "status": task.status,
        "priority": task.priority,
        "due_date": task.due_date,
        "assignee": {"id": task.assignee.id, "name": task.assignee.name, "email": task.assignee.email}
        if task.assignee
        else None,
        "creator": {"id": task.creator.id, "name": task.creator.name} if task.creator else None,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "project": None,
    }


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(
    task_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task, role = _get_task_and_role(db, task_id, current_user.id)
    if not task or not role:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_to_dict(task)


@router.put("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: UUID,
    data: schemas.TaskUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task, role = _get_task_and_role(db, task_id, current_user.id)
    if not task or not role:
        raise HTTPException(status_code=404, detail="Task not found")

    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.status is not None:
        task.status = data.status
    if data.priority is not None:
        task.priority = data.priority
    if data.due_date is not None:
        task.due_date = data.due_date
    if data.assignee_id is not None:
        is_member = db.query(models.ProjectMember).filter(
            models.ProjectMember.project_id == task.project_id,
            models.ProjectMember.user_id == data.assignee_id,
        ).first()
        if not is_member:
            raise HTTPException(status_code=400, detail="Assignee must be a project member")
        task.assignee_id = data.assignee_id

    db.commit()
    db.refresh(task)

    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id)
        .options(joinedload(models.Task.assignee), joinedload(models.Task.creator))
        .first()
    )
    return _task_to_dict(task)


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task, role = _get_task_and_role(db, task_id, current_user.id)
    if not task or not role:
        raise HTTPException(status_code=404, detail="Task not found")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required to delete tasks")

    db.delete(task)
    db.commit()
