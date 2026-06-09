"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { api } from "@/lib/api"
import { Bell, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export default function NotificationBell() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications/")).data,
    refetchInterval: 15000,
  })

  const list: any[] = notifications || []
  const unread = list.filter(n => !n.is_read).length

  const markRead = useMutation({
    mutationFn: async (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })
  const markAll = useMutation({
    mutationFn: async () => api.post("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const fmt = (v: string) => new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

  const onClick = (n: any) => {
    if (!n.is_read) markRead.mutate(n.id)
    if (n.link) { setOpen(false); router.push(n.link) }
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-[#1e293b] hover:bg-slate-50 transition-all">
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{unread}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[150]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[151] overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-[#1e293b]">Notifications</h3>
                {unread > 0 && (
                  <button onClick={() => markAll.mutate()} className="flex items-center gap-1 text-[10px] font-black text-[#459a8c] uppercase tracking-wider hover:underline">
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {list.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications.</p>}
                {list.map(n => (
                  <button key={n.id} onClick={() => onClick(n)}
                    className={cn("w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3", !n.is_read && "bg-indigo-50/40")}>
                    <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", n.is_read ? "bg-slate-200" : "bg-[#459a8c]")} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1e293b]">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{fmt(n.created_at)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
