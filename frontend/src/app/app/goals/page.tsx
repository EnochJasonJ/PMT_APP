"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Target, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import Modal from "@/components/ui/Modal"

const STATUS: Record<string, { label: string; cls: string }> = {
  on_track: { label: "On Track", cls: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  at_risk: { label: "At Risk", cls: "bg-amber-50 text-amber-600 border-amber-100" },
  off_track: { label: "Off Track", cls: "bg-rose-50 text-rose-600 border-rose-100" },
  completed: { label: "Completed", cls: "bg-indigo-50 text-primary border-indigo-100" },
}

export default function GoalsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isManager = user?.roles?.some((r: any) => ["admin", "manager"].includes(r.name.toLowerCase()))
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<number[]>([])

  const { data: goals, isLoading } = useQuery({ queryKey: ["goals"], queryFn: async () => (await api.get("/goals/")).data })
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: async () => (await api.get("/projects/")).data })
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: async () => (await api.get("/users/")).data })

  const create = useMutation({
    mutationFn: async (data: any) => (await api.post("/goals/", data)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); setOpen(false); setMembers([]); toast.success("Goal created") },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to create goal"),
  })
  const toggleMember = (id: number) => setMembers(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const update = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => (await api.patch(`/goals/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  })
  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/goals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Goal deleted") },
  })

  const projName = (id: number) => projects?.find((p: any) => p.id === id)?.name

  if (isLoading) return <div className="flex items-center justify-center h-full text-slate-400 font-medium">Loading goals...</div>

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Goals & OKRs</h1>
          <p className="text-slate-500 mt-1">Track objectives and key results across the organization.</p>
        </div>
        {isManager && (
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
            <Plus className="w-4 h-4" /> New Goal
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {goals?.map((g: any, i: number) => {
          const st = STATUS[g.status] || STATUS.on_track
          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 group">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-primary"><Target className="w-5 h-5" /></div>
                <div className="flex items-center gap-2">
                  <span className={cn("px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border", st.cls)}>{st.label}</span>
                  {isManager && (
                    <button onClick={() => remove.mutate(g.id)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{g.title}</h3>
                {g.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{g.description}</p>}
                {g.project_id && <p className="text-[10px] font-black text-primary uppercase tracking-wider mt-2">{projName(g.project_id) || "Project"}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Progress</span><span>{g.progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#459a8c] rounded-full transition-all" style={{ width: `${g.progress}%` }} />
                </div>
                <input type="range" min={0} max={100} step={5} defaultValue={g.progress}
                  onMouseUp={(e: any) => update.mutate({ id: g.id, data: { progress: Number(e.target.value), status: Number(e.target.value) >= 100 ? "completed" : g.status } })}
                  onTouchEnd={(e: any) => update.mutate({ id: g.id, data: { progress: Number(e.target.value) } })}
                  className="w-full accent-[#459a8c] cursor-pointer" />
              </div>
              {g.target_date && <p className="text-[11px] font-bold text-slate-400">Target: {new Date(g.target_date + "T00:00:00").toLocaleDateString()}</p>}
              {g.members?.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex -space-x-1.5">
                    {g.members.slice(0, 5).map((m: any) => (
                      <div key={m.id} title={m.full_name} className="w-6 h-6 rounded-full bg-[#1e293b] border-2 border-white flex items-center justify-center text-[8px] font-black text-white">{m.full_name.charAt(0)}</div>
                    ))}
                  </div>
                  {g.members.length > 5 && <span className="text-[10px] font-bold text-slate-400">+{g.members.length - 5}</span>}
                </div>
              )}
            </motion.div>
          )
        })}
        {(!goals || goals.length === 0) && (
          <div className="col-span-full py-20 text-center bg-white rounded-lg border-2 border-dashed border-slate-100">
            <Target className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-bold text-slate-900">No goals yet</p>
            <p className="text-sm text-slate-400 mt-1">Define objectives to track delivery against.</p>
          </div>
        )}
      </div>

      <Modal isOpen={open} onClose={() => { setOpen(false); setMembers([]) }} title="New Goal">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          create.mutate({
            title: fd.get("title"), description: fd.get("description") || null,
            project_id: fd.get("project_id") ? Number(fd.get("project_id")) : null,
            target_date: fd.get("target_date") || null,
            status: fd.get("status"), progress: 0, owner_id: user?.id,
            member_ids: members,
          })
        }}>
          <div className="space-y-2"><label className="text-xs font-semibold text-slate-700">Title</label>
            <input name="title" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Ship MVP by Q3" /></div>
          <div className="space-y-2"><label className="text-xs font-semibold text-slate-700">Description</label>
            <textarea name="description" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-xs font-semibold text-slate-700">Project (optional)</label>
              <select name="project_id" defaultValue="" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Org-wide</option>
                {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            <div className="space-y-2"><label className="text-xs font-semibold text-slate-700">Status</label>
              <select name="status" defaultValue="on_track" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="on_track">On Track</option><option value="at_risk">At Risk</option><option value="off_track">Off Track</option>
              </select></div>
          </div>
          <div className="space-y-2"><label className="text-xs font-semibold text-slate-700">Target Date</label>
            <input name="target_date" type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
          <div className="space-y-2"><label className="text-xs font-semibold text-slate-700">Assign Members <span className="text-slate-400 font-normal">(optional)</span></label>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {users?.map((u: any) => {
                const active = members.includes(u.id)
                return (
                  <button key={u.id} type="button" onClick={() => toggleMember(u.id)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all", active ? "bg-[#459a8c] text-white border-[#459a8c]" : "bg-white text-slate-600 border-slate-200 hover:border-[#459a8c]/40")}>
                    {u.full_name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={create.isPending} className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-indigo-700 rounded-xl disabled:opacity-50">{create.isPending ? "Creating..." : "Create Goal"}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
