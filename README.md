# TaskFlow — Team Task Manager

A full-stack web application for managing projects, assigning tasks, and tracking team progress with role-based access control.

## Live Demo
> Deploy to Railway (see Deployment section below) and add your live URL here.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python · FastAPI · SQLAlchemy · MySQL |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS |
| Auth | JWT (python-jose) · bcrypt (passlib) |
| Deployment | Railway |

## Features

- **Authentication** — Signup / Login with JWT tokens (7-day expiry)
- **Projects** — Create, view, update, and delete projects
- **Team Management** — Add members by email, assign roles (Admin / Member)
- **Tasks** — Create tasks with title, description, status, priority, assignee, and due date
- **Role-based Access**
  - **Admin** — Full control: manage tasks, members, and project settings
  - **Member** — View tasks and update task status
- **Dashboard** — Overview of task stats, my assigned tasks, and recent activity
- **Overdue Detection** — Tasks past their due date are highlighted in red

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL 8.0+ (running locally)

### 1. Clone and set up the backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env`:
```
DATABASE_URL=mysql+pymysql://root:yourpassword@localhost:3306/taskmanager
JWT_SECRET=your-super-secret-key-change-this
PORT=3000
ENVIRONMENT=development
```

Create the database:
```bash
mysql -u root -p -e "CREATE DATABASE taskmanager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Start the backend (tables are auto-created on startup):
```bash
cd backend
python -m uvicorn main:app --reload --port 3000
```

API docs available at: http://localhost:3000/api/docs

### 2. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173 (proxies `/api` calls to the backend)

---

## Deployment on Railway

### Step 1: Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project** → **Deploy from GitHub repo**
3. Select this repository

### Step 2: Add MySQL

1. In your Railway project, click **+ New** → **Database** → **Add MySQL**
2. Railway automatically sets the `DATABASE_URL` environment variable (format: `mysql://...`)
3. The backend auto-converts it to `mysql+pymysql://...` on startup

### Step 3: Set environment variables

In Railway → your service → **Variables**, add:

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | A long random string (e.g. generate with `openssl rand -hex 32`) |
| `ENVIRONMENT` | `production` |
| `PORT` | `3000` |

### Step 4: Deploy

Railway will automatically use `railway.json` to:
1. Install Python + Node.js dependencies
2. Build the React frontend
3. Start the FastAPI backend (which serves the built frontend as static files)

---

## Project Structure

```
team-task-manager/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── database.py         # SQLAlchemy engine + session
│       ├── models.py           # ORM models (User, Project, Task, Member)
│       ├── schemas.py          # Pydantic request/response schemas
│       ├── auth.py             # JWT + bcrypt utilities
│       ├── dependencies.py     # FastAPI dependency injection
│       └── routers/
│           ├── auth.py         # POST /signup, /login · GET /me
│           ├── projects.py     # Projects + members + project tasks
│           ├── tasks.py        # Individual task CRUD
│           ├── users.py        # User search
│           └── dashboard.py    # Aggregated stats
├── frontend/
│   └── src/
│       ├── pages/              # Login, Signup, Dashboard, Projects, ProjectDetail
│       ├── components/         # Layout, Navbar, TaskCard, Modals
│       ├── context/            # Auth context + hook
│       ├── api/                # Axios client with JWT interceptor
│       └── types/              # TypeScript interfaces
├── railway.json                # Railway build + start config
└── nixpacks.toml               # Nixpacks build phases
```

## API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/signup` | Register new user | — |
| POST | `/api/auth/login` | Login, get JWT token | — |
| GET | `/api/auth/me` | Get current user | ✓ |
| GET | `/api/projects/` | List user's projects | ✓ |
| POST | `/api/projects/` | Create project | ✓ |
| GET | `/api/projects/{id}` | Project detail + members | ✓ |
| PUT | `/api/projects/{id}` | Update project | Admin |
| DELETE | `/api/projects/{id}` | Delete project | Owner |
| GET | `/api/projects/{id}/members` | List members | ✓ |
| POST | `/api/projects/{id}/members` | Add member by email | Admin |
| DELETE | `/api/projects/{id}/members/{uid}` | Remove member | Admin |
| PUT | `/api/projects/{id}/members/{uid}` | Update member role | Admin |
| GET | `/api/projects/{id}/tasks` | List project tasks | ✓ |
| POST | `/api/projects/{id}/tasks` | Create task | Admin |
| PUT | `/api/tasks/{id}` | Update task | Member |
| DELETE | `/api/tasks/{id}` | Delete task | Admin |
| GET | `/api/dashboard/` | Dashboard stats | ✓ |
| GET | `/api/users/` | Search users | ✓ |

Full interactive API docs: `/api/docs`

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✓ | PostgreSQL connection string |
| `JWT_SECRET` | ✓ | Secret key for signing JWT tokens |
| `PORT` | — | Server port (default: 3000) |
| `ENVIRONMENT` | — | `development` or `production` |

---

Made with FastAPI + React 
