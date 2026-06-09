"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { ReactNode } from "react"

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export default function Sheet({ isOpen, onClose, title, children }: SheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[100]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-[101] flex flex-col border-l border-slate-100"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
