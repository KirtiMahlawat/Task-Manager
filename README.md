# TaskFlow

### Team Task Manager — Full Stack Web Application

A modern, production-ready project management tool where teams can create projects, assign tasks, track progress, and collaborate — all with role-based access control.


---

## Live Demo

> Deployed on Railway — task-manager-production-3d37.up.railway.app

---

## Overview

TaskFlow is a full-stack team collaboration tool built for managing real-world projects. It supports multi-user teams, granular role-based permissions, real-time dashboard stats, and overdue task detection — packaged into a clean, responsive UI.

---

## Features

### Core Functionality

| Feature | Description |
|---------|-------------|
| **Authentication** | JWT-based signup/login with 7-day token expiry |
| **Projects** | Create, update, delete, and browse projects |
| **Task Management** | Full CRUD with status, priority, assignee, and due date |
| **Team Collaboration** | Invite members by email, assign roles |
| **Dashboard** | Live stats: total tasks, in progress, done, overdue, projects |
| **Overdue Detection** | Tasks past due date are automatically flagged |

### Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **Owner** | Everything — including deleting the project and removing any member |
| **Admin** | Create / edit / delete tasks · Manage member roles |
| **Member** | View all tasks · Update task status only |

---

## Tech Stack

### Backend
- **Python 3.11+** with **FastAPI 0.115** — async REST API
- **SQLAlchemy 2.0** — ORM with custom `GUID` type for MySQL UUID compatibility
- **MySQL 8.0** via `mysql-connector-python`
- **python-jose** — JWT token generation and verification
- **passlib + bcrypt** — secure password hashing
- **Pydantic v2** — request validation and response serialization
- **python-dotenv** — environment variable management

### Frontend
- **React 18** with **TypeScript** — type-safe component architecture
- **Vite 5** — lightning-fast dev server and production builds
- **Tailwind CSS** — utility-first styling
- **React Router v6** — client-side routing
- **Axios** — HTTP client with automatic JWT injection
- **Lucide React** — icon library
- **date-fns** — date formatting utilities

### Infrastructure
- **Railway** — single-service deployment (backend serves built React SPA)
- **Nixpacks** — zero-config build system
- **CORS** — configured for seamless dev ↔ production switching

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- MySQL 8.0+ running locally

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/team-task-manager.git
cd team-task-manager
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Update `backend/.env` with your MySQL credentials:

```env
DATABASE_URL=mysql+mysqlconnector://root:yourpassword@localhost:3306/taskmanager
JWT_SECRET=your-super-secret-key-change-this
PORT=3000
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
```

Create the database:

```sql
CREATE DATABASE IF NOT EXISTS taskmanager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Start the server — tables are auto-created on first run:

```bash
python -m uvicorn main:app --reload --port 3000
```

Interactive API docs: **http://localhost:3000/api/docs**

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

App is live at **http://localhost:5173** — all `/api` requests proxy to the backend automatically.

---

## Project Structure

```
team-task-manager/
│
├── backend/
│   ├── main.py                    # App entry point · table init · SPA serving
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── database.py            # Engine · session · GUID TypeDecorator
│       ├── models.py              # User · Project · ProjectMember · Task
│       ├── schemas.py             # Pydantic schemas (request + response)
│       ├── auth.py                # JWT utils · bcrypt hashing
│       ├── dependencies.py        # get_current_user dependency
│       └── routers/
│           ├── auth.py            # /signup · /login · /me
│           ├── projects.py        # Projects CRUD + member management
│           ├── tasks.py           # Task CRUD
│           ├── users.py           # User search
│           └── dashboard.py       # Aggregated stats
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Signup.tsx
│       │   ├── Dashboard.tsx      # Stats · My Tasks · Recent Tasks
│       │   ├── Projects.tsx       # Project list
│       │   └── ProjectDetail.tsx  # Tasks board + members panel
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── Navbar.tsx
│       │   ├── TaskCard.tsx
│       │   ├── CreateProjectModal.tsx
│       │   ├── CreateTaskModal.tsx
│       │   └── AddMemberModal.tsx
│       ├── context/               # AuthContext · useAuth hook
│       ├── api/                   # Axios instance with JWT interceptor
│       └── types/                 # TypeScript interfaces
│
├── railway.json                   # Railway build + start configuration
├── nixpacks.toml                  # Multi-phase build (Python + Node.js)
└── .gitignore
```

---

## API Reference

All endpoints are prefixed with `/api`. JWT token must be sent as `Authorization: Bearer <token>`.

### Authentication

| Method | Endpoint | Description | Protected |
|--------|----------|-------------|-----------|
| `POST` | `/auth/signup` | Register a new user | No |
| `POST` | `/auth/login` | Login · returns JWT token | No |
| `GET` | `/auth/me` | Get current user profile | Yes |

### Projects

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/projects/` | List user's projects | Any |
| `POST` | `/projects/` | Create a new project | Any |
| `GET` | `/projects/{id}` | Project detail + members | Any |
| `PUT` | `/projects/{id}` | Update name / description | Admin |
| `DELETE` | `/projects/{id}` | Delete project | Owner |

