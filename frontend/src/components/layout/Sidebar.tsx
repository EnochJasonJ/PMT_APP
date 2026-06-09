"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  GitBranch, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Users
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"

const navItems = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/app/projects", icon: Briefcase },
  { name: "Tasks", href: "/app/tasks", icon: CheckSquare },
  { name: "Teams", href: "/app/teams", icon: Users },
  { name: "Integrations", href: "/app/integrations", icon: GitBranch },
  { name: "Settings", href: "/app/settings", icon: Settings },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const logout = useAuthStore((state) => state.logout)

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      className="h-screen bg-white border-r border-slate-100 flex flex-col sticky top-0 transition-all duration-300"
    >
      {/* Logo Area */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <CheckSquare className="text-white w-5 h-5" />
        </div>
        {!collapsed && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-bold text-slate-900 text-lg tracking-tight"
          >
            PM Core
          </motion.span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                isActive 
                  ? "bg-indigo-50 text-primary" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}>
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "group-hover:text-slate-900")} />
                {!collapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm font-medium"
                  >
                    {item.name}
                  </motion.span>
                )}
                {isActive && !collapsed && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                  />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer / Toggle */}
      <div className="p-4 border-t border-slate-50">
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>

        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="mt-2 w-full flex items-center justify-center p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-all"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </motion.aside>
  )
}
