from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, case
from datetime import datetime

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter()


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
        "project": {"id": task.project.id, "name": task.project.name} if task.project else None,
    }


@router.get("/", response_model=schemas.DashboardOut)
def get_dashboard(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project_ids = [
        row[0]
        for row in db.query(models.ProjectMember.project_id)
        .filter(models.ProjectMember.user_id == current_user.id)
        .all()
    ]

    projects_count = len(project_ids)
    now = datetime.utcnow()

    if project_ids:
        stats = db.query(
            func.count(models.Task.id).label("total"),
            func.count(models.Task.id).filter(models.Task.status == "todo").label("todo"),
            func.count(models.Task.id).filter(models.Task.status == "in_progress").label("in_progress"),
            func.count(models.Task.id).filter(models.Task.status == "done").label("done"),
            func.count(models.Task.id).filter(
                and_(models.Task.due_date < now, models.Task.status != "done")
            ).label("overdue"),
        ).filter(models.Task.project_id.in_(project_ids)).one()

        total_tasks = stats.total or 0
        todo_count = stats.todo or 0
        in_progress_count = stats.in_progress or 0
        done_count = stats.done or 0
        overdue_count = stats.overdue or 0
    else:
        total_tasks = todo_count = in_progress_count = done_count = overdue_count = 0

    # MySQL doesn't support NULLS LAST; use CASE to push NULLs to end
    null_last = case((models.Task.due_date == None, 1), else_=0)

    my_tasks_orm = (
        db.query(models.Task)
        .filter(models.Task.assignee_id == current_user.id, models.Task.status != "done")
        .options(
            joinedload(models.Task.assignee),
            joinedload(models.Task.creator),
            joinedload(models.Task.project),
        )
        .order_by(null_last, models.Task.due_date.asc(), models.Task.created_at.desc())
        .limit(5)
        .all()
    )

    recent_tasks_orm = []
    if project_ids:
        recent_tasks_orm = (
            db.query(models.Task)
            .filter(models.Task.project_id.in_(project_ids))
            .options(
                joinedload(models.Task.assignee),
                joinedload(models.Task.creator),
                joinedload(models.Task.project),
            )
            .order_by(models.Task.created_at.desc())
            .limit(10)
            .all()
        )

    return {
        "total_tasks": total_tasks,
        "todo_count": todo_count,
        "in_progress_count": in_progress_count,
        "done_count": done_count,
        "overdue_count": overdue_count,
        "projects_count": projects_count,
        "my_tasks": [_task_to_dict(t) for t in my_tasks_orm],
        "recent_tasks": [_task_to_dict(t) for t in recent_tasks_orm],
    }
