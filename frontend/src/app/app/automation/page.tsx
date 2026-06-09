"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Zap, Plus, Trash2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Modal from "@/components/ui/Modal"

const FIELD_VALUES: Record<string, { value: string; label: string }[]> = {
  status: [
    { value: "TODO", label: "Yet to Start" }, { value: "IN_PROGRESS", label: "In Progress" },
    { value: "IN_REVIEW", label: "Risk / Dependency" }, { value: "DONE", label: "Completed" },
  ],
  priority: [{ value: "LOW", label: "Low" }, { value: "MEDIUM", label: "Medium" }, { value: "HIGH", label: "High" }],
}

export default function AutomationPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [triggerField, setTriggerField] = useState("status")
  const [actionType, setActionType] = useState("notify")

  const { data: rules, isLoading } = useQuery({ queryKey: ["automations"], queryFn: async () => (await api.get("/automations/")).data })
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: async () => (await api.get("/projects/")).data })

  const create = useMutation({
    mutationFn: async (data: any) => (await api.post("/automations/", data)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automations"] }); setOpen(false); toast.success("Rule created") },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to create rule"),
  })
  const update = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => (await api.patch(`/automations/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  })
  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/automations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automations"] }); toast.success("Rule deleted") },
  })

  const projName = (id: number | null) => id ? projects?.find((p: any) => p.id === id)?.name : "All projects"
  const labelFor = (field: string, value: string) => FIELD_VALUES[field]?.find(v => v.value === value)?.label || value

  if (isLoading) return <div className="flex items-center justify-center h-full text-slate-400 font-medium">Loading automations...</div>

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Automation</h1>
          <p className="text-slate-500 mt-1">Rules that react to task changes automatically.</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      <div className="space-y-4">
        {rules?.map((r: any, i: number) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6 group">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", r.is_active ? "bg-amber-50 text-amber-500" : "bg-slate-50 text-slate-300")}><Zap className="w-5 h-5" /></div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900">{r.name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                <span className="font-bold text-slate-500">WHEN</span>
                <span className="px-2 py-1 bg-slate-100 rounded-md font-bold text-slate-700">{r.trigger_field} = {labelFor(r.trigger_field, r.trigger_value)}</span>
                <ArrowRight className="w-3 h-3 text-slate-300" />
                <span className="font-bold text-slate-500">THEN</span>
                <span className="px-2 py-1 bg-indigo-50 rounded-md font-bold text-primary">{r.action_type}{r.action_value ? `: ${r.action_value}` : ""}</span>
                <span className="px-2 py-1 bg-slate-50 rounded-md font-bold text-slate-400">{projName(r.project_id)}</span>
              </div>
            </div>
            <button onClick={() => update.mutate({ id: r.id, data: { is_active: !r.is_active } })}
              className={cn("w-12 h-7 rounded-full transition-all relative shrink-0", r.is_active ? "bg-[#459a8c]" : "bg-slate-200")}>
              <span className={cn("absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all", r.is_active ? "left-6" : "left-1")} />
            </button>
            <button onClick={() => remove.mutate(r.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
          </motion.div>
        ))}
        {(!rules || rules.length === 0) && (
          <div className="py-20 text-center bg-white rounded-lg border-2 border-dashed border-slate-100">
            <Zap className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-bold text-slate-900">No automation rules</p>
            <p className="text-sm text-slate-400 mt-1">Create a rule to notify or change tasks automatically.</p>
          </div>
        )}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="New Automation Rule">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          create.mutate({
            name: fd.get("name"),
            project_id: fd.get("project_id") ? Number(fd.get("project_id")) : null,
            trigger_field: fd.get("trigger_field"),
            trigger_value: fd.get("trigger_value"),
            action_type: fd.get("action_type"),
            action_value: fd.get("action_value") || null,
            is_active: true,
          })
        }}>
          <div className="space-y-2"><label className="text-xs font-semibold text-slate-700">Rule Name</label>
            <input name="name" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Notify on completion" /></div>
          <div className="space-y-2"><label className="text-xs font-semibold text-slate-700">Project (optional)</label>
            <select name="project_id" defaultValue="" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All projects</option>
              {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-xs font-semibold text-slate-700">When field</label>
              <select name="trigger_field" value={triggerField} onChange={e => setTriggerField(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="status">Status</option><option value="priority">Priority</option>
              </select></div>
            <div className="space-y-2"><label className="text-xs font-semibold text-slate-700">Equals</label>
              <select name="trigger_value" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                {FIELD_VALUES[triggerField].map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-xs font-semibold text-slate-700">Action</label>
              <select name="action_type" value={actionType} onChange={e => setActionType(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="notify">Notify assignees</option><option value="set_status">Set status</option><option value="set_priority">Set priority</option>
              </select></div>
            <div className="space-y-2"><label className="text-xs font-semibold text-slate-700">{actionType === "notify" ? "Message (optional)" : "Value"}</label>
              {actionType === "notify" ? (
                <input name="action_value" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Custom message" />
              ) : (
                <select name="action_value" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {FIELD_VALUES[actionType === "set_status" ? "status" : "priority"].map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={create.isPending} className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-indigo-700 rounded-xl disabled:opacity-50">{create.isPending ? "Creating..." : "Create Rule"}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
