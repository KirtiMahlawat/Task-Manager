export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

export interface Project {
  id: string
  name: string
  description?: string
  owner_id: string
  role: 'admin' | 'member'
  created_at: string
  updated_at: string
  task_count?: number
  member_count?: number
}

export interface ProjectDetail extends Project {
  members: Member[]
}

export interface Member {
  user_id: string
  name: string
  email: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  project_id: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  due_date?: string
  assignee?: { id: string; name: string; email: string }
  creator?: { id: string; name: string }
  created_at: string
  updated_at: string
  project?: { id: string; name: string }
}

export interface DashboardData {
  total_tasks: number
  todo_count: number
  in_progress_count: number
  done_count: number
  overdue_count: number
  projects_count: number
  my_tasks: Task[]
  recent_tasks: Task[]
}
