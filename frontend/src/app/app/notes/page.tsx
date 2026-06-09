"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Plus, 
  Pin, 
  Trash2, 
  Search,
  Users
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

const colors = [
  { name: "yellow", bg: "bg-yellow-100", border: "border-yellow-200", text: "text-yellow-800" },
  { name: "emerald", bg: "bg-emerald-100", border: "border-emerald-200", text: "text-emerald-800" },
  { name: "sky", bg: "bg-sky-100", border: "border-sky-200", text: "text-sky-800" },
  { name: "rose", bg: "bg-rose-100", border: "border-rose-200", text: "text-rose-800" },
  { name: "purple", bg: "bg-purple-100", border: "border-purple-200", text: "text-purple-800" },
  { name: "amber", bg: "bg-amber-100", border: "border-amber-200", text: "text-amber-800" },
]

export default function NotesPage() {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [selectedColor, setSelectedColor] = useState(colors[0])
  const [newNote, setNewNote] = useState({ title: "", content: "" })

  const { data: notes, isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const res = await api.get("/notes/")
      return res.data
    }
  })

  const createMutation = useMutation({
    mutationFn: async (note: any) => api.post("/notes/", note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      setIsAdding(false)
      setNewNote({ title: "", content: "" })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/notes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] })
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => api.patch(`/notes/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] })
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <FileTextIcon className="w-5 h-5 text-slate-400" />
          <h2 className="text-sm font-bold text-[#1e293b] uppercase tracking-wider">Team Notes</h2>
          <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100">
            visible to all members
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() => setSelectedColor(color)}
                className={cn(
                  "w-4 h-4 rounded-md transition-all",
                  color.bg,
                  selectedColor.name === color.name ? "ring-2 ring-slate-400 ring-offset-2 scale-110" : "hover:scale-110"
                )}
              />
            ))}
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#459a8c] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#459a8c]/20 hover:bg-[#3b8277] transition-all"
          >
            <Plus className="w-4 h-4" />
            New note
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("p-6 rounded-2xl border-2 border-dashed border-slate-200", selectedColor.bg)}
          >
            <input 
              autoFocus
              className="w-full bg-transparent border-none focus:ring-0 font-bold text-slate-800 placeholder:text-slate-400 mb-2"
              placeholder="Title..."
              value={newNote.title}
              onChange={e => setNewNote({...newNote, title: e.target.value})}
            />
            <textarea 
              className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-600 placeholder:text-slate-400 resize-none h-32"
              placeholder="Start typing your note here..."
              value={newNote.content}
              onChange={e => setNewNote({...newNote, content: e.target.value})}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button 
                onClick={() => createMutation.mutate({...newNote, color: selectedColor.name})}
                className="px-4 py-1.5 bg-[#459a8c] text-white text-xs font-bold rounded-lg"
              >
                Save Note
              </button>
            </div>
          </motion.div>
        )}

        {notes?.map((note: any) => {
          const color = colors.find(c => c.name === note.color) || colors[0]
          return (
            <motion.div
              key={note.id}
              layout
              className={cn(
                "group p-6 rounded-lg border transition-all relative flex flex-col min-h-[200px]",
                color.bg,
                color.border
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => updateMutation.mutate({ id: note.id, data: { is_pinned: !note.is_pinned }})}
                    className={cn("p-1.5 rounded-lg hover:bg-white/50 transition-all", note.is_pinned ? "text-emerald-600 bg-white/50" : "text-slate-400")}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => deleteMutation.mutate(note.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-slate-800 mb-2">{note.title}</h3>
              <p className="text-sm text-slate-600 flex-grow whitespace-pre-wrap">{note.content}</p>
              
              <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
                <Users className="w-3 h-3 text-slate-300" />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7 20 7"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  )
}
