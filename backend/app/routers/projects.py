from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from uuid import UUID

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter()


def _get_member_role(db: Session, project_id: UUID, user_id: UUID) -> str | None:
    m = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id,
        models.ProjectMember.user_id == user_id,
    ).first()
    return m.role if m else None


def _task_to_dict(task: models.Task, include_project: bool = False) -> dict:
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
        "project": {"id": task.project.id, "name": task.project.name}
        if include_project and task.project
        else None,
    }


# ── Projects ──────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.ProjectOut])
def list_projects(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = (
        db.query(models.ProjectMember)
        .filter(models.ProjectMember.user_id == current_user.id)
        .options(joinedload(models.ProjectMember.project))
        .all()
    )
    result = []
    for m in memberships:
        p = m.project
        task_count = db.query(func.count(models.Task.id)).filter(models.Task.project_id == p.id).scalar()
        member_count = db.query(func.count(models.ProjectMember.id)).filter(
            models.ProjectMember.project_id == p.id
        ).scalar()
        result.append({
            "id": p.id, "name": p.name, "description": p.description,
            "owner_id": p.owner_id, "role": m.role,
            "created_at": p.created_at, "updated_at": p.updated_at,
            "task_count": task_count, "member_count": member_count,
        })
    return result


@router.post("/", response_model=schemas.ProjectOut, status_code=201)
def create_project(
    data: schemas.ProjectCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = models.Project(name=data.name, description=data.description, owner_id=current_user.id)
    db.add(project)
    db.flush()
    db.add(models.ProjectMember(project_id=project.id, user_id=current_user.id, role="admin"))
    db.commit()
    db.refresh(project)
    return {
        "id": project.id, "name": project.name, "description": project.description,
        "owner_id": project.owner_id, "role": "admin",
        "created_at": project.created_at, "updated_at": project.updated_at,
        "task_count": 0, "member_count": 1,
    }


@router.get("/{project_id}", response_model=schemas.ProjectDetail)
def get_project(
    project_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = _get_member_role(db, project_id, current_user.id)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    members = (
        db.query(models.ProjectMember)
        .filter(models.ProjectMember.project_id == project_id)
        .options(joinedload(models.ProjectMember.user))
        .all()
    )
    members_data = [
        {"user_id": m.user_id, "name": m.user.name, "email": m.user.email, "role": m.role, "joined_at": m.joined_at}
        for m in members
    ]
    return {
        "id": project.id, "name": project.name, "description": project.description,
        "owner_id": project.owner_id, "role": role,
        "created_at": project.created_at, "updated_at": project.updated_at,
        "task_count": len(project.tasks), "member_count": len(members),
        "members": members_data,
    }


@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: UUID,
    data: schemas.ProjectUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = _get_member_role(db, project_id, current_user.id)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    db.commit()
    db.refresh(project)

    task_count = db.query(func.count(models.Task.id)).filter(models.Task.project_id == project_id).scalar()
    member_count = db.query(func.count(models.ProjectMember.id)).filter(
        models.ProjectMember.project_id == project_id
    ).scalar()
    return {
        "id": project.id, "name": project.name, "description": project.description,
        "owner_id": project.owner_id, "role": role,
        "created_at": project.created_at, "updated_at": project.updated_at,
        "task_count": task_count, "member_count": member_count,
    }


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can delete it")
    db.delete(project)
    db.commit()


# ── Members ───────────────────────────────────────────────────────────────────

@router.get("/{project_id}/members", response_model=List[schemas.MemberOut])
def list_members(
    project_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _get_member_role(db, project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    members = (
        db.query(models.ProjectMember)
        .filter(models.ProjectMember.project_id == project_id)
        .options(joinedload(models.ProjectMember.user))
        .all()
    )
    return [
        {"user_id": m.user_id, "name": m.user.name, "email": m.user.email, "role": m.role, "joined_at": m.joined_at}
        for m in members
    ]


@router.post("/{project_id}/members", response_model=schemas.MemberOut, status_code=201)
def add_member(
    project_id: UUID,
    data: schemas.MemberAdd,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if _get_member_role(db, project_id, current_user.id) != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(models.User).filter(models.User.email == data.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found with that email")

    existing = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id,
        models.ProjectMember.user_id == user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    member = models.ProjectMember(project_id=project_id, user_id=user.id, role=data.role)
    db.add(member)
    db.commit()
    db.refresh(member)
    return {"user_id": user.id, "name": user.name, "email": user.email, "role": member.role, "joined_at": member.joined_at}


@router.delete("/{project_id}/members/{user_id}", status_code=204)
def remove_member(
    project_id: UUID,
    user_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if _get_member_role(db, project_id, current_user.id) != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if project and project.owner_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot remove the project owner")

    member = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id,
        models.ProjectMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()


@router.put("/{project_id}/members/{user_id}", response_model=schemas.MemberOut)
def update_member_role(
    project_id: UUID,
    user_id: UUID,
    data: schemas.MemberUpdateRole,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if _get_member_role(db, project_id, current_user.id) != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    member = (
        db.query(models.ProjectMember)
        .filter(models.ProjectMember.project_id == project_id, models.ProjectMember.user_id == user_id)
        .options(joinedload(models.ProjectMember.user))
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.role = data.role
    db.commit()
    return {"user_id": member.user_id, "name": member.user.name, "email": member.user.email,
            "role": member.role, "joined_at": member.joined_at}


# ── Tasks under project ────────────────────────────────────────────────────────

@router.get("/{project_id}/tasks", response_model=List[schemas.TaskOut])
def list_tasks(
    project_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _get_member_role(db, project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    tasks = (
        db.query(models.Task)
        .filter(models.Task.project_id == project_id)
        .options(joinedload(models.Task.assignee), joinedload(models.Task.creator))
        .order_by(models.Task.created_at.desc())
        .all()
    )
    return [_task_to_dict(t) for t in tasks]


@router.post("/{project_id}/tasks", response_model=schemas.TaskOut, status_code=201)
def create_task(
    project_id: UUID,
    data: schemas.TaskCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = _get_member_role(db, project_id, current_user.id)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required to create tasks")

    if data.assignee_id:
        is_member = db.query(models.ProjectMember).filter(
            models.ProjectMember.project_id == project_id,
            models.ProjectMember.user_id == data.assignee_id,
        ).first()
        if not is_member:
            raise HTTPException(status_code=400, detail="Assignee must be a project member")

    task = models.Task(
        title=data.title,
        description=data.description,
        project_id=project_id,
        assignee_id=data.assignee_id,
        created_by=current_user.id,
        status=data.status,
        priority=data.priority,
        due_date=data.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    task = (
        db.query(models.Task)
        .filter(models.Task.id == task.id)
        .options(joinedload(models.Task.assignee), joinedload(models.Task.creator))
        .first()
    )
    return _task_to_dict(task)
