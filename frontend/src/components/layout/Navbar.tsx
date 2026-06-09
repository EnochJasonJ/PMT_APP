"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  LayoutDashboard, 
  Columns, 
  Calendar, 
  Workflow, 
  Users, 
  FileText, 
  MessageCircle,
  LogOut,
  Bell,
  User as UserIcon,
  Circle,
  BarChart3,
  Target,
  BookText,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import NotificationBell from "@/components/NotificationBell"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const isAdmin = user?.roles?.some(role => role.name.toLowerCase() === 'admin')

  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get("/tasks/")).data
  })

  const { data: requests } = useQuery({
    queryKey: ["requests"],
    queryFn: async () => (await api.get("/requests/")).data
  })

  const myTasksCount = tasks?.filter((t: any) => 
    t.assignees?.some((a: any) => a.id === user?.id) ||
    (t.status === "proposed" && t.reporter_id === user?.id)
  ).length || 0
  const myRequestsCount = requests?.filter((r: any) => r.user_id === user?.id).length || 0
  const pendingAdminRequests = requests?.filter((r: any) => r.status === 'pending').length || 0
const navItems = isAdmin ? [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { name: "Board", href: "/app/tasks", icon: Columns },
  { name: "Calendar", href: "/app/calendar", icon: Calendar },
  { name: "Flow", href: "/app/projects", icon: Workflow },
  { name: "Team", href: "/app/teams", icon: Users },
  { name: "Goals", href: "/app/goals", icon: Target },
  { name: "Wiki", href: "/app/wiki", icon: BookText },
  { name: "Automation", href: "/app/automation", icon: Zap },
  { name: "Notes", href: "/app/notes", icon: FileText },
  { name: "Reports", href: "/app/reports", icon: BarChart3 },
  { name: "Requests", href: "/app/requests", icon: MessageCircle, badge: pendingAdminRequests },
] : [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { name: "My Tasks", href: "/app/tasks", icon: Columns, badge: myTasksCount },
  { name: "Calendar", href: "/app/calendar", icon: Calendar },
  { name: "Notes", href: "/app/notes", icon: FileText },
]


  return (
    <div className="bg-white border-b border-slate-100 px-8 py-3 sticky top-0 z-50">
      {/* Top Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1e293b] rounded-lg flex items-center justify-center">
              <Workflow className="text-white w-5 h-5 rotate-45" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#1e293b] tracking-tight leading-none uppercase">AppXcess</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Technologies</p>
            </div>
          </div>
          <div className="h-8 w-[1px] bg-slate-100 mx-2"></div>
          <div>
            {/* <h2 className="text-xl font-bold text-[#1e293b] tracking-tight">FlowBoard</h2> */}
            <p className="text-[10px] font-bold text-slate-400 uppercase">{isAdmin ? 'Admin Console' : 'My Workspace'} • AppXcess</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <button
            onClick={() => router.push("/app/settings")}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-100 hover:bg-emerald-100 transition-all"
          >
            <UserIcon className="w-4 h-4" />
            <span className="flex flex-col items-start leading-tight">
              <span>{user?.full_name?.split(' ')[0] || "User"}</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600/70">
                {user?.roles?.[0]?.name || "Member"}
              </span>
            </span>
          </button>
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href}>
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer group relative font-bold text-sm",
                  isActive
                    ? "bg-[#459a8c] text-white shadow-lg shadow-[#459a8c]/20"
                    : "text-slate-500 hover:text-[#459a8c] hover:bg-[#459a8c]/10"
                )}>
                  <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400 group-hover:text-[#459a8c]")} />
                  <span>{item.name}</span>
                  {item.badge !== undefined && (
                    <span className={cn(
                      "flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full ml-2 transition-all",
                      isActive 
                        ? "bg-white/20 text-white" 
                        : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-4">
          {isAdmin ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-slate-500">All projects</span>
              <Circle className="w-2 h-2 fill-slate-300 text-slate-300" />
            </div>
          ) : (
            <button 
              onClick={() => router.push("/app/requests")}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-[#459a8c] border border-emerald-100 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all group shadow-sm"
            >
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center border border-emerald-100 shadow-sm group-hover:scale-110 transition-transform">
                <MessageCircle className="w-3 h-3" />
              </div>
              <span>My Requests</span>
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-white text-[#459a8c] text-[10px] font-black rounded-full border border-emerald-100 ml-1">
                {myRequestsCount}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
