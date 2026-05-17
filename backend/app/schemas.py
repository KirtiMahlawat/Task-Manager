from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    email: str
    created_at: datetime


class Token(BaseModel):
    token: str
    user: UserOut


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Project name cannot be empty")
        return v.strip()


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class MemberOut(BaseModel):
    user_id: UUID
    name: str
    email: str
    role: str
    joined_at: datetime


class ProjectOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    owner_id: UUID
    role: str
    created_at: datetime
    updated_at: datetime
    task_count: int = 0
    member_count: int = 0


class ProjectDetail(ProjectOut):
    members: list[MemberOut] = []


class MemberAdd(BaseModel):
    email: EmailStr
    role: Literal["admin", "member"] = "member"


class MemberUpdateRole(BaseModel):
    role: Literal["admin", "member"]


class AssigneeInfo(BaseModel):
    id: UUID
    name: str
    email: str


class CreatorInfo(BaseModel):
    id: UUID
    name: str


class ProjectInfo(BaseModel):
    id: UUID
    name: str


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assignee_id: Optional[UUID] = None
    status: Literal["todo", "in_progress", "done"] = "todo"
    priority: Literal["low", "medium", "high"] = "medium"
    due_date: Optional[datetime] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be empty")
        return v.strip()


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[UUID] = None
    status: Optional[Literal["todo", "in_progress", "done"]] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    due_date: Optional[datetime] = None


class TaskOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    project_id: UUID
    status: str
    priority: str
    due_date: Optional[datetime]
    assignee: Optional[AssigneeInfo]
    creator: Optional[CreatorInfo]
    created_at: datetime
    updated_at: datetime
    project: Optional[ProjectInfo] = None


class DashboardOut(BaseModel):
    total_tasks: int
    todo_count: int
    in_progress_count: int
    done_count: int
    overdue_count: int
    projects_count: int
    my_tasks: list[TaskOut]
    recent_tasks: list[TaskOut]
