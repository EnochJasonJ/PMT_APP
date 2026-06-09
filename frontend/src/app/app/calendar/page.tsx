"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  Plus
} from "lucide-react"
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday
} from "date-fns"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import Modal from "@/components/ui/Modal"
import TaskDetailModal from "@/components/tasks/TaskDetailModal"
import { useAuthStore } from "@/store/authStore"

export default function CalendarPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.roles?.some((role: any) => role.name.toLowerCase() === "admin")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleProject, setScheduleProject] = useState("")
  const [scheduleSprint, setScheduleSprint] = useState("")

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", isAdmin, user?.id],
    queryFn: async () => {
      const res = await api.get("/tasks/")
      // Members only see their own assigned tasks on the calendar.
      if (!isAdmin) return res.data.filter((t: any) => t.assignees?.some((a: any) => a.id === user?.id))
      return res.data
    }
  })

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get("/projects/")).data
  })

  const { data: scheduleSprints } = useQuery({
    queryKey: ["sprints", scheduleProject],
    queryFn: async () => (await api.get(`/sprints/project/${scheduleProject}`)).data,
    enabled: !!scheduleProject
  })
  const activeScheduleSprints = (scheduleSprints || []).filter((s: any) => s.status !== "COMPLETED")

  const scheduleMutation = useMutation({
    mutationFn: async (data: any) => (await api.post("/tasks/", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      setScheduleOpen(false)
      toast.success("Task scheduled")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to schedule task")
    }
  })

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#459a8c] rounded-xl flex items-center justify-center shadow-lg shadow-[#459a8c]/20">
            <CalendarIcon className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Global Event Timeline</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-100 rounded-xl p-1">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-[#1e293b]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:text-[#1e293b]"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-[#1e293b]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={() => setScheduleOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#459a8c] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#459a8c]/20 hover:bg-[#3b8277] transition-all"
            >
              <Plus className="w-4 h-4" />
              Schedule
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{day}</span>
          </div>
        ))}
      </div>
    )
  }

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate,
    })

    return (
      <div className="grid grid-cols-7 bg-slate-100/50 border border-slate-100 rounded-3xl overflow-hidden gap-[1px]">
        {calendarDays.map((day, i) => {
          const dayTasks = tasks?.filter((task: any) => {
            const raw = task.due_date || task.created_at
            if (!raw) return false
            // Force local-midnight parsing for date-only strings to avoid UTC off-by-one.
            const taskDate = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(raw + "T00:00:00") : new Date(raw)
            return isSameDay(day, taskDate)
          }) || []

          return (
            <div 
              key={i}
              className={cn(
                "min-h-[140px] bg-white p-4 transition-all hover:bg-slate-50/50 group",
                !isSameMonth(day, monthStart) && "bg-slate-50/30 grayscale-[0.5] opacity-50"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={cn(
                  "text-sm font-black",
                  isToday(day) ? "w-7 h-7 bg-[#459a8c] text-white rounded-full flex items-center justify-center shadow-md shadow-[#459a8c]/20" : "text-slate-400 group-hover:text-[#1e293b]"
                )}>
                  {format(day, "d")}
                </span>
                {dayTasks.length > 0 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#459a8c]"></div>
                )}
              </div>

              <div className="space-y-1.5">
                {dayTasks.slice(0, 3).map((task: any) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedTask(task)}
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-[9px] font-bold border cursor-pointer transition-all",
                      task.priority === 'high' 
                        ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100" 
                        : "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                    )}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className={cn("w-1 h-1 rounded-full", task.priority === 'high' ? "bg-rose-500" : "bg-emerald-500")}></div>
                      <span className="truncate">{task.title}</span>
                    </div>
                  </motion.div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[9px] font-black text-slate-300 pl-2">
                    + {dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="p-8">
      {renderHeader()}
      {renderDays()}
      {renderCells()}

      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
      />

      <Modal isOpen={scheduleOpen} onClose={() => { setScheduleOpen(false); setScheduleProject(""); setScheduleSprint("") }} title="Schedule Task">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            scheduleMutation.mutate({
              title: fd.get("title") as string,
              project_id: Number(scheduleProject),
              due_date: (fd.get("due_date") as string) || null,
              priority: fd.get("priority") as string,
              sprint_id: scheduleSprint ? Number(scheduleSprint) : null,
            })
          }}
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Title</label>
            <input name="title" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Prepare release notes" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Project</label>
            <select
              required
              value={scheduleProject}
              onChange={(e) => { setScheduleProject(e.target.value); setScheduleSprint("") }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="" disabled>Select a project</option>
              {projects?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Sprint <span className="text-slate-400 font-normal">(optional)</span></label>
            <select
              value={scheduleSprint}
              onChange={(e) => setScheduleSprint(e.target.value)}
              disabled={!scheduleProject}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{!scheduleProject ? "Select a project first" : "Backlog (no sprint)"}</option>
              {activeScheduleSprints.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Due Date</label>
              <input name="due_date" type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Priority</label>
              <select name="priority" defaultValue="MEDIUM" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setScheduleOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button type="submit" disabled={scheduleMutation.isPending} className="px-4 py-2 text-sm font-semibold text-white bg-[#459a8c] hover:bg-[#3b8277] rounded-lg disabled:opacity-50">
              {scheduleMutation.isPending ? "Scheduling..." : "Schedule"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
