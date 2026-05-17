import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Plus, Users, ChevronRight, Trash2, Crown, UserMinus, ShieldCheck, Shield } from 'lucide-react'
import api from '../api/client'
import type { ProjectDetail as ProjectDetailType, Task, Member } from '../types'
import TaskCard from '../components/TaskCard'
import CreateTaskModal from '../components/CreateTaskModal'
import AddMemberModal from '../components/AddMemberModal'
import { useAuth } from '../context/AuthContext'

type StatusFilter = 'all' | 'todo' | 'in_progress' | 'done'

const STATUS_LABELS: Record<string, string> = { all: 'All', todo: 'To Do', in_progress: 'In Progress', done: 'Done' }

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [project, setProject] = useState<ProjectDetailType | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'tasks' | 'members'>('tasks')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([api.get(`/projects/${id}`), api.get(`/projects/${id}/tasks`)])
      .then(([pRes, tRes]) => {
        setProject(pRes.data)
        setTasks(tRes.data)
      })
      .catch(() => navigate('/projects'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const isAdmin = project?.role === 'admin'
  const isOwner = project?.owner_id === user?.id

  const filteredTasks =
    statusFilter === 'all' ? tasks : tasks.filter((t) => t.status === statusFilter)

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    try {
      const { data } = await api.put(`/tasks/${taskId}`, { status })
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...data } : t)))
    } catch {
      // silently fail
    }
  }

  const handleTaskSaved = (task: Task) => {
    if (editingTask) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
      setEditingTask(null)
    } else {
      setTasks((prev) => [task, ...prev])
      setShowCreateTask(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task? This cannot be undone.')) return
    setDeletingId(taskId)
    try {
      await api.delete(`/tasks/${taskId}`)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteProject = async () => {
    if (!confirm(`Delete project "${project?.name}"? All tasks will be permanently removed.`)) return
    await api.delete(`/projects/${id}`)
    navigate('/projects')
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the project?')) return
    await api.delete(`/projects/${id}/members/${userId}`)
    setProject((prev) =>
      prev ? { ...prev, members: prev.members.filter((m) => m.user_id !== userId) } : prev
    )
  }

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    const { data } = await api.put(`/projects/${id}/members/${userId}`, { role })
    setProject((prev) =>
      prev
        ? { ...prev, members: prev.members.map((m) => (m.user_id === userId ? { ...m, role: data.role } : m)) }
        : prev
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link to="/projects" className="hover:text-indigo-600 transition-colors">
          Projects
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">{project.name}</span>
      </nav>

      {/* Project Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {project.role}
              </span>
            </div>
            {project.description && <p className="text-gray-500 text-sm">{project.description}</p>}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <span className="font-medium text-gray-700">{tasks.length}</span> tasks
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium text-gray-700">{project.members.length}</span> members
              </span>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={handleDeleteProject}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['tasks', 'members'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'tasks' ? `Tasks (${tasks.length})` : `Members (${project.members.length})`}
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {/* Status Filter */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {(['all', 'todo', 'in_progress', 'done'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {STATUS_LABELS[s]}
                  {s !== 'all' && (
                    <span className="ml-1.5 text-gray-400">
                      {tasks.filter((t) => t.status === s).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowCreateTask(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            )}
          </div>

          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-12">
              <p className="text-gray-400 text-sm">
                {statusFilter === 'all' ? 'No tasks yet.' : `No ${STATUS_LABELS[statusFilter].toLowerCase()} tasks.`}
                {isAdmin && statusFilter === 'all' && (
                  <button
                    onClick={() => setShowCreateTask(true)}
                    className="ml-1 text-indigo-600 hover:underline"
                  >
                    Create the first one.
                  </button>
                )}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTasks.map((task) => (
                <div key={task.id} className={deletingId === task.id ? 'opacity-50 pointer-events-none' : ''}>
                  <TaskCard
                    task={task}
                    isAdmin={isAdmin ?? false}
                    onStatusChange={handleStatusChange}
                    onEdit={(t) => setEditingTask(t)}
                    onDelete={handleDeleteTask}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{project.members.length} member{project.members.length !== 1 ? 's' : ''}</p>
            {isAdmin && (
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Member
              </button>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {project.members.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center font-medium text-indigo-700 text-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900">{member.name}</span>
                      {member.user_id === project.owner_id && (
                        <Crown className="h-3.5 w-3.5 text-yellow-500" title="Owner" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{member.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && member.user_id !== project.owner_id ? (
                    <>
                      <button
                        onClick={() => handleRoleChange(member.user_id, member.role === 'admin' ? 'member' : 'admin')}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        title={`Change to ${member.role === 'admin' ? 'member' : 'admin'}`}
                      >
                        {member.role === 'admin' ? <Shield className="h-3.5 w-3.5 text-indigo-500" /> : <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />}
                        <span className="capitalize">{member.role}</span>
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove member"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        member.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {member.role}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {(showCreateTask || editingTask) && (
        <CreateTaskModal
          projectId={id!}
          members={project.members}
          editTask={editingTask}
          onClose={() => {
            setShowCreateTask(false)
            setEditingTask(null)
          }}
          onSaved={handleTaskSaved}
        />
      )}
      {showAddMember && (
        <AddMemberModal
          projectId={id!}
          onClose={() => setShowAddMember(false)}
          onAdded={(member: Member) => {
            setProject((prev) =>
              prev ? { ...prev, members: [...prev.members, member] } : prev
            )
            setShowAddMember(false)
          }}
        />
      )}
    </div>
  )
}
