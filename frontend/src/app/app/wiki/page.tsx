"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { BookText, Plus, Trash2, Save } from "lucide-react"
import { cn } from "@/lib/utils"

export default function WikiPage() {
  const qc = useQueryClient()
  const [projectId, setProjectId] = useState<string>("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: async () => (await api.get("/projects/")).data })

  useEffect(() => {
    if (!projectId && projects?.length) setProjectId(String(projects[0].id))
  }, [projects, projectId])

  const { data: pages } = useQuery({
    queryKey: ["wiki", projectId],
    queryFn: async () => (await api.get(`/wiki/project/${projectId}`)).data,
    enabled: !!projectId,
  })

  useEffect(() => {
    const page = pages?.find((p: any) => p.id === selectedId)
    if (page) { setTitle(page.title); setContent(page.content || "") }
  }, [selectedId, pages])

  const createPage = useMutation({
    mutationFn: async () => (await api.post("/wiki/", { title: "Untitled page", content: "", project_id: Number(projectId) })).data,
    onSuccess: (p: any) => { qc.invalidateQueries({ queryKey: ["wiki", projectId] }); setSelectedId(p.id); toast.success("Page created") },
  })
  const savePage = useMutation({
    mutationFn: async () => (await api.patch(`/wiki/${selectedId}`, { title, content })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wiki", projectId] }); toast.success("Saved") },
  })
  const deletePage = useMutation({
    mutationFn: async (id: number) => api.delete(`/wiki/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wiki", projectId] }); setSelectedId(null); setTitle(""); setContent(""); toast.success("Deleted") },
  })

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Wiki</h1>
          <p className="text-slate-500 mt-1">Project documentation and knowledge base.</p>
        </div>
        <select value={projectId} onChange={e => { setProjectId(e.target.value); setSelectedId(null) }}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none">
          {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Pages list */}
        <div className="space-y-2">
          <button onClick={() => createPage.mutate()} className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all">
            <Plus className="w-4 h-4" /> New Page
          </button>
          <div className="space-y-1 mt-3">
            {pages?.map((p: any) => (
              <button key={p.id} onClick={() => setSelectedId(p.id)}
                className={cn("w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-left transition-all", selectedId === p.id ? "bg-white border border-slate-100 text-primary shadow-sm" : "text-slate-500 hover:bg-slate-50")}>
                <BookText className="w-4 h-4 shrink-0" /> <span className="truncate">{p.title}</span>
              </button>
            ))}
            {(!pages || pages.length === 0) && <p className="text-xs text-slate-400 px-4 py-3">No pages yet.</p>}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          {selectedId ? (
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <input value={title} onChange={e => setTitle(e.target.value)} className="flex-1 text-2xl font-bold text-slate-900 focus:outline-none bg-transparent" placeholder="Page title" />
                <button onClick={() => savePage.mutate()} disabled={savePage.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#459a8c] text-white rounded-xl text-sm font-bold hover:bg-[#3b8277] disabled:opacity-50"><Save className="w-4 h-4" /> Save</button>
                <button onClick={() => deletePage.mutate(selectedId)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
              </div>
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your documentation here..."
                className="w-full min-h-[420px] text-sm text-slate-700 leading-relaxed focus:outline-none resize-none bg-transparent" />
            </div>
          ) : (
            <div className="bg-white rounded-lg border-2 border-dashed border-slate-100 p-20 text-center">
              <BookText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-bold text-slate-900">Select or create a page</p>
              <p className="text-sm text-slate-400 mt-1">Documentation for this project lives here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
