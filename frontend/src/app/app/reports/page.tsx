"use client"

import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { Download, Activity, CheckCircle2, AlertCircle, Briefcase } from "lucide-react"
import { format, isBefore, startOfDay } from "date-fns"
import EChart from "@/components/ui/EChart"

const statusLabel: Record<string, string> = {
  TODO: "Yet to Start", IN_PROGRESS: "In Progress", IN_REVIEW: "Risk / Dependency", DONE: "Completed", PROPOSED: "Proposed"
}

function csvEscape(v: any) {
  const s = v == null ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function ReportsPage() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get("/tasks/")).data
  })
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get("/projects/")).data
  })

  if (isLoading) return <div className="flex items-center justify-center h-full text-slate-400 font-medium">Loading reports...</div>

  const all: any[] = tasks || []
  const byStatus = (s: string) => all.filter(t => t.status === s).length
  const overdue = all.filter(t => t.due_date && t.status !== "DONE" && isBefore(new Date(t.due_date + "T00:00:00"), startOfDay(new Date()))).length
  const done = byStatus("DONE")
  const completion = all.length ? Math.round((done / all.length) * 100) : 0

  const cards = [
    { label: "Total Tasks", value: all.length, icon: Activity, color: "text-[#1e293b]" },
    { label: "Completed", value: done, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Overdue", value: overdue, icon: AlertCircle, color: "text-rose-500" },
    { label: "Projects", value: projects?.length || 0, icon: Briefcase, color: "text-primary" },
  ]

  const statusOption = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, icon: "circle", itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11, color: "#64748b" } },
    series: [{
      type: "pie", radius: ["55%", "80%"], avoidLabelOverlap: false,
      label: { show: false }, labelLine: { show: false },
      data: [
        { value: byStatus("TODO"), name: "Yet to Start", itemStyle: { color: "#cbd5e1" } },
        { value: byStatus("IN_PROGRESS"), name: "In Progress", itemStyle: { color: "#7c3aed" } },
        { value: byStatus("IN_REVIEW"), name: "Risk / Dependency", itemStyle: { color: "#f59e0b" } },
        { value: byStatus("DONE"), name: "Completed", itemStyle: { color: "#10b981" } },
      ]
    }]
  }

  // Tasks per project bar.
  const projNames = (projects || []).map((p: any) => p.name)
  const perProjectOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 4, right: 16, top: 12, bottom: 24, containLabel: true },
    xAxis: { type: "category", data: projNames, axisLabel: { fontSize: 10, color: "#64748b" }, axisTick: { show: false }, axisLine: { lineStyle: { color: "#e2e8f0" } } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#f1f5f9" } }, axisLabel: { fontSize: 10, color: "#94a3b8" } },
    series: [{
      type: "bar", barWidth: "50%", itemStyle: { color: "#459a8c", borderRadius: [6, 6, 0, 0] },
      data: (projects || []).map((p: any) => all.filter(t => t.project_name === p.name).length)
    }]
  }

  const exportCsv = () => {
    const headers = ["ID", "Title", "Project", "Status", "Priority", "Due Date", "Story Points", "Assignees", "Created"]
    const rows = all.map(t => [
      t.id, t.title, t.project_name || "", statusLabel[t.status] || t.status, t.priority,
      t.due_date || "", t.story_points ?? "",
      (t.assignees || []).map((a: any) => a.full_name).join("; "),
      t.created_at ? format(new Date(t.created_at), "yyyy-MM-dd") : ""
    ])
    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tasks-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports</h1>
          <p className="text-slate-500 mt-1">Delivery metrics across all tasks and projects.</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {cards.map(c => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between h-32">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <c.icon className={`w-3.5 h-3.5 ${c.color}`} /> {c.label}
            </div>
            <p className="text-4xl font-black text-[#1e293b]">{c.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-900">Status Distribution</h3>
            <span className="text-xs font-bold text-slate-400">{completion}% complete</span>
          </div>
          <div className="w-full h-72"><EChart option={statusOption} /></div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Tasks per Project</h3>
          <div className="w-full h-72"><EChart option={perProjectOption} /></div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900">All Tasks ({all.length})</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="px-6 py-3">Title</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Due</th>
            </tr>
          </thead>
          <tbody>
            {all.map(t => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-6 py-3 font-bold text-[#1e293b]">{t.title}</td>
                <td className="px-4 py-3 text-[11px] font-black text-primary uppercase">{t.project_name || "—"}</td>
                <td className="px-4 py-3 text-xs font-bold text-slate-600">{statusLabel[t.status]}</td>
                <td className="px-4 py-3 text-xs font-black uppercase text-slate-500">{t.priority}</td>
                <td className="px-4 py-3 text-xs font-bold text-slate-400">{t.due_date ? format(new Date(t.due_date + "T00:00:00"), "MMM d, yyyy") : "—"}</td>
              </tr>
            ))}
            {all.length === 0 && <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400">No tasks.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
