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
  todo: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
}
const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do', in_progress: 'In Progress', done: 'Done',
}
const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
}
const STATUS_COLORS = ['#F59E0B', '#3B82F6', '#10B981']
const PRIORITY_COLORS = ['#10B981', '#F59E0B', '#EF4444']

const STAT_CONFIG = [
  { label: 'Total Tasks',  key: 'total_tasks',      icon: CheckSquare, from: 'from-slate-500',   to: 'to-slate-700',   href: '/projects' },
  { label: 'To Do',        key: 'todo_count',        icon: ListTodo,    from: 'from-amber-400',   to: 'to-orange-500' },
  { label: 'In Progress',  key: 'in_progress_count', icon: Clock,       from: 'from-blue-400',    to: 'to-indigo-600' },
  { label: 'Done',         key: 'done_count',        icon: CheckCircle, from: 'from-emerald-400', to: 'to-green-600' },
  { label: 'Overdue',      key: 'overdue_count',     icon: AlertCircle, from: 'from-red-400',     to: 'to-rose-600' },
  { label: 'Projects',     key: 'projects_count',    icon: FolderKanban,from: 'from-violet-400',  to: 'to-purple-600', href: '/projects' },
] as const

/* ── animated counter ───────────────────────────────────────────────────── */

function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    let t0: number | null = null
    const step = (ts: number) => {
      if (!t0) t0 = ts
      const p = Math.min((ts - t0) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(step)
    }
    const id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [target, duration])
  return val
}

/* ── StatCard ────────────────────────────────────────────────────────────── */

function StatCard({
  label, value, icon: Icon, from, to, href,
}: {
  label: string; value: number; icon: React.ElementType
  from: string; to: string; href?: string
}) {
  const count = useCountUp(value)
  const inner = (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${from} ${to}
      p-5 shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-95
      transition-all duration-200 cursor-pointer`}>
      {/* faint background circle */}
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-6 w-28 h-28 rounded-full bg-white/10" />

      <Icon className="h-6 w-6 text-white/80 mb-3 relative z-10" />
      <div className="text-3xl font-extrabold text-white relative z-10">{count}</div>
      <div className="text-sm text-white/70 mt-0.5 relative z-10">{label}</div>
    </div>
  )
  return href ? <Link to={href} className="block">{inner}</Link> : inner
}

/* ── skeleton ────────────────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-24 bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl h-28" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gray-100 rounded-2xl h-64" />
        <div className="bg-gray-100 rounded-2xl h-64" />
      </div>
    </div>
  )
}

/* ── StatusSelect ────────────────────────────────────────────────────────── */

function StatusSelect({ task, onChange }: {
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

function TaskRow({ task, interactive = false, onStatusChange }: {
  task: Task; interactive?: boolean
  onStatusChange?: (id: string, status: string) => Promise<void>
}) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done'
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0 gap-3
      hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors duration-150 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.project && (
            <Link to={`/projects/${task.project.id}`} className="text-xs text-indigo-500 hover:underline">
              {task.project.name}
            </Link>
          )}
          {task.due_date && (
            <span className={`flex items-center gap-0.5 text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
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

/* ── EmptyChart ──────────────────────────────────────────────────────────── */

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[220px] text-gray-300">
      <div className="flex items-end gap-2 mb-3">
        {[40, 70, 30, 55, 20].map((h, i) => (
          <div key={i} className="w-6 bg-gray-100 rounded-t" style={{ height: h }} />
        ))}
      </div>
      <p className="text-xs text-gray-400">{message}</p>
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

  const hasChartData = (data?.total_tasks ?? 0) > 0

  return (
    <div className="space-y-8">

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700
        rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        {/* decorative circles */}
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full" />
        <div className="absolute right-20 -bottom-14 w-64 h-64 bg-white/5 rounded-full" />

        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-indigo-200 mt-1 text-sm">Here's an overview of your work</p>

            {data && data.total_tasks > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <div className="w-40 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{completionPct}% complete</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white
                transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="inline-flex items-center gap-1.5 bg-white text-indigo-700
                text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-50
                active:scale-95 transition-all duration-150 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAT_CONFIG.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={(data as Record<string, number> | null)?.[s.key] ?? 0}
            icon={s.icon}
            from={s.from}
            to={s.to}
            href={'href' in s ? s.href : undefined}
          />
        ))}
      </div>

      {/* ── Get Started banner ── */}
      {data && data.projects_count === 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50
          rounded-2xl border border-amber-100 p-6 flex items-center gap-5 flex-wrap">
          <div className="hidden sm:flex items-center justify-center w-12 h-12
            bg-amber-100 rounded-xl shrink-0">
            <Sparkles className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900">Create your first project</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Invite your team, assign tasks, and track progress — all in one place.
            </p>
          </div>
          <Link
            to="/projects"
            className="shrink-0 inline-flex items-center gap-1.5 bg-amber-500 text-white
              text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-amber-600
              active:scale-95 transition-all duration-150 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Get started
          </Link>
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6
          hover:shadow-md transition-shadow duration-200">
          <h2 className="font-semibold text-gray-900 mb-1">Task Status</h2>
          <p className="text-xs text-gray-400 mb-4">Distribution across all your projects</p>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusChartData} cx="50%" cy="50%"
                  innerRadius={60} outerRadius={88}
                  paddingAngle={3} dataKey="value"
                  animationBegin={0} animationDuration={700}
                >
                  {statusChartData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [v, 'Tasks']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Create tasks to see your status breakdown" />
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6
          hover:shadow-md transition-shadow duration-200">
          <h2 className="font-semibold text-gray-900 mb-1">Priority Breakdown</h2>
          <p className="text-xs text-gray-400 mb-4">How tasks are distributed by priority</p>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityChartData} barSize={52}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [v, 'Tasks']} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} animationBegin={0} animationDuration={700}>
                  {priorityChartData.map((_, i) => <Cell key={i} fill={PRIORITY_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Create tasks to see your priority breakdown" />
          )}
        </div>
      </div>

      {/* ── Task lists ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm
          hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div>
              <h2 className="font-semibold text-gray-900">My Tasks</h2>
              <p className="text-xs text-gray-400 mt-0.5">Click status badge to update instantly</p>
            </div>
            <Link to="/projects" className="text-xs text-indigo-600 hover:underline font-medium">
              View all →
            </Link>
          </div>
          <div className="px-6 py-2">
            {data?.my_tasks.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-gray-700">All caught up!</p>
                <p className="text-xs text-gray-400 mt-1">No pending tasks assigned to you</p>
              </div>
            ) : (
              data?.my_tasks.map((task) => (
                <TaskRow key={task.id} task={task} interactive onStatusChange={handleStatusChange} />
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm
          hover:shadow-md transition-shadow duration-200">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Recent Tasks</h2>
          </div>
          <div className="px-6 py-2">
            {data?.recent_tasks.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <ListTodo className="h-6 w-6 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No tasks yet</p>
                <p className="text-xs text-gray-400 mt-1">Create a project to get started</p>
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-1 mt-3 text-xs bg-indigo-600
                    text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-medium
                    transition-colors"
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
