"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"
import { toast } from "sonner"
import { Mail, Lock, LogIn } from "lucide-react"
import Button from "@/components/ui/Button"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((state) => state.setAuth)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new URLSearchParams()
      formData.append("username", email)
      formData.append("password", password)

      const response = await api.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })

      const token = response.data.access_token
      const userResponse = await api.get("/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })

      setAuth(userResponse.data, token)
      toast.success("Welcome back!")
      router.push("/app/dashboard")
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-10 bg-white rounded-[32px] shadow-xl border border-slate-100"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-primary border border-indigo-100">
            <LogIn className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-slate-500 mt-2 text-center text-sm font-medium">
            Manage your enterprise projects with ease.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium"
              />
            </div>
          </div>

          <Button type="submit" isLoading={loading} className="w-full py-3.5 text-base rounded-2xl">
            Sign In
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
