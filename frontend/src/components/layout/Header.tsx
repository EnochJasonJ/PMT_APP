"use client"

import { Search, Bell, User } from "lucide-react"
import { useAuthStore } from "@/store/authStore"

export default function Header() {
  const user = useAuthStore((state) => state.user)

  return (
    <header className="h-16 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search projects, tasks, or activities..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
        </button>
        
        <div className="h-8 w-[1px] bg-slate-100 mx-1"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 leading-none">{user?.full_name || "User"}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">
              {user?.roles?.[0]?.name || "Member"}
            </p>
          </div>
          <div className="w-10 h-10 bg-indigo-100 border border-indigo-200 rounded-xl flex items-center justify-center text-primary font-bold shadow-sm shadow-indigo-50">
            {user?.full_name?.charAt(0) || "U"}
          </div>
        </div>
      </div>
    </header>
  )
}
