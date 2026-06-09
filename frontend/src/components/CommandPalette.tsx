"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import { api } from "@/lib/api"
import {
  Search, LayoutDashboard, Columns, Calendar, Workflow, Users,
  FileText, MessageCircle, GitBranch, Settings, CheckSquare, Briefcase, BarChart3,
  Target, BookText, Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

type Item = { id: string; label: string; sub?: string; icon: any; action: () => void }

const NAV: { label: string; href: string; icon: any }[] = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { label: "Board", href: "/app/tasks", icon: Columns },
  { label: "Calendar", href: "/app/calendar", icon: Calendar },
  { label: "Projects", href: "/app/projects", icon: Workflow },
  { label: "Goals", href: "/app/goals", icon: Target },
  { label: "Wiki", href: "/app/wiki", icon: BookText },
  { label: "Automation", href: "/app/automation", icon: Zap },
  { label: "Reports", href: "/app/reports", icon: BarChart3 },
  { label: "Team", href: "/app/teams", icon: Users },
  { label: "Notes", href: "/app/notes", icon: FileText },
  { label: "Requests", href: "/app/requests", icon: MessageCircle },
  { label: "Integrations", href: "/app/integrations", icon: GitBranch },
  { label: "Settings", href: "/app/settings", icon: Settings },
]

export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Global Ctrl/Cmd+K toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(o => !o)
      } else if (e.key === "Escape") {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQ(""); setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get("/tasks/")).data,
    enabled: open
  })
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get("/projects/")).data,
    enabled: open
  })

  const items: Item[] = useMemo(() => {
    const nav: Item[] = NAV.map(n => ({
      id: "nav-" + n.href, label: n.label, sub: "Go to page", icon: n.icon,
      action: () => router.push(n.href)
    }))
    const projItems: Item[] = (projects || []).map((p: any) => ({
      id: "proj-" + p.id, label: p.name, sub: "Project", icon: Briefcase,
      action: () => router.push(`/app/projects/${p.id}`)
    }))
    const taskItems: Item[] = (tasks || []).map((t: any) => ({
      id: "task-" + t.id, label: t.title, sub: `Task · ${t.project_name || "General"}`, icon: CheckSquare,
      action: () => router.push("/app/tasks")
    }))
    const all = [...nav, ...projItems, ...taskItems]
    if (!q.trim()) return nav
    const needle = q.toLowerCase()
    return all.filter(i => i.label.toLowerCase().includes(needle) || i.sub?.toLowerCase().includes(needle)).slice(0, 30)
  }, [q, tasks, projects, router])

  useEffect(() => { setActive(0) }, [q])

  const run = (item: Item) => { item.action(); setOpen(false) }

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, items.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === "Enter" && items[active]) { e.preventDefault(); run(items[active]) }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200]" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }}
            className="fixed left-1/2 top-[18%] -translate-x-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-[201] overflow-hidden border border-slate-100"
          >
            <div className="flex items-center gap-3 px-5 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search tasks, projects, pages..."
                className="flex-1 py-4 text-sm font-medium text-[#1e293b] focus:outline-none bg-transparent"
              />
              <kbd className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto py-2">
              {items.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">No results.</p>}
              {items.map((item, i) => (
                <button
                  key={item.id}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(item)}
                  className={cn("w-full flex items-center gap-3 px-5 py-3 text-left transition-colors", i === active ? "bg-slate-50" : "")}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", i === active ? "bg-[#459a8c] text-white" : "bg-slate-100 text-slate-500")}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1e293b] truncate">{item.label}</p>
                    {item.sub && <p className="text-[11px] text-slate-400 truncate">{item.sub}</p>}
                  </div>
                </button>
              ))}
            </div>
            <div className="px-5 py-2.5 border-t border-slate-100 flex items-center gap-4 text-[10px] font-bold text-slate-400">
              <span><kbd className="bg-slate-100 px-1 rounded">↑↓</kbd> navigate</span>
              <span><kbd className="bg-slate-100 px-1 rounded">↵</kbd> open</span>
              <span className="ml-auto"><kbd className="bg-slate-100 px-1 rounded">⌘K</kbd> toggle</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
