"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Activity,
  ArrowUpRight,
  Eye
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import EChart from "@/components/ui/EChart"
import { useState } from "react"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function DashboardPage() {
  const [lastSync, setLastSync] = useState(new Date())
  const router = useRouter()
  const { user } = useAuthStore()
  const isAdmin = user?.roles?.some((role: any) => role.name.toLowerCase() === "admin")

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/dashboard/stats")
      setLastSync(new Date())
      return res.data
    },
    refetchInterval: 5000 // Poll every 5 seconds for real-time feel
  })

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users/")).data,
    refetchInterval: 10000 // Poll users less frequently
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-slate-400 font-medium">Loading Dashboard...</div>
  }

  // Members only see their own card + their own stats.
  const myStats = stats?.user_stats?.[String(user?.id)] || { todo: 0, in_progress: 0, in_review: 0, done: 0, total: 0 }
  const visibleUsers = isAdmin ? users : users?.filter((u: any) => u.id === user?.id)

  const summaryCards = isAdmin
    ? [
        { label: "Team", value: users?.length || 0, icon: Users, color: "text-slate-400" },
        { label: "Total Tasks", value: stats?.tasks_total || 0, icon: Activity, color: "text-[#1e293b]" },
        { label: "Completed", value: stats?.tasks_by_status?.done || 0, icon: CheckCircle2, color: "text-emerald-500" },
        { label: "Overdue", value: stats?.overdue_total || 0, icon: AlertCircle, color: "text-rose-500" },
      ]
    : [
        { label: "My Tasks", value: myStats.total, icon: Activity, color: "text-[#1e293b]" },
        { label: "Completed", value: myStats.done, icon: CheckCircle2, color: "text-emerald-500" },
        { label: "In Progress", value: myStats.in_progress + myStats.in_review, icon: Clock, color: "text-violet-500" },
        { label: "Yet to Start", value: myStats.todo, icon: Eye, color: "text-slate-400" },
      ]

  // Team workload chart (admin) — stacked tasks-by-status per person.
  const chartUsers = (visibleUsers || []).map((u: any) => ({
    u,
    s: stats?.user_stats?.[String(u.id)] || { todo: 0, in_progress: 0, in_review: 0, done: 0 }
  }))
  const teamChartOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { bottom: 0, icon: "circle", itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11, color: "#64748b" } },
    grid: { left: 4, right: 16, top: 12, bottom: 36, containLabel: true },
    xAxis: {
      type: "category",
      data: chartUsers.map((c: any) => c.u.full_name?.split(" ")[0] || c.u.full_name),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisLabel: { fontSize: 10, color: "#64748b" }
    },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#f1f5f9" } }, axisLabel: { fontSize: 10, color: "#94a3b8" } },
    series: [
      { name: "Completed", type: "bar", stack: "t", barWidth: "55%", itemStyle: { color: "#10b981" }, data: chartUsers.map((c: any) => c.s.done) },
      { name: "In Progress", type: "bar", stack: "t", itemStyle: { color: "#7c3aed" }, data: chartUsers.map((c: any) => c.s.in_progress + c.s.in_review) },
      { name: "Yet to Start", type: "bar", stack: "t", itemStyle: { color: "#cbd5e1", borderRadius: [4, 4, 0, 0] }, data: chartUsers.map((c: any) => c.s.todo) },
    ]
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live System</span>
          <span className="text-[10px] font-bold text-slate-400 ml-2">Last sync: {lastSync.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Summary Row */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {summaryCards.map((card) => (
          <motion.div key={card.label} variants={item} className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between h-32">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <card.icon className={cn("w-3.5 h-3.5", card.color)} />
              {card.label}
            </div>
            <p className="text-4xl font-black text-[#1e293b]">{card.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Team Workload Chart (admin) */}
      {isAdmin && chartUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
            <Activity className="w-3.5 h-3.5 text-[#459a8c]" />
            Team Workload
          </div>
          <div className="w-full h-72">
            <EChart option={teamChartOption} />
          </div>
        </motion.div>
      )}

      {/* Team Progress Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visibleUsers?.map((user: any, idx: number) => {
          const userStats = stats?.user_stats?.[user.id.toString()] || {
            todo: 0, in_progress: 0, in_review: 0, done: 0, total: 0
          }
          
          const completed = userStats.done
          const active = userStats.in_progress + userStats.in_review + userStats.todo
          const total = userStats.total
          const progress = total > 0 ? Math.round((completed / total) * 100) : 0

          const userTasksData = [
            { name: "Completed", value: completed, color: "#10b981" },
            { name: "In Progress", value: userStats.in_progress + userStats.in_review, color: "#7c3aed" },
            { name: "Yet to Start", value: userStats.todo, color: "#e2e8f0" },
          ].filter(d => d.value > 0)

          // If no tasks, show a default empty ring
          const chartData = userTasksData.length > 0 ? userTasksData : [{ name: "No Tasks", value: 1, color: "#f8fafc" }]
          
          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1e293b] rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {user.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1e293b] leading-tight">{user.full_name}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-indigo-50 rounded-lg text-[9px] font-black text-[#459a8c] uppercase tracking-wider border border-indigo-100">
                  {user.team_name || "Engineering"}
                </div>
              </div>

              <div className="flex items-center py-4">
                <div className="relative w-32 h-32 shrink-0" style={{ minWidth: 0, minHeight: 0 }}>
                  <EChart
                    option={{
                      tooltip: total > 0 ? { trigger: "item", formatter: "{b}: {c}" } : undefined,
                      series: [{
                        type: "pie",
                        radius: ["60%", "85%"],
                        avoidLabelOverlap: false,
                        label: { show: false },
                        labelLine: { show: false },
                        silent: total === 0,
                        data: chartData.map((d: any) => ({
                          value: d.value,
                          name: d.name,
                          itemStyle: { color: d.color, borderRadius: 4 }
                        }))
                      }]
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-xl font-black text-[#1e293b] leading-none">{total}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Tasks</p>
                  </div>
                </div>

                <div className="ml-6 flex-1 space-y-2">
                   {[
                     { name: "In Progress", value: userStats.in_progress + userStats.in_review, color: "#7c3aed" },
                     { name: "Completed", value: completed, color: "#10b981" },
                     { name: "Yet to Start", value: userStats.todo, color: "#cbd5e1" }
                   ].map(d => (
                     <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                           <span className="text-[10px] font-bold text-slate-500">{d.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400">{d.value}</span>
                     </div>
                   ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-[#1e293b]">{progress}% done</span>
                    <span className="text-[10px] font-bold text-slate-400">{active} active</span>
                 </div>
                 <button
                    onClick={() => router.push(`/app/tasks?assignee=${user.id}`)}
                    className="flex items-center gap-1 text-[10px] font-black text-[#459a8c] uppercase tracking-tighter hover:underline"
                 >
                    View tasks <ArrowUpRight className="w-3 h-3" />
                 </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
