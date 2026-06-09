"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode, useState, useEffect } from "react"
import { Toaster } from "sonner"

function applyTheme(theme: string) {
  const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  const dark = theme === "dark" || (theme === "system" && prefersDark)
  document.documentElement.classList.toggle("dark", dark)
}

function ThemeInit() {
  useEffect(() => {
    let theme = "light"
    try {
      const raw = localStorage.getItem("settings:appearance")
      if (raw) theme = JSON.parse(raw).theme || "light"
    } catch { /* ignore */ }
    applyTheme(theme)

    // React to OS changes when in "system" mode.
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      try {
        const raw = localStorage.getItem("settings:appearance")
        if (raw && JSON.parse(raw).theme === "system") applyTheme("system")
      } catch { /* ignore */ }
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return null
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInit />
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}
