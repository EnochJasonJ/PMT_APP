"use client"

import { useState, useEffect, type ReactNode } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Trash2, Check, Send, Plus, Paperclip, CheckSquare, Square, ShieldCheck, Link2 } from "lucide-react"
import Modal from "@/components/ui/Modal"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"

interface TaskDetailModalProps {
  task: any
  isOpen: boolean
  onClose: () => void
}

type Tab = "details" | "subtasks" | "comments" | "files" | "activity"

export default function TaskDetailModal({ task, isOpen, onClose }: TaskDetailModalProps) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.roles?.some((r: any) => r.name.toLowerCase() === "admin")
  const isManager = user?.roles?.some((r: any) => ["admin", "manager"].includes(r.name.toLowerCase()))
  const canEdit = isAdmin

  const [editTask, setEditTask] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>("details")
  const [newComment, setNewComment] = useState("")
  const [mentionIds, setMentionIds] = useState<number[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [newSubtask, setNewSubtask] = useState("")
  const [attName, setAttName] = useState("")
  const [attUrl, setAttUrl] = useState("")

  const { data: users } = useQuery({ queryKey: ["users"], queryFn: async () => (await api.get("/users/")).data })
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: async () => (await api.get("/projects/")).data, enabled: isOpen })
  const { data: allTeams } = useQuery({ queryKey: ["teams"], queryFn: async () => (await api.get("/teams/")).data, enabled: isOpen })
  const { data: allTasks } = useQuery({ queryKey: ["tasks"], queryFn: async () => (await api.get("/tasks/")).data, enabled: isOpen })
  const { data: labels } = useQuery({
    queryKey: ["labels", task?.project_id],
    queryFn: async () => (await api.get(`/labels/project/${task.project_id}`)).data,
    enabled: !!task?.project_id && isOpen
  })
  const { data: fullTask } = useQuery({
    queryKey: ["task", task?.id],
    queryFn: async () => (await api.get(`/tasks/${task.id}`)).data,
    enabled: !!task?.id && isOpen
  })
  const { data: attachments } = useQuery({
    queryKey: ["attachments", task?.id],
    queryFn: async () => (await api.get(`/tasks/${task.id}/attachments`)).data,
    enabled: !!task?.id && isOpen && activeTab === "files"
  })
  const { data: comments } = useQuery({
    queryKey: ["comments", task?.id],
    queryFn: async () => (await api.get(`/tasks/${task.id}/comments`)).data,
    enabled: !!task?.id && isOpen
  })
  const { data: activities } = useQuery({
    queryKey: ["activities", task?.id],
    queryFn: async () => (await api.get(`/tasks/${task.id}/activities`)).data,
    enabled: !!task?.id && isOpen && activeTab === "activity"
  })
  const { data: sprints } = useQuery({
    queryKey: ["sprints", task?.project_id],
    queryFn: async () => (await api.get(`/sprints/project/${task.project_id}`)).data,
    enabled: !!task?.project_id && isOpen
  })
  const sprintOptions = (sprints || []).filter((s: any) => s.status !== "completed" || s.id === task?.sprint_id)
  const subtasks = fullTask?.subtasks || task?.subtasks || []
  const depTaskOptions = (allTasks || []).filter((t: any) => t.project_id === task?.project_id && t.id !== task?.id)

  useEffect(() => {
    if (task) {
      setEditTask({
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee_ids: task.assignees?.map((a: any) => a.id) || [],
        watcher_ids: task.watchers?.map((w: any) => w.id) || [],
        label_ids: task.labels?.map((l: any) => l.id) || [],
        dependency_ids: task.dependencies?.map((d: any) => d.id) || [],
        due_date: task.due_date || "",
        start_date: task.start_date || "",
        sprint_id: task.sprint_id ? String(task.sprint_id) : "",
        recurrence: task.recurrence || "none",
        estimate_hours: task.estimate_hours ?? "",
        logged_hours: task.logged_hours ?? "",
        requires_approval: !!task.requires_approval,
        notify_on_update: !!task.notify_on_update,
      })
      setActiveTab("details"); setNewComment(""); setNewSubtask(""); setAttName(""); setAttUrl("")
      setMentionIds([]); setMentionQuery(null)
    }
  }, [task])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] })
    queryClient.invalidateQueries({ queryKey: ["task", task?.id] })
  }

  const updateMutation = useMutation({
    mutationFn: async (data: any) => (await api.patch(`/tasks/${task.id}`, data)).data,
    onSuccess: () => { invalidate(); onClose() }
  })
  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/tasks/${task.id}`),
    onSuccess: () => { invalidate(); onClose() }
  })
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      // Only keep mentions whose @name still appears in the text.
      const kept = mentionIds.filter(id => {
        const u = users?.find((x: any) => x.id === id)
        return u && content.includes(`@${u.full_name}`)
      })
      return (await api.post("/tasks/comments", { content, task_id: task.id, mentioned_ids: kept })).data
    },
    onSuccess: () => { setNewComment(""); setMentionIds([]); setMentionQuery(null); queryClient.invalidateQueries({ queryKey: ["comments", task.id] }) }
  })
  const subtaskMutation = useMutation({
    mutationFn: async (title: string) => (await api.post("/tasks/", { title, project_id: task.project_id, parent_task_id: task.id })).data,
    onSuccess: () => { setNewSubtask(""); invalidate() }
  })
  const toggleSubtask = useMutation({
    mutationFn: async ({ id, done }: { id: number, done: boolean }) => (await api.patch(`/tasks/${id}`, { status: done ? "DONE" : "TODO" })).data,
    onSuccess: () => invalidate()
  })
  const attachMutation = useMutation({
    mutationFn: async () => (await api.post("/tasks/attachments", { file_name: attName, file_url: attUrl, task_id: task.id })).data,
    onSuccess: () => { setAttName(""); setAttUrl(""); queryClient.invalidateQueries({ queryKey: ["attachments", task.id] }) }
  })
  const approvalMutation = useMutation({
    mutationFn: async (approved: boolean) => (await api.post(`/tasks/${task.id}/${approved ? "approve" : "reject"}`)).data,
    onSuccess: () => invalidate()
  })

  if (!task || !editTask) return null

  const toggleId = (field: string, id: number) => {
    const cur: number[] = editTask[field] || []
    setEditTask({ ...editTask, [field]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] })
  }

  const save = () => {
    updateMutation.mutate({
      title: editTask.title,
      status: editTask.status,
      priority: editTask.priority,
      assignee_ids: editTask.assignee_ids,
      watcher_ids: editTask.watcher_ids,
      label_ids: editTask.label_ids,
      dependency_ids: editTask.dependency_ids,
      due_date: editTask.due_date || null,
      start_date: editTask.start_date || null,
      sprint_id: editTask.sprint_id ? Number(editTask.sprint_id) : null,
      recurrence: editTask.recurrence,
      estimate_hours: editTask.estimate_hours === "" ? null : Number(editTask.estimate_hours),
      logged_hours: editTask.logged_hours === "" ? null : Number(editTask.logged_hours),
      requires_approval: editTask.requires_approval,
      notify_on_update: editTask.notify_on_update,
    })
  }

  const fmtDate = (v: string) => v ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : ""
  const userName = (id: number) => users?.find((u: any) => u.id === id)?.full_name || `User #${id}`
  const approval = fullTask?.approval_status ?? task.approval_status
  const requiresApproval = fullTask?.requires_approval ?? task.requires_approval

  const inputCls = "w-full bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm font-bold text-[#1e293b] focus:outline-none disabled:cursor-not-allowed"
  const lbl = "text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]"

  const STATUS_LABELS: Record<string, string> = { TODO: "Yet to Start", IN_PROGRESS: "In Progress", IN_REVIEW: "Risk / Dependency", DONE: "Completed", PROPOSED: "Proposed" }
  const titleCase = (v?: string) => v ? v.charAt(0) + v.slice(1).toLowerCase() : "—"
  const fmtDay = (v?: string) => v ? new Date(v + (v.length === 10 ? "T00:00:00" : "")).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"
  const sprintName = task.sprint_id ? (sprintOptions.find((s: any) => s.id === task.sprint_id)?.name || `Sprint #${task.sprint_id}`) : "Backlog (no sprint)"

  // Read-only "document" row — label above value, no inputs. For non-editors.
  const DocRow = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="space-y-1.5">
      <p className={lbl}>{label}</p>
      <p className="text-sm font-bold text-[#1e293b]">{value ?? "—"}</p>
    </div>
  )

  // @mention candidates = this task's assignees + watchers + the project's team/members.
  const mentionPeople: any[] = (() => {
    const map = new Map<number, any>()
    const add = (u: any) => u && map.set(u.id, { id: u.id, full_name: u.full_name })
    task.assignees?.forEach(add)
    task.watchers?.forEach(add)
    const proj = projects?.find((p: any) => p.id === task.project_id)
    proj?.members?.forEach(add)
    const projTeamIds = proj?.teams?.map((t: any) => t.id) || []
    ;(allTeams || []).filter((t: any) => projTeamIds.includes(t.id)).forEach((t: any) => t.members?.forEach(add))
    return Array.from(map.values())
  })()
  const mentionMatches = mentionQuery === null ? []
    : mentionPeople.filter(p => p.full_name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)

  const onCommentChange = (val: string) => {
    setNewComment(val)
    const m = val.match(/@([^\s@]*)$/)  // trailing @token at the caret end
    setMentionQuery(m ? m[1] : null)
  }
  const pickMention = (p: any) => {
    setNewComment(newComment.replace(/@([^\s@]*)$/, `@${p.full_name} `))
    setMentionIds(ids => ids.includes(p.id) ? ids : [...ids, p.id])
    setMentionQuery(null)
  }

  const tabBtn = (id: Tab, label: string) => (
    <button onClick={() => setActiveTab(id)}
      className={cn("text-[11px] font-black uppercase pb-4 transition-all tracking-[0.1em] border-b-2 whitespace-nowrap",
        activeTab === id ? "text-[#1e293b] border-[#1e293b]" : "text-slate-400 border-transparent hover:text-[#1e293b]")}>
      {label}
    </button>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={
      <div className="flex items-center gap-3">
        <span>Task Detail</span>
        <span className="px-2 py-0.5 bg-indigo-50 text-primary text-[9px] font-black uppercase rounded-md tracking-wider border border-indigo-100">{task.project_name || "General"}</span>
      </div>
    }>
      <div className="space-y-6 p-2">
        <div className="flex items-center gap-6 border-b border-slate-100 overflow-x-auto">
          {tabBtn("details", "Details")}
          {tabBtn("subtasks", `Subtasks (${subtasks.length})`)}
          {tabBtn("comments", `Comments (${comments?.length ?? 0})`)}
          {tabBtn("files", "Files")}
          {tabBtn("activity", "Activity")}
        </div>

        {/* Approval banner */}
        {requiresApproval && (
          <div className={cn("flex items-center justify-between gap-3 px-4 py-3 rounded-lg border",
            approval === "approved" ? "bg-emerald-50 border-emerald-100" : approval === "rejected" ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100")}>
            <div className="flex items-center gap-2">
              <ShieldCheck className={cn("w-4 h-4", approval === "approved" ? "text-emerald-600" : approval === "rejected" ? "text-rose-600" : "text-amber-600")} />
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                {approval === "approved" ? "Approved" : approval === "rejected" ? "Rejected" : "Awaiting Approval"}
              </span>
            </div>
            {isManager && approval !== "approved" && (
              <div className="flex gap-2">
                <button onClick={() => approvalMutation.mutate(true)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700">Approve</button>
                <button onClick={() => approvalMutation.mutate(false)} className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-rose-50">Reject</button>
              </div>
            )}
          </div>
        )}

        {activeTab === "details" && !canEdit && (
          <div className="space-y-7">
            {/* Read-only document view — verify-your-details style, no inputs. */}
            <div>
              <p className={lbl}>Task</p>
              <p className="text-lg font-black text-[#1e293b] mt-1">{task.title}</p>
              {task.description && <p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{task.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-6">
              <DocRow label="Start Date" value={fmtDay(task.start_date)} />
              <DocRow label="Deadline" value={fmtDay(task.due_date)} />
              <DocRow label="Status" value={STATUS_LABELS[task.status] || task.status} />
              <DocRow label="Priority" value={titleCase(task.priority)} />
              <DocRow label="Sprint" value={sprintName} />
              <DocRow label="Recurrence" value={titleCase(task.recurrence)} />
              <DocRow label="Estimate (hrs)" value={task.estimate_hours ?? "—"} />
              <DocRow label="Logged (hrs)" value={task.logged_hours ?? "—"} />
              <DocRow label="Requires Approval" value={task.requires_approval ? "Yes" : "No"} />
              <DocRow label="Notify On Update" value={task.notify_on_update ? "Yes" : "No"} />
            </div>
            <DocRow label="Labels" value={
              task.labels?.length
                ? <span className="flex flex-wrap gap-2 mt-1">{task.labels.map((l: any) => (
                    <span key={l.id} className="px-3 py-1 rounded-full text-[11px] font-black text-white" style={{ backgroundColor: l.color || "#459a8c" }}>{l.name}</span>
                  ))}</span>
                : "—"
            } />
            <DocRow label="Assignees" value={
              task.assignees?.length
                ? <span className="flex flex-wrap gap-2 mt-1">{task.assignees.map((a: any) => (
                    <span key={a.id} className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-black text-[#1e293b]">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px]">{a.full_name[0]}</span>{a.full_name}
                    </span>
                  ))}</span>
                : "Unassigned"
            } />
            <DocRow label="Watchers" value={
              task.watchers?.length
                ? <span className="flex flex-wrap gap-2 mt-1">{task.watchers.map((w: any) => (
                    <span key={w.id} className="px-3 py-1 rounded-full bg-indigo-50 text-primary border border-indigo-100 text-[11px] font-black">{w.full_name}</span>
                  ))}</span>
                : "—"
            } />
            <DocRow label="Depends On" value={
              task.dependencies?.length
                ? <span className="flex flex-wrap gap-2 mt-1">{task.dependencies.map((d: any) => (
                    <span key={d.id} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold"><Link2 className="w-3 h-3" />{d.title}</span>
                  ))}</span>
                : "—"
            } />
          </div>
        )}

        {activeTab === "details" && canEdit && (
          <div className="space-y-6">
            <textarea disabled={!canEdit} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-5 text-sm font-bold text-[#1e293b] focus:outline-none min-h-[100px] resize-none disabled:cursor-not-allowed" value={editTask.title} onChange={e => setEditTask({ ...editTask, title: e.target.value })} />

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2"><label className={lbl}>Start Date</label>
                <input type="date" disabled={!canEdit} value={editTask.start_date || ""} onChange={e => setEditTask({ ...editTask, start_date: e.target.value })} className={inputCls} /></div>
              <div className="space-y-2"><label className={lbl}>Deadline</label>
                <input type="date" disabled={!canEdit} value={editTask.due_date || ""} onChange={e => setEditTask({ ...editTask, due_date: e.target.value })} className={inputCls} /></div>
              <div className="space-y-2"><label className={lbl}>Status</label>
                <select disabled={!canEdit} className={inputCls} value={editTask.status} onChange={e => setEditTask({ ...editTask, status: e.target.value })}>
                  <option value="TODO">Yet to Start</option><option value="IN_PROGRESS">In Progress</option><option value="IN_REVIEW">Risk / Dependency</option><option value="DONE">Completed</option>
                </select></div>
              <div className="space-y-2"><label className={lbl}>Priority</label>
                <select disabled={!canEdit} className={inputCls} value={editTask.priority} onChange={e => setEditTask({ ...editTask, priority: e.target.value })}>
                  <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
                </select></div>
              <div className="space-y-2"><label className={lbl}>Sprint</label>
                <select disabled={!canEdit} className={inputCls} value={editTask.sprint_id} onChange={e => setEditTask({ ...editTask, sprint_id: e.target.value })}>
                  <option value="">Backlog (no sprint)</option>
                  {sprintOptions.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select></div>
              <div className="space-y-2"><label className={lbl}>Recurrence</label>
                <select disabled={!canEdit} className={inputCls} value={editTask.recurrence} onChange={e => setEditTask({ ...editTask, recurrence: e.target.value })}>
                  <option value="NONE">None</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option>
                </select></div>
              <div className="space-y-2"><label className={lbl}>Estimate (hrs)</label>
                <input type="number" min="0" step="0.5" disabled={!canEdit} value={editTask.estimate_hours} onChange={e => setEditTask({ ...editTask, estimate_hours: e.target.value })} className={inputCls} placeholder="0" /></div>
              <div className="space-y-2"><label className={lbl}>Logged (hrs)</label>
                <input type="number" min="0" step="0.5" disabled={!canEdit} value={editTask.logged_hours} onChange={e => setEditTask({ ...editTask, logged_hours: e.target.value })} className={inputCls} placeholder="0" /></div>
            </div>

            {/* Requires approval */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-bold text-[#1e293b]">Requires approval</p>
                <p className="text-[11px] text-slate-400">Managers must approve before this task is considered done.</p>
              </div>
              <button
                disabled={!canEdit}
                onClick={() => setEditTask({ ...editTask, requires_approval: !editTask.requires_approval })}
                className={cn("w-12 h-7 rounded-full transition-all relative shrink-0 disabled:opacity-50", editTask.requires_approval ? "bg-[#459a8c]" : "bg-slate-200")}
              >
                <span className={cn("absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all", editTask.requires_approval ? "left-6" : "left-1")} />
              </button>
            </div>

            {/* Notify on update (per-task automation) */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-bold text-[#1e293b]">Notify members on every update</p>
                <p className="text-[11px] text-slate-400">Any change to this task notifies its assignees &amp; watchers.</p>
              </div>
              <button
                disabled={!canEdit}
                onClick={() => setEditTask({ ...editTask, notify_on_update: !editTask.notify_on_update })}
                className={cn("w-12 h-7 rounded-full transition-all relative shrink-0 disabled:opacity-50", editTask.notify_on_update ? "bg-[#459a8c]" : "bg-slate-200")}
              >
                <span className={cn("absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all", editTask.notify_on_update ? "left-6" : "left-1")} />
              </button>
            </div>

            {/* Labels */}
            <div className="space-y-3">
              <label className={lbl}>Labels</label>
              <div className="flex flex-wrap gap-2">
                {(labels || []).map((l: any) => {
                  const on = editTask.label_ids.includes(l.id)
                  return (
                    <button key={l.id} disabled={!canEdit} onClick={() => toggleId("label_ids", l.id)}
                      className={cn("px-3 py-1.5 rounded-full text-[11px] font-black border transition-all", on ? "text-white border-transparent" : "bg-slate-50 text-slate-500 border-slate-100")}
                      style={on ? { backgroundColor: l.color || "#459a8c" } : {}}>{l.name}</button>
                  )
                })}
                {(!labels || labels.length === 0) && <span className="text-[11px] text-slate-400">No labels for this project.</span>}
              </div>
            </div>

            {/* Assignees */}
            <div className="space-y-3">
              <label className={lbl}>Assignees</label>
              <div className="flex flex-wrap gap-2">
                {users?.map((u: any) => {
                  const on = editTask.assignee_ids.includes(u.id)
                  return (
                    <button key={u.id} disabled={!canEdit} onClick={() => toggleId("assignee_ids", u.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-black transition-all",
                        on ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-transparent hover:bg-slate-100/50"
                      )}
                    >
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white",
                        on ? "bg-emerald-600" : "bg-slate-400 dark:bg-slate-500"
                      )}>
                        {u.full_name[0]}
                      </span>
                      <span className={cn(
                        on ? "text-[#1e293b]" : "text-slate-600"
                      )}>
                        {u.full_name}
                      </span>
                      {on && <Check className="w-3 h-3 text-emerald-500 stroke-[3px]" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Watchers */}
            <div className="space-y-3">
              <label className={lbl}>Watchers</label>
              <div className="flex flex-wrap gap-2">
                {users?.map((u: any) => {
                  const on = editTask.watcher_ids.includes(u.id)
                  return (
                    <button key={u.id} disabled={!canEdit} onClick={() => toggleId("watcher_ids", u.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-[11px] font-black transition-all",
                        on ? "bg-indigo-50 text-primary border-indigo-100" : "bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100/50"
                      )}>
                      {u.full_name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dependencies */}
            <div className="space-y-3">
              <label className={lbl}>Depends on</label>
              <div className="flex flex-wrap gap-2">
                {depTaskOptions.map((t: any) => {
                  const on = editTask.dependency_ids.includes(t.id)
                  return (
                    <button key={t.id} disabled={!canEdit} onClick={() => toggleId("dependency_ids", t.id)}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all", on ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-100 hover:opacity-100 opacity-70")}>
                      <Link2 className="w-3 h-3" /> {t.title}
                    </button>
                  )
                })}
                {depTaskOptions.length === 0 && <span className="text-[11px] text-slate-400">No other tasks in this project.</span>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "subtasks" && (
          <div className="space-y-4">
            <div className="space-y-2">
              {subtasks.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No subtasks yet.</p>}
              {subtasks.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                  <button disabled={!canEdit} onClick={() => toggleSubtask.mutate({ id: s.id, done: s.status !== "DONE" })}>
                    {s.status === "DONE" ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                  </button>
                  <span className={cn("text-sm font-bold", s.status === "DONE" ? "line-through text-slate-400" : "text-[#1e293b]")}>{s.title}</span>
                </div>
              ))}
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newSubtask.trim()) subtaskMutation.mutate(newSubtask.trim()) }}
                  placeholder="Add a subtask..." className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none" />
                <button onClick={() => newSubtask.trim() && subtaskMutation.mutate(newSubtask.trim())} disabled={!newSubtask.trim()} className="bg-[#459a8c] text-white p-3 rounded-xl disabled:opacity-50"><Plus className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="space-y-5">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {comments?.length ? comments.map((c: any) => (
                <div key={c.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-[#459a8c] flex items-center justify-center text-[10px] font-black text-white">{(c.author_name || "?")[0]}</div>
                    <span className="text-[11px] font-black text-slate-600">{c.author_name || `User #${c.author_id}`}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">{fmtDate(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
                </div>
              )) : <p className="text-sm text-slate-400 text-center py-6">No comments yet.</p>}
            </div>
            <div className="flex items-center gap-3 relative">
              {mentionMatches.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 w-72 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-10">
                  <p className="px-3 pt-2 pb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Mention</p>
                  {mentionMatches.map((p: any) => (
                    <button key={p.id} onMouseDown={e => { e.preventDefault(); pickMention(p) }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left">
                      <span className="w-6 h-6 rounded-full bg-[#459a8c] text-white flex items-center justify-center text-[10px] font-black">{p.full_name[0]}</span>
                      <span className="text-sm font-bold text-[#1e293b]">{p.full_name}</span>
                    </button>
                  ))}
                </div>
              )}
              <input value={newComment} onChange={e => onCommentChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && mentionMatches.length === 0 && newComment.trim()) commentMutation.mutate(newComment.trim()) }}
                placeholder="Write a comment… use @ to mention" className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none" />
              <button onClick={() => newComment.trim() && commentMutation.mutate(newComment.trim())} disabled={!newComment.trim()} className="bg-[#459a8c] text-white p-3 rounded-xl disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div className="space-y-4">
            <div className="space-y-2">
              {attachments?.length ? attachments.map((a: any) => (
                <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 hover:bg-white transition-all">
                  <Paperclip className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold text-[#1e293b] truncate">{a.file_name}</span>
                  <span className="text-[10px] text-slate-400 ml-auto">{fmtDate(a.uploaded_at)}</span>
                </a>
              )) : <p className="text-sm text-slate-400 text-center py-6">No attachments.</p>}
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <input value={attName} onChange={e => setAttName(e.target.value)} placeholder="File name" className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                <input value={attUrl} onChange={e => setAttUrl(e.target.value)} placeholder="https://file-url" className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
              </div>
              <button onClick={() => attName && attUrl && attachMutation.mutate()} disabled={!attName || !attUrl || attachMutation.isPending}
                className="w-full bg-[#459a8c] text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add attachment
              </button>
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {activities?.length ? activities.map((a: any) => (
              <div key={a.id} className="border-l-2 border-slate-100 pl-4 py-1">
                <p className="text-sm text-slate-700">
                  <span className="font-black text-slate-900">{userName(a.actor_id)}</span>{" "}
                  {a.field_name ? <>changed <span className="font-bold">{a.field_name}</span> {a.old_value && <span className="line-through text-slate-400">{a.old_value}</span>} <span className="text-[#459a8c] font-bold">{a.new_value}</span></> : a.action}
                </p>
                <span className="text-[10px] text-slate-400">{fmtDate(a.created_at)}</span>
              </div>
            )) : <p className="text-sm text-slate-400 text-center py-6">No activity recorded yet.</p>}
          </div>
        )}

        <div className="pt-6 flex items-center justify-between border-t border-slate-100">
          {isAdmin ? (
            <button onClick={() => deleteMutation.mutate()} className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-rose-100"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          ) : <span />}
          <div className="flex gap-5 items-center">
            <button onClick={onClose} className="text-sm font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest">{canEdit ? "Cancel" : "Close"}</button>
            {canEdit && (
              <button onClick={save} disabled={updateMutation.isPending} className="bg-[#459a8c] hover:bg-[#3b8277] text-white px-8 py-3 rounded-lg font-black text-sm shadow-xl shadow-[#459a8c]/30 uppercase tracking-wider disabled:opacity-50">
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
