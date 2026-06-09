"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/layout/Navbar"
import CommandPalette from "@/components/CommandPalette"
import { useAuthStore } from "@/store/authStore"
import { motion, AnimatePresence } from "framer-motion"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { token, hasHydrated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    // Wait for the persisted store to rehydrate before deciding to redirect,
    // otherwise a page refresh bounces an authenticated user to /login.
    if (hasHydrated && !token) {
      router.push("/login")
    }
  }, [hasHydrated, token, router])

  // Block render until hydration resolves (avoids login flash on refresh).
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f4f7f9] text-slate-400 font-medium">
        Loading…
      </div>
    )
  }

  if (!token) return null

  return (
    <div className="flex flex-col bg-[#f4f7f9] min-h-screen">
      <CommandPalette />
      <Navbar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key="page-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
