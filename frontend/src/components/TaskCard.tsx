import { format, isPast } from 'date-fns'
import { Calendar, User, Pencil, Trash2 } from 'lucide-react'
import type { Task } from '../types'

const STATUS_STYLES: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}

interface TaskCardProps {
  task: Task
  isAdmin: boolean
  onStatusChange?: (taskId: string, status: Task['status']) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
}

export default function TaskCard({ task, isAdmin, onStatusChange, onEdit, onDelete }: TaskCardProps) {
  const isOverdue =
    task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">{task.title}</h3>
          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit?.(task)}
              className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete?.(task.id)}
              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {/* Status dropdown */}
        <select
          value={task.status}
          onChange={(e) => onStatusChange?.(task.id, e.target.value as Task['status'])}
          className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATUS_STYLES[task.status]}`}
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </span>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        {task.assignee ? (
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            <span>{task.assignee.name}</span>
          </div>
        ) : (
          <span className="text-gray-400 italic">Unassigned</span>
        )}

        {task.due_date && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
