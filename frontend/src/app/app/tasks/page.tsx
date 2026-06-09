"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import {
  Plus, Calendar, MoreHorizontal, LayoutGrid, List as ListIcon,
  Layers, AlertTriangle, Clock, ChevronDown, Check
} from "lucide-react"
import { format, isBefore, startOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import Modal from "@/components/ui/Modal"
import Button from "@/components/ui/Button"
import TaskDetailModal from "@/components/tasks/TaskDetailModal"

const boardColumns = [
  { id: "PROPOSED", title: "Proposals", color: "bg-amber-400" },
  { id: "TODO", title: "Yet to Start", color: "bg-slate-400" },
  { id: "IN_PROGRESS", title: "In Progress", color: "bg-status-progress" },
  { id: "IN_REVIEW", title: "Risk / Dependency", color: "bg-status-risk" },
  { id: "DONE", title: "Completed", color: "bg-status-completed" },
]

const statusLabel: Record<string, string> = {
  PROPOSED: "Proposed", TODO: "Yet to Start", IN_PROGRESS: "In Progress", IN_REVIEW: "Risk / Dependency", DONE: "Completed"
}
// Inline colors (bg alpha + saturated text) so they read on BOTH light and dark
// without depending on the fragile dark-mode CSS remap.
const statusBadgeStyle: Record<string, { backgroundColor: string; color: string }> = {
  PROPOSED:    { backgroundColor: "rgba(245, 158, 11, 0.18)", color: "#f59e0b" },
  TODO:        { backgroundColor: "rgba(56, 189, 248, 0.18)", color: "#0ea5e9" },
  IN_PROGRESS: { backgroundColor: "rgba(139, 92, 246, 0.18)", color: "#8b5cf6" },
  IN_REVIEW:   { backgroundColor: "rgba(249, 115, 22, 0.18)", color: "#f97316" },
  DONE:        { backgroundColor: "rgba(16, 185, 129, 0.18)", color: "#10b981" },
}
const priorityBadgeStyle: Record<string, { backgroundColor: string; color: string }> = {
  HIGH:   { backgroundColor: "rgba(244, 63, 94, 0.18)", color: "#f43f5e" },
  MEDIUM: { backgroundColor: "rgba(99, 102, 241, 0.18)", color: "#818cf8" },
  LOW:    { backgroundColor: "rgba(100, 116, 139, 0.18)", color: "#94a3b8" },
}
const priorityRank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

const STATUS_OPTIONS = [
  { value: "PROPOSED", label: "Proposed" },
  { value: "TODO", label: "Yet to Start" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "Risk / Dependency" },
  { value: "DONE", label: "Completed" },
]
const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
]

type BadgeOption = { value: string; label: string }
type BadgeStyle = { backgroundColor: string; color: string }

