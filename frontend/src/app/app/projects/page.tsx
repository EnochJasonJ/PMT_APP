"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Modal from "@/components/ui/Modal"
import { useAuthStore } from "@/store/authStore"

// Correcting icons import
import {
  Briefcase as BriefcaseIcon,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  GitBranch as GitIcon,
  ExternalLink as LinkIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon
} from "lucide-react"

export default function ProjectsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.roles?.some((r: any) => r.name.toLowerCase() === "admin")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [form, setForm] = useState({ name: "", key: "", description: "" })
  const [selectedTeams, setSelectedTeams] = useState<number[]>([])
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await api.get("/teams/")).data,
  })
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users/")).data,
  })

  const resetCreateForm = () => {
    setForm({ name: "", key: "", description: "" })
    setSelectedTeams([])
    setSelectedMembers([])
  }
  const toggleIn = (list: number[], id: number) =>
    list.includes(id) ? list.filter(x => x !== id) : [...list, id]

  const deleteProject = useMutation({
    mutationFn: async (id: number) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      toast.success("Project deleted")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to delete project")
    }
  })

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await api.get("/projects/")
      return response.data
    }
  })

  const createProject = useMutation({
    mutationFn: async (data: any) => {
      return (await api.post("/projects/", data)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setIsCreateModalOpen(false)
      resetCreateForm()
      toast.success("Project created successfully")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to create project")
    }
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-slate-500 font-medium">Loading projects...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Portfolio</h1>
          <p className="text-slate-500 mt-1">Strategic overview of all active initiatives.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary hover:bg-indigo-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
        >
          <PlusIcon className="w-5 h-5" />
          Create Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {projects?.map((project: any, idx: number) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -5 }}
            onClick={() => router.push(`/app/projects/${project.id}`)}
            className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all cursor-pointer group flex flex-col h-full"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <BriefcaseIcon className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-slate-50 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:bg-indigo-50 group-hover:text-primary transition-colors">
                  {project.key}
                </span>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Delete project "${project.name}"? This removes its tasks and sprints. This cannot be undone.`)) {
                        deleteProject.mutate(project.id)
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete project"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                {project.name}
              </h3>
              <p className="text-slate-500 text-sm mt-3 line-clamp-2 leading-relaxed">
                {project.description || "No description provided for this project."}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                    U
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-primary">
                  +2
                </div>
              </div>

              <div className="flex items-center gap-4 text-slate-400">
                <div className="flex items-center gap-1.5">
                  <GitIcon className="w-4 h-4" />
                  <span className="text-xs font-bold">{project.integrations?.length || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <UsersIcon className="w-4 h-4" />
                  <span className="text-xs font-bold">12</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {(!projects || projects.length === 0) && (
          <div className="col-span-full py-32 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
            <BriefcaseIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-slate-900 font-bold text-lg">Empty Portfolio</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">
              Your project workspace is ready. Link a repository or create a new initiative to begin.
            </p>
          </div>
        )}
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetCreateForm() }} title="Create New Project">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (createProject.isPending) return
            if (selectedTeams.length === 0) {
              toast.error("Select at least one team")
              return
            }
            createProject.mutate({
              name: form.name,
              key: form.key,
              description: form.description,
              owner_id: user?.id || 1,
              team_id: selectedTeams[0],
              team_ids: selectedTeams,
              member_ids: selectedMembers,
            })
          }}
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Project Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Website Redesign" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Project Key</label>
            <input value={form.key} onChange={e => setForm({ ...form, key: e.target.value.toUpperCase() })} required maxLength={10} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase" placeholder="e.g. WEB" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Details..."></textarea>
          </div>

          {/* Teams allocation */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Allocate Teams <span className="text-slate-400 font-normal">(first = primary)</span></label>
            <div className="flex flex-wrap gap-2">
              {teams?.map((t: any) => {
                const active = selectedTeams.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTeams(s => toggleIn(s, t.id))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                      active ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-primary/40"
                    )}
                  >
                    {t.name}{active && selectedTeams[0] === t.id ? " ★" : ""}
                  </button>
                )
              })}
              {(!teams || teams.length === 0) && <span className="text-xs text-slate-400">No teams yet — create one in Team.</span>}
            </div>
          </div>

          {/* Member allocation */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Allocate Members <span className="text-slate-400 font-normal">(optional)</span></label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {users?.map((u: any) => {
                const active = selectedMembers.includes(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedMembers(s => toggleIn(s, u.id))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                      active ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400"
                    )}
                  >
                    {u.full_name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => { setIsCreateModalOpen(false); resetCreateForm() }} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button type="submit" disabled={createProject.isPending} className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-indigo-700 rounded-lg disabled:opacity-50">
              {createProject.isPending ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
