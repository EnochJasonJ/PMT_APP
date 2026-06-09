"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const { token } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    // Artificial delay for a sleek entrance
    const timer = setTimeout(() => {
      if (token) {
        router.push("/app/dashboard")
      } else {
        router.push("/login")
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [token, router])

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 bg-primary rounded-[20px] flex items-center justify-center mb-6 shadow-2xl shadow-indigo-100 ring-8 ring-indigo-50">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full"
          />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">PM Core</h1>
        <p className="text-slate-400 font-medium text-sm mt-2 tracking-widest uppercase">Initializing Interface...</p>
      </motion.div>
    </div>
  )
}
