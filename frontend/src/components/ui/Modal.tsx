"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { ReactNode } from "react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[90%] w-full bg-white rounded-lg shadow-2xl z-[101] overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="text-xl font-bold text-slate-900">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 max-h-[80vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
