"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface DropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  className?: string
}

export default function Dropdown({ trigger, children, className = "w-48" }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 mt-2 origin-top-right bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden ${className}`}
            onClick={() => setIsOpen(false)} // Close on click inside
          >
            <div className="p-1.5 flex flex-col">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function DropdownItem({ onClick, children, className = "" }: { onClick: () => void, children: React.ReactNode, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary rounded-xl transition-colors flex items-center gap-2 ${className}`}
    >
      {children}
    </button>
  )
}
