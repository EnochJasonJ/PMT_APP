"use client"

import { ReactNode, ButtonHTMLAttributes } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  isLoading?: boolean
  icon?: ReactNode
}

export default function Button({ 
  children, 
  variant = "primary", 
  isLoading = false, 
  icon,
  className,
  ...props 
}: ButtonProps) {
  
  const variants: any = {
    primary: "bg-primary text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100",
    secondary: "bg-indigo-50 text-primary hover:bg-indigo-100",
    outline: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100"
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={cn(
        "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </motion.button>
  )
}