function BadgeDropdown({
  value, options, styleMap, onChange, uppercase,
}: {
  value: string
  options: BadgeOption[]
  styleMap: Record<string, BadgeStyle>
  onChange: (v: string) => void
  uppercase?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onScroll = () => setOpen(false)
    window.addEventListener("mousedown", onDocClick)
    window.addEventListener("scroll", onScroll, true)
    return () => {
      window.removeEventListener("mousedown", onDocClick)
      window.removeEventListener("scroll", onScroll, true)
    }
  }, [open])

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setCoords({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 180) })
    }
    setOpen(o => !o)
  }

  const current = styleMap[value] || { backgroundColor: "rgba(100,116,139,0.18)", color: "#94a3b8" }
  const currentLabel = options.find(o => o.value === value)?.label ?? value

  return (
    <div ref={wrapRef} onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        style={current}
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md transition-all hover:brightness-110 cursor-pointer",
          uppercase && "uppercase font-black"
        )}
      >
        {currentLabel}
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 60 }}
            className="bg-white dark:bg-[#1e2532] border border-slate-100 rounded-xl shadow-xl shadow-slate-900/10 p-1.5 overflow-hidden"
          >
            {options.map(opt => {
              const st = styleMap[opt.value] || current
              const active = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChange(opt.value); setOpen(false) }}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-left transition-colors",
                    active ? "bg-slate-50" : "hover:bg-slate-50"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />
                    <span className={cn("text-xs font-bold text-[#1e293b]", uppercase && "uppercase")} style={{ color: st.color }}>
                      {opt.label}
                    </span>
                  </span>
                  {active && <Check className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function isTaskOverdue(task: any) {
  return task.due_date && task.status !== "DONE" && task.status !== "PROPOSED" && isBefore(new Date(task.due_date + "T00:00:00"), startOfDay(new Date()))
}

export default function BoardPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.roles?.some(role => role.name.toLowerCase() === "admin")
  const assigneeFilter = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("assignee")
    : null

  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [selectedProject, setSelectedProject] = useState<string>("All")
  const [view, setView] = useState<"board" | "list">("board")
  const [groupBy, setGroupBy] = useState<"none" | "assignee" | "priority">("none")
  const [dragTaskId, setDragTaskId] = useState<number | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)
  const [newTask, setNewTask] = useState<{
    title: string; description: string; status: string; priority: string;
    project_id: string; sprint_id: string; assignee_ids: number[]; start_date: string; due_date: string
  }>({
    title: "", description: "", status: "TODO", priority: "MEDIUM", project_id: "", sprint_id: "", assignee_ids: [], start_date: "", due_date: ""
  })
  // Teams toggled in the create modal (UI helper that bulk-adds their members as assignees).
  const [taskTeams, setTaskTeams] = useState<number[]>([])

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get("/projects/")).data
  })

  const { data: allTeams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await api.get("/teams/")).data
  })

  // Eligible teams/members are scoped to the chosen project only.
  const selectedProj = projects?.find((p: any) => String(p.id) === newTask.project_id)
  const projectTeams = (allTeams || []).filter((t: any) =>
    selectedProj?.teams?.some((pt: any) => pt.id === t.id)
  )
  const eligibleMembers: any[] = (() => {
    const map = new Map<number, any>()
    selectedProj?.members?.forEach((m: any) => map.set(m.id, m))
    projectTeams.forEach((t: any) => t.members?.forEach((m: any) => map.set(m.id, m)))
    return Array.from(map.values())
  })()

  const toggleAssignee = (id: number) => setNewTask(s => ({
    ...s, assignee_ids: s.assignee_ids.includes(id) ? s.assignee_ids.filter(x => x !== id) : [...s.assignee_ids, id]
  }))
  const toggleTaskTeam = (team: any) => {
    const memberIds: number[] = (team.members || []).map((m: any) => m.id)
    const isOn = taskTeams.includes(team.id)
    setTaskTeams(s => isOn ? s.filter(x => x !== team.id) : [...s, team.id])
    setNewTask(s => ({
      ...s,
      assignee_ids: isOn
        ? s.assignee_ids.filter(id => !memberIds.includes(id))
        : Array.from(new Set([...s.assignee_ids, ...memberIds])),
    }))
  }

  const { data: modalSprints } = useQuery({
    queryKey: ["sprints", newTask.project_id],
    queryFn: async () => (await api.get(`/sprints/project/${newTask.project_id}`)).data,
    enabled: !!newTask.project_id
  })
  const activeSprints = (modalSprints || []).filter((s: any) => s.status !== "completed")

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", selectedProject, isAdmin, user?.id, assigneeFilter],
    queryFn: async () => {
      const res = await api.get("/tasks/")
      if (!isAdmin) {
        return res.data.filter((t: any) =>
          t.assignees?.some((a: any) => a.id === user?.id) ||
          (t.status === "PROPOSED" && t.reporter_id === user?.id)
        )
      }
      let data = res.data
      if (assigneeFilter) {
        data = data.filter((t: any) => t.assignees?.some((a: any) => a.id === Number(assigneeFilter)))
      }
      if (selectedProject === "All") return data
      return data.filter((t: any) => t.project_name === selectedProject)
    },
    refetchInterval: 5000
  })

  const updateTask = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => (await api.patch(`/tasks/${id}`, data)).data,
    // Optimistically patch every cached tasks list so the card moves instantly,
    // instead of snapping back until the refetch lands.
    onMutate: async ({ id, data }: { id: number, data: any }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] })
      const prev = queryClient.getQueriesData({ queryKey: ["tasks"] })
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: any) =>
        Array.isArray(old) ? old.map((t: any) => (t.id === id ? { ...t, ...data } : t)) : old
      )
      return { prev }
    },
    onError: (_e, _v, ctx: any) => {
      ctx?.prev?.forEach(([key, data]: [any, any]) => queryClient.setQueryData(key, data))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
  })

  const createTask = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        project_id: parseInt(data.project_id),
        sprint_id: data.sprint_id ? parseInt(data.sprint_id) : null,
        start_date: data.start_date || null,
        due_date: data.due_date || null
      }
      return (await api.post("/tasks/", payload)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      setIsAddTaskModalOpen(false)
      setNewTask({ title: "", description: "", status: "TODO", priority: "MEDIUM", project_id: "", sprint_id: "", assignee_ids: [], start_date: "", due_date: "" })
      setTaskTeams([])
    }
  })

  const allTasks: any[] = tasks || []

  // Build swimlanes for the board view.
  const lanes: { key: string; label: string; tasks: any[] }[] = (() => {
    if (groupBy === "none") return [{ key: "all", label: "", tasks: allTasks }]
    if (groupBy === "priority") {
      return ["HIGH", "MEDIUM", "LOW"].map(p => ({
        key: p, label: p + " PRIORITY",
        tasks: allTasks.filter(t => t.priority === p)
      })).filter(l => l.tasks.length > 0)
    }
    // assignee
    const map = new Map<string, { key: string; label: string; tasks: any[] }>()
    for (const t of allTasks) {
      const primary = t.assignees?.[0]
      const key = primary ? String(primary.id) : "unassigned"
      const label = primary ? primary.full_name : "Unassigned"
      if (!map.has(key)) map.set(key, { key, label, tasks: [] })
      map.get(key)!.tasks.push(t)
    }
    return Array.from(map.values())
  })()

  const onDrop = (colId: string) => {
    if (dragTaskId == null) return
    const task = allTasks.find(t => t.id === dragTaskId)
    if (task && task.status !== colId) {
      updateTask.mutate({ id: dragTaskId, data: { status: colId } })
    }
    setDragTaskId(null)
    setDragOverCol(null)
  }

  // Render function (NOT a <Component/>) so the returned motion.div keeps a stable
  // element type across re-renders — a custom component type is recreated every
  // render and remounts the node mid-drag, which aborts native drag-and-drop.
  const renderCard = (task: any) => {
    const overdue = isTaskOverdue(task)
    const isProposed = task.status === "PROPOSED"

    return (
      <motion.div
        key={task.id}
        draggable={!isProposed}
        onDragStart={() => setDragTaskId(task.id)}
        onDragEnd={() => { setDragTaskId(null); setDragOverCol(null) }}
        onClick={() => setSelectedTask(task)}
        className={cn(
          "bg-white p-5 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer group relative",
          isProposed ? "border-dashed border-amber-300 bg-amber-50/10" : overdue ? "border-rose-200" : "border-slate-100",
          dragTaskId === task.id && "opacity-40"
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {isProposed ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-200">
                <Clock className="w-2.5 h-2.5" /> Awaiting Approval
              </span>
            ) : (
              <span className={cn(
                "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                task.priority === "HIGH" ? "bg-rose-50 text-rose-600 border-rose-100"
                  : task.priority === "LOW" ? "bg-slate-50 text-slate-500 border-slate-100"
                  : "bg-indigo-50 text-primary border-indigo-100"
              )}>
                {task.priority}
              </span>
            )}
            {overdue && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-600 text-white">
                <AlertTriangle className="w-2.5 h-2.5" /> Overdue
              </span>
            )}
          </div>
          <MoreHorizontal className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
        </div>
        
        <h3 className="font-bold text-[#1e293b] leading-snug mb-2">{task.title}</h3>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">{task.project_name || "General"}</span>
          {task.story_points != null && (
            <span className="ml-auto text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">{task.story_points} pts</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
          <div className={cn("flex items-center gap-1.5", overdue ? "text-rose-500" : "text-slate-400")}>
            <Calendar className="w-3 h-3" />
            <span className="text-[10px] font-bold">{task.due_date ? format(new Date(task.due_date + "T00:00:00"), "MMM d") : "No date"}</span>
          </div>
          
          <div className="flex items-center gap-3">
             {isAdmin && isProposed && (
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   updateTask.mutate({ id: task.id, data: { status: "TODO" } })
                 }}
                 className="px-2 py-1 bg-emerald-600 text-white text-[8px] font-black uppercase rounded-md shadow-sm hover:bg-emerald-700 transition-all"
               >
                 Promote
               </button>
             )}
             <div className="flex -space-x-1.5">
                {task.assignees?.map((asg: any) => (
                  <div key={asg.id} title={asg.full_name}
                    className="w-6 h-6 rounded-full bg-[#1e293b] border-2 border-white flex items-center justify-center text-[8px] font-black text-white shadow-sm">
                    {asg.full_name.charAt(0)}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </motion.div>
    )
  }

  const renderColumns = (laneTasks: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
      {boardColumns.map((column) => {
        const colTasks = laneTasks.filter(t => t.status === column.id)
        return (
          <div key={column.id} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full", column.color)}></div>
                <h2 className="text-sm font-black text-[#1e293b] uppercase tracking-widest">{column.title}</h2>
                <span className="text-[10px] font-black text-slate-300">{colTasks.length}</span>
              </div>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); if (dragOverCol !== column.id) setDragOverCol(column.id) }}
              onDrop={() => onDrop(column.id)}
              className={cn(
                "space-y-4 min-h-[200px] p-2 rounded-3xl border transition-colors",
                dragOverCol === column.id ? "bg-[#459a8c]/5 border-[#459a8c]/40 border-dashed" : "bg-slate-50/50 border-slate-100/50"
              )}
            >
              {colTasks.map((task: any) => renderCard(task))}
              {colTasks.length === 0 && (
                <div className="flex items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-2xl text-slate-300 font-bold text-2xl">—</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  if (isLoading) return <div className="flex items-center justify-center h-full text-slate-400 font-medium">Loading board...</div>

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tight">FlowBoard</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Global Task Flow</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white border border-slate-100 p-1 rounded-xl">
            <button onClick={() => setView("board")} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all", view === "board" ? "bg-[#459a8c] text-white" : "text-slate-500 hover:bg-slate-50")}>
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button onClick={() => setView("list")} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all", view === "list" ? "bg-[#459a8c] text-white" : "text-slate-500 hover:bg-slate-50")}>
              <ListIcon className="w-3.5 h-3.5" /> List
            </button>
          </div>
          {/* Swimlane group (board only) */}
          {view === "board" && (
            <div className="flex items-center gap-2 bg-white border border-slate-100 px-3 py-1.5 rounded-xl">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} className="text-xs font-bold text-slate-600 bg-transparent focus:outline-none cursor-pointer">
                <option value="none">No grouping</option>
                <option value="assignee">By assignee</option>
                <option value="priority">By priority</option>
              </select>
            </div>
          )}
          {isAdmin && (
            <div className="flex items-center gap-1 bg-white border border-slate-100 p-1 rounded-xl">
              {["All", ...(projects?.map((p: any) => p.name) || [])].map((proj, i) => (
                <button key={`${proj}-${i}`} onClick={() => setSelectedProject(proj)}
                  className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", selectedProject === proj ? "bg-[#459a8c] text-white shadow-md shadow-[#459a8c]/20" : "text-slate-500 hover:bg-slate-50")}>
                  {proj}
                </button>
              ))}
            </div>
          )}
          <Button onClick={() => setIsAddTaskModalOpen(true)} icon={<Plus className="w-4 h-4" />}>New Task</Button>
        </div>
      </div>

      {/* BOARD VIEW */}
      {view === "board" && (
        <div className="space-y-10">
          {lanes.map((lane) => (
            <div key={lane.key} className="space-y-4">
              {lane.label && (
                <div className="flex items-center gap-2 px-2">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{lane.label}</span>
                  <span className="text-[10px] font-black text-slate-300">{lane.tasks.length}</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
              )}
              {renderColumns(lane.tasks)}
            </div>
          ))}
        </div>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Task</th>
                <th className="px-4 py-4">Project</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Priority</th>
                <th className="px-4 py-4">Due</th>
                <th className="px-4 py-4">Assignees</th>
              </tr>
            </thead>
            <tbody>
              {[...allTasks].sort((a, b) => (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9)).map((task) => {
                const overdue = isTaskOverdue(task)
                return (
                  <tr key={task.id} onClick={() => setSelectedTask(task)} className="fb-row border-b border-slate-50 cursor-pointer transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1e293b]">{task.title}</td>
                    <td className="px-4 py-4 text-[11px] font-black text-primary uppercase tracking-wider">{task.project_name || "—"}</td>
                    <td className="px-4 py-4">
                      <BadgeDropdown
                        value={task.status}
                        options={STATUS_OPTIONS}
                        styleMap={statusBadgeStyle}
                        onChange={v => updateTask.mutate({ id: task.id, data: { status: v } })}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <BadgeDropdown
                        value={task.priority}
                        options={PRIORITY_OPTIONS}
                        styleMap={priorityBadgeStyle}
                        onChange={v => updateTask.mutate({ id: task.id, data: { priority: v } })}
                        uppercase
                      />
                    </td>
                    <td className={cn("px-4 py-4 text-xs font-bold", overdue ? "text-rose-500" : "text-slate-400")}>
                      {overdue && <Clock className="w-3 h-3 inline mr-1" />}
                      {task.due_date ? format(new Date(task.due_date + "T00:00:00"), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex -space-x-1.5">
                        {task.assignees?.map((a: any) => (
                          <div key={a.id} title={a.full_name} className="w-6 h-6 rounded-full bg-[#1e293b] border-2 border-white flex items-center justify-center text-[8px] font-black text-white">{a.full_name.charAt(0)}</div>
                        ))}
                        {(!task.assignees || task.assignees.length === 0) && <span className="text-xs text-slate-300">Unassigned</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {allTasks.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-medium">No tasks found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <TaskDetailModal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} task={selectedTask} />

      <Modal isOpen={isAddTaskModalOpen} onClose={() => setIsAddTaskModalOpen(false)} title="Create New Task">
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Title</label>
            <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm font-bold text-[#1e293b] focus:outline-none" placeholder="Enter task name..." value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
            <textarea className="w-full bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm font-medium text-[#1e293b] focus:outline-none min-h-[100px] resize-none" placeholder="Optional details..." value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project</label>
              <select className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold text-[#1e293b]" value={newTask.project_id} onChange={e => { setNewTask({ ...newTask, project_id: e.target.value, sprint_id: "", assignee_ids: [] }); setTaskTeams([]) }}>
                <option value="">Select Project</option>
                {projects?.map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</label>
              <select className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold text-[#1e293b]" value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date <span className="text-slate-300 normal-case font-bold">(optional)</span></label>
              <input type="date" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold text-[#1e293b] focus:outline-none" value={newTask.start_date} onChange={e => setNewTask({ ...newTask, start_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date <span className="text-slate-300 normal-case font-bold">(optional)</span></label>
              <input type="date" min={newTask.start_date || undefined} className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold text-[#1e293b] focus:outline-none" value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sprint <span className="text-slate-300 normal-case font-bold">(optional)</span></label>
            <select className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold text-[#1e293b] disabled:opacity-50 disabled:cursor-not-allowed" value={newTask.sprint_id} onChange={e => setNewTask({ ...newTask, sprint_id: e.target.value })} disabled={!newTask.project_id}>
              <option value="">{!newTask.project_id ? "Select a project first" : "Backlog (no sprint)"}</option>
              {activeSprints.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
            {newTask.project_id && activeSprints.length === 0 && (
              <p className="text-[10px] font-bold text-slate-400 pt-1">No active sprints for this project — task goes to backlog.</p>
            )}
          </div>

          {!newTask.project_id ? (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignees</label>
              <p className="text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-3">Select a project first to pick teams &amp; members.</p>
            </div>
          ) : (
            <>
              {projectTeams.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teams <span className="text-slate-300 normal-case font-bold">(adds all its members)</span></label>
                  <div className="flex flex-wrap gap-2">
                    {projectTeams.map((t: any) => {
                      const active = taskTeams.includes(t.id)
                      return (
                        <button key={t.id} type="button" onClick={() => toggleTaskTeam(t)}
                          className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all", active ? "bg-[#459a8c] text-white border-[#459a8c]" : "bg-white text-slate-600 border-slate-200 hover:border-[#459a8c]/40")}>
                          {t.name} <span className="opacity-60">· {t.members?.length || 0}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Members <span className="text-slate-300 normal-case font-bold">({newTask.assignee_ids.length} selected)</span></label>
                {eligibleMembers.length === 0 ? (
                  <p className="text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-3">No teams or members allocated to this project yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {eligibleMembers.map((m: any) => {
                      const active = newTask.assignee_ids.includes(m.id)
                      return (
                        <button key={m.id} type="button" onClick={() => toggleAssignee(m.id)}
                          className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all", active ? "bg-[#459a8c] text-white border-[#459a8c]" : "bg-white text-slate-600 border-slate-200 hover:border-[#459a8c]/40")}>
                          {m.full_name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="pt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsAddTaskModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={() => { if (!createTask.isPending) createTask.mutate(newTask) }} disabled={!newTask.title || !newTask.project_id || createTask.isPending}>{createTask.isPending ? "Creating…" : "Create Task"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