### Members

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/projects/{id}/members` | List members | Any |
| `POST` | `/projects/{id}/members` | Add member by email | Admin |
| `PUT` | `/projects/{id}/members/{uid}` | Change member role | Admin |
| `DELETE` | `/projects/{id}/members/{uid}` | Remove member | Admin |

### Tasks

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/projects/{id}/tasks` | List project tasks | Any |
| `POST` | `/projects/{id}/tasks` | Create a task | Admin |
| `PUT` | `/tasks/{id}` | Update task | Member+ |
| `DELETE` | `/tasks/{id}` | Delete task | Admin |

### Utilities

| Method | Endpoint | Description | Protected |
|--------|----------|-------------|-----------|
| `GET` | `/dashboard/` | Aggregated stats | Yes |
| `GET` | `/users/` | Search users by email | Yes |
| `GET` | `/health` | Health check | No |

> Full interactive docs with request/response examples: **`/api/docs`**

---

## Database Schema

```
┌─────────────────────────────────────────────────────────┐
│ users                                                   │
│  id · name · email (unique) · password_hash · created_at│
└───────────────────┬─────────────────────────────────────┘
                    │ owner_id / user_id
        ┌───────────▼────────────┐
        │ projects               │
        │  id · name · desc      │
        │  owner_id · timestamps │
        └──┬──────────────────┬──┘
           │ project_id       │ project_id
┌──────────▼──────┐   ┌───────▼──────────────────────────┐
│ project_members │   │ tasks                             │
│  id             │   │  id · title · description         │
│  project_id     │   │  project_id · assignee_id         │
│  user_id        │   │  created_by                       │
│  role           │   │  status (todo|in_progress|done)   │
│  joined_at      │   │  priority (low|medium|high)       │
└─────────────────┘   │  due_date · timestamps            │
                      └───────────────────────────────────┘
```

---

## Deployment on Railway

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "feat: initial TaskFlow implementation"
git remote add origin https://github.com/YOUR_USERNAME/team-task-manager.git
git branch -M main
git push -u origin main
```

### Step 2 — Create Railway Project

1. Go to [railway.app](https://railway.app) → sign in with GitHub
2. **New Project** → **Deploy from GitHub repo** → select your repo
3. Railway detects `railway.json` and starts the build automatically

### Step 3 — Add MySQL Database

1. In your Railway project → **+ New** → **Database** → **MySQL**
2. `DATABASE_URL` is injected into your service automatically — no action needed

### Step 4 — Set Environment Variables

In Railway → your service → **Variables**:

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | Long random string — generate with `openssl rand -hex 32` |
| `ENVIRONMENT` | `production` |
| `PORT` | `3000` |

### Step 5 — Generate Domain

**Settings** → **Networking** → **Generate Domain** → copy your live URL.

Update the **Live Demo** link at the top of this README.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | `mysql+mysqlconnector://user:pass@host:port/db` |
| `JWT_SECRET` | Yes | — | Secret key for signing JWT tokens |
| `PORT` | No | `3000` | Server listening port |
| `ENVIRONMENT` | No | `development` | `development` or `production` |
| `FRONTEND_URL` | No | — | CORS allowed origin (dev only) |

---

## Available Scripts

**Backend**
```bash
python -m uvicorn main:app --reload --port 3000   # development
python -m uvicorn main:app --host 0.0.0.0 --port 3000  # production
```

**Frontend**
```bash
npm run dev      # development server (localhost:5173)
npm run build    # production build → frontend/dist/
npm run preview  # preview production build locally
```

---

Built with FastAPI + React · Deployed on Railway
