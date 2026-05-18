import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, isPast } from 'date-fns'
import {
  CheckSquare, Clock, AlertCircle, CheckCircle, FolderKanban, ListTodo,
  Calendar, Plus, RefreshCw, Sparkles,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { DashboardData, Task } from '../types'

/* ── constants ─────────────────────────────────────────────────────────── */

const STATUS_STYLES: Record<string, string> = {
  todo: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
}
const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do', in_progress: 'In Progress', done: 'Done',
}
const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}
const STATUS_COLORS = ['#EAB308', '#3B82F6', '#22C55E']
const PRIORITY_COLORS = ['#22C55E', '#EAB308', '#EF4444']

/* ── animated counter hook ──────────────────────────────────────────────── */

function useCountUp(target: number, duration = 700) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    let startTime: number | null = null
    const step = (ts: number) => {
      if (!startTime) startTime = ts
      const pct = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - pct, 3)
      setVal(Math.round(eased * target))
      if (pct < 1) requestAnimationFrame(step)
    }
    const id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [target, duration])
  return val
}

/* ── StatCard ────────────────────────────────────────────────────────────── */

function StatCard({
  label, value, icon: Icon, color, bg, href,
}: {
  label: string; value: number; icon: React.ElementType
  color: string; bg: string; href?: string
}) {
  const count = useCountUp(value)
  const inner = (
    <div className={`group bg-white rounded-xl border border-gray-100 p-4 shadow-sm
      hover:shadow-lg hover:-translate-y-1 transition-all duration-200
      ${href ? 'cursor-pointer' : ''}`}>
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${bg} mb-3
        group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{count}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
  return href ? <Link to={href} className="block">{inner}</Link> : inner
}

/* ── skeleton ────────────────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-56 bg-gray-100 rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-28" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gray-100 rounded-xl h-64" />
        <div className="bg-gray-100 rounded-xl h-64" />
      </div>
    </div>
  )
}

/* ── StatusSelect ────────────────────────────────────────────────────────── */

function StatusSelect({
  task, onChange,
}: {
  task: Task
  onChange: (id: string, status: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBusy(true)
    try { await onChange(task.id, e.target.value) } finally { setBusy(false) }
  }
  return (
    <select
      value={task.status}
      onChange={handleChange}
      disabled={busy}
      className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none
        ${STATUS_STYLES[task.status]} ${busy ? 'opacity-50' : 'hover:opacity-80'}
        transition-opacity duration-150`}
    >
      <option value="todo">To Do</option>
      <option value="in_progress">In Progress</option>
      <option value="done">Done</option>
    </select>
  )
}

/* ── TaskRow ─────────────────────────────────────────────────────────────── */

function TaskRow({
  task, interactive = false, onStatusChange,
}: {
  task: Task; interactive?: boolean
  onStatusChange?: (id: string, status: string) => Promise<void>
}) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done'
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0 gap-3
      hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors duration-150">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.project && (
            <Link to={`/projects/${task.project.id}`} className="text-xs text-indigo-600 hover:underline">
              {task.project.name}
            </Link>
          )}
          {task.due_date && (
            <span className={`flex items-center gap-0.5 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
              <Calendar className="h-3 w-3" />
              {format(new Date(task.due_date), 'MMM d')}
              {isOverdue && ' · overdue'}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority}
        </span>
        {interactive && onStatusChange
          ? <StatusSelect task={task} onChange={onStatusChange} />
          : (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[task.status]}`}>
              {STATUS_LABELS[task.status]}
            </span>
          )}
      </div>
    </div>
  )
}

/* ── Dashboard ───────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboard = useCallback(async () => {
    const res = await api.get('/dashboard/')
    setData(res.data)
  }, [])

  useEffect(() => {
    fetchDashboard().finally(() => setLoading(false))
  }, [fetchDashboard])

  const handleRefresh = async () => {
    setRefreshing(true)
    try { await fetchDashboard() } finally { setRefreshing(false) }
  }

  const handleStatusChange = async (taskId: string, status: string) => {
    await api.put(`/tasks/${taskId}`, { status })
    await fetchDashboard()
  }

  if (loading) return <Skeleton />

  const completionPct = data && data.total_tasks > 0
    ? Math.round((data.done_count / data.total_tasks) * 100) : 0

  const statusChartData = [
    { name: 'To Do', value: data?.todo_count ?? 0 },
    { name: 'In Progress', value: data?.in_progress_count ?? 0 },
    { name: 'Done', value: data?.done_count ?? 0 },
  ]
  const priorityChartData = [
    { name: 'Low', value: data?.low_count ?? 0 },
    { name: 'Medium', value: data?.medium_count ?? 0 },
    { name: 'High', value: data?.high_count ?? 0 },
  ]

  const stats = [
    { label: 'Total Tasks', value: data?.total_tasks ?? 0, icon: CheckSquare, color: 'text-gray-600', bg: 'bg-gray-50', href: '/projects' },
    { label: 'To Do', value: data?.todo_count ?? 0, icon: ListTodo, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'In Progress', value: data?.in_progress_count ?? 0, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Done', value: data?.done_count ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Overdue', value: data?.overdue_count ?? 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Projects', value: data?.projects_count ?? 0, icon: FolderKanban, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/projects' },
  ]

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's an overview of your work</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Completion bar */}
          {data && data.total_tasks > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500 mb-1">Completion</p>
              <div className="flex items-center gap-2">
                <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-700"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-green-600">{completionPct}%</span>
              </div>
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100
              transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* New Project */}
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm
              font-medium px-3 py-2 rounded-lg hover:bg-indigo-700 active:scale-95
              transition-all duration-150 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* ── Get Started banner (no projects yet) ── */}
      {data && data.projects_count === 0 && (
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50
          rounded-xl border border-indigo-100 p-6 flex items-center gap-5 flex-wrap">
          <div className="hidden sm:flex items-center justify-center w-12 h-12
            bg-indigo-100 rounded-xl shrink-0">
            <Sparkles className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900">Create your first project</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Invite your team, assign tasks, and track progress — all in one place.
            </p>
          </div>
          <Link
            to="/projects"
            className="shrink-0 inline-flex items-center gap-1.5 bg-indigo-600 text-white
              text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700
              active:scale-95 transition-all duration-150 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Get started
          </Link>
        </div>
      )}

      {/* ── Charts (only when tasks exist) ── */}
      {data && data.total_tasks > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6
            hover:shadow-md transition-shadow duration-200">
            <h2 className="font-semibold text-gray-900 mb-4">Task Status Distribution</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={88}
                  paddingAngle={3} dataKey="value"
                  animationBegin={0} animationDuration={600}
                >
                  {statusChartData.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v, 'Tasks']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6
            hover:shadow-md transition-shadow duration-200">
            <h2 className="font-semibold text-gray-900 mb-4">Tasks by Priority</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityChartData} barSize={52}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [v, 'Tasks']} cursor={{ fill: '#f3f4f6' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} animationBegin={0} animationDuration={600}>
                  {priorityChartData.map((_, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Task lists ── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* My Tasks */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div>
              <h2 className="font-semibold text-gray-900">My Tasks</h2>
              <p className="text-xs text-gray-400 mt-0.5">Click a status badge to update</p>
            </div>
            <Link to="/projects" className="text-xs text-indigo-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="px-6 py-2">
            {data?.my_tasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-10 w-10 text-green-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">All caught up!</p>
                <p className="text-xs text-gray-400 mt-1">No pending tasks assigned to you</p>
              </div>
            ) : (
              data?.my_tasks.map((task) => (
                <TaskRow key={task.id} task={task} interactive onStatusChange={handleStatusChange} />
              ))
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm
          hover:shadow-md transition-shadow duration-200">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Recent Tasks</h2>
          </div>
          <div className="px-6 py-2">
            {data?.recent_tasks.length === 0 ? (
              <div className="text-center py-8">
                <ListTodo className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">No tasks yet</p>
                <p className="text-xs text-gray-400 mt-1">Create a project to get started</p>
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-1 mt-3 text-xs text-indigo-600
                    hover:underline font-medium"
                >
                  <Plus className="h-3 w-3" /> Create a project
                </Link>
              </div>
            ) : (
              data?.recent_tasks.map((task) => <TaskRow key={task.id} task={task} />)
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
