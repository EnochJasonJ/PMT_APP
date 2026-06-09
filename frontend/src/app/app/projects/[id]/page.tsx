"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Modal from "@/components/ui/Modal"
import RepoDetailSheet from "@/components/integrations/RepoDetailSheet"
import ConnectRepoModal from "@/components/integrations/ConnectRepoModal"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Briefcase,
  Users,
  GitBranch,
  Activity,
  Plus,
  Target,
  BookText,
  Zap,
  Trash2
} from "lucide-react"

export default function ProjectDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const projectId = params.id
  const [isCreateSprintModalOpen, setIsCreateSprintModalOpen] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState<any>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [allocOpen, setAllocOpen] = useState(false)
  const [selTeams, setSelTeams] = useState<number[]>([])
  const [selMembers, setSelMembers] = useState<number[]>([])

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}`)
      return response.data
    },
    enabled: !!projectId
  })

  const { data: sprints, isLoading: sprintsLoading } = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      const response = await api.get(`/sprints/project/${projectId}`)
      return response.data
    },
    enabled: !!projectId
  })

  const createSprint = useMutation({
    mutationFn: async (data: any) => {
      return (await api.post("/sprints/", data)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
      setIsCreateSprintModalOpen(false)
      toast.success("Sprint created successfully")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to create sprint")
    }
  })

  const { data: allTeams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await api.get("/teams/")).data,
  })
  const { data: allUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users/")).data,
  })

  const updateAllocation = useMutation({
    mutationFn: async (data: { team_ids: number[]; member_ids: number[] }) =>
      (await api.patch(`/projects/${projectId}`, data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      setAllocOpen(false)
      toast.success("Allocation updated — project team notified")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to update allocation")
    },
  })

  const openAllocation = () => {
    setSelTeams((project?.teams || []).map((t: any) => t.id))
    setSelMembers((project?.members || []).map((m: any) => m.id))
    setAllocOpen(true)
  }
  const toggleIn = (list: number[], id: number) =>
    list.includes(id) ? list.filter(x => x !== id) : [...list, id]

  // ----- Project-scoped Goals / Wiki / Automation -----
  const [newGoalTitle, setNewGoalTitle] = useState("")
  const [newWikiTitle, setNewWikiTitle] = useState("")
  const [selectedWiki, setSelectedWiki] = useState<any>(null)
  const [wikiContent, setWikiContent] = useState("")

  const { data: goals } = useQuery({
    queryKey: ["goals", "project", projectId],
    queryFn: async () => (await api.get(`/goals/?project_id=${projectId}`)).data,
    enabled: !!projectId,
  })
  const { data: wikiPages } = useQuery({
    queryKey: ["wiki", projectId],
    queryFn: async () => (await api.get(`/wiki/project/${projectId}`)).data,
    enabled: !!projectId,
  })
  const { data: rules } = useQuery({
    queryKey: ["automations", "project", projectId],
    queryFn: async () => (await api.get(`/automations/?project_id=${projectId}`)).data,
    enabled: !!projectId,
  })

  const createGoal = useMutation({
    mutationFn: async () => (await api.post("/goals/", { title: newGoalTitle, project_id: Number(projectId), status: "on_track", progress: 0 })).data,
    onSuccess: () => { qc(); setNewGoalTitle(""); toast.success("Goal added") },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to add goal"),
  })
  const deleteGoal = useMutation({
    mutationFn: async (id: number) => api.delete(`/goals/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals", "project", projectId] }),
  })
  const createWiki = useMutation({
    mutationFn: async () => (await api.post("/wiki/", { title: newWikiTitle, content: "", project_id: Number(projectId) })).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["wiki", projectId] }); setNewWikiTitle(""); toast.success("Page created") },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to create page"),
  })
  const saveWiki = useMutation({
    mutationFn: async () => (await api.patch(`/wiki/${selectedWiki.id}`, { content: wikiContent })).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["wiki", projectId] }); toast.success("Page saved") },
  })
  function qc() { queryClient.invalidateQueries({ queryKey: ["goals", "project", projectId] }) }


  if (projectLoading || sprintsLoading) {
     return <div className="flex items-center justify-center h-full text-slate-500 font-medium">Loading project details...</div>
  }

  if (!project) {
     return <div className="flex items-center justify-center h-full text-red-500 font-bold">Project not found</div>
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
             <span className="px-2.5 py-1 bg-indigo-50 text-primary text-[10px] font-black uppercase rounded-lg tracking-wider">
               {project.key}
             </span>
          </div>
          <p className="text-slate-500 mt-1 max-w-2xl">{project.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Sprints */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Active Sprints</h2>
            <button 
              onClick={() => setIsCreateSprintModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Sprint
            </button>
          </div>

          <div className="space-y-4">
            {sprints?.length > 0 ? sprints.map((sprint: any) => (
              <motion.div 
                key={sprint.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">{sprint.name}</h3>
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-md">
                    {sprint.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-4">{sprint.goal || "No goal defined."}</p>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500 text-sm">No sprints created yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Project Meta */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-900 border-b border-slate-50 pb-4">Project Details</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-primary">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Team ID</p>
                    <p className="text-sm font-semibold text-slate-900">{project.team_id}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timeline</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString() : "TBD"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Integrations</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {project.integrations?.length || 0} Repositories
                    </p>
                  </div>
                </div>
              </div>
           </div>

           {/* Allocation */}
           <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" /> Allocation
                </h3>
                <button
                  onClick={openAllocation}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Teams</p>
                  <div className="flex flex-wrap gap-1.5">
                    {project.teams?.length > 0 ? project.teams.map((t: any) => (
                      <span key={t.id} className="px-2.5 py-1 bg-indigo-50 text-primary text-[10px] font-black rounded-md uppercase tracking-wider border border-indigo-100">
                        {t.name}{t.id === project.team_id ? " ★" : ""}
                      </span>
                    )) : <span className="text-xs text-slate-400">No teams allocated.</span>}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Members</p>
                  <div className="flex flex-wrap gap-1.5">
                    {project.members?.length > 0 ? project.members.map((m: any) => (
                      <span key={m.id} title={m.email} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-100">
                        {m.full_name}
                      </span>
                    )) : <span className="text-xs text-slate-400">No individual members allocated.</span>}
                  </div>
                </div>
              </div>
           </div>

           {/* Linked Repositories */}
           <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-slate-400" /> Linked Repositories
                </h3>
                <button
                  onClick={() => setConnectOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Link Repo
                </button>
              </div>
              {project.integrations?.length > 0 ? (
                <div className="space-y-3">
                  {project.integrations.map((repo: any) => (
                    <button
                      key={repo.id}
                      onClick={() => setSelectedRepo(repo)}
                      className="w-full text-left block p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-white transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors truncate">
                          {repo.repository_name}
                        </p>
                        <span className="px-2 py-0.5 bg-white text-slate-500 text-[9px] font-black uppercase rounded-md tracking-wider border border-slate-200 shrink-0">
                          {repo.provider}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5 truncate">
                        <GitBranch className="w-3 h-3 shrink-0" /> {repo.branch_name || "main"}
                        <span className="mx-1">•</span>
                        <span className="truncate">{repo.repository_url}</span>
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-4 text-center">No repositories linked yet.</p>
              )}
           </div>
        </div>
      </div>

      {/* Project-scoped Goals / Wiki / Automation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Goals */}
        <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-4">
            <Target className="w-4 h-4 text-slate-400" /> Project Goals
          </h3>
          <div className="space-y-3">
            {goals?.length > 0 ? goals.map((g: any) => (
              <div key={g.id} className="group">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700 truncate">{g.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black text-slate-400">{g.progress}%</span>
                    <button onClick={() => deleteGoal.mutate(g.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-[#459a8c] rounded-full" style={{ width: `${g.progress}%` }} />
                </div>
              </div>
            )) : <p className="text-xs text-slate-400">No goals for this project.</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <input value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} placeholder="New goal…" className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <button onClick={() => { if (newGoalTitle && !createGoal.isPending) createGoal.mutate() }} disabled={!newGoalTitle || createGoal.isPending} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold disabled:opacity-50"><Plus className="w-4 h-4" /></button>
          </div>
          <Link href="/app/goals" className="text-[11px] font-bold text-primary hover:underline">View all goals →</Link>
        </div>

        {/* Wiki */}
        <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-4">
            <BookText className="w-4 h-4 text-slate-400" /> Project Wiki
          </h3>
          <div className="space-y-1.5">
            {wikiPages?.length > 0 ? wikiPages.map((w: any) => (
              <button key={w.id} onClick={() => { setSelectedWiki(w); setWikiContent(w.content || "") }}
                className={cn("w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors", selectedWiki?.id === w.id ? "bg-indigo-50 text-primary" : "text-slate-600 hover:bg-slate-50")}>
                {w.title}
              </button>
            )) : <p className="text-xs text-slate-400">No wiki pages yet.</p>}
          </div>
          {selectedWiki && (
            <div className="space-y-2">
              <textarea value={wikiContent} onChange={e => setWikiContent(e.target.value)} rows={5} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Page content (markdown)…" />
              <button onClick={() => saveWiki.mutate()} disabled={saveWiki.isPending} className="px-3 py-1.5 bg-[#459a8c] text-white rounded-lg text-xs font-bold disabled:opacity-50">{saveWiki.isPending ? "Saving…" : "Save page"}</button>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <input value={newWikiTitle} onChange={e => setNewWikiTitle(e.target.value)} placeholder="New page title…" className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <button onClick={() => { if (newWikiTitle && !createWiki.isPending) createWiki.mutate() }} disabled={!newWikiTitle || createWiki.isPending} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold disabled:opacity-50"><Plus className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Automation */}
        <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-4">
            <Zap className="w-4 h-4 text-slate-400" /> Project Automation
          </h3>
          <div className="space-y-2">
            {rules?.length > 0 ? rules.map((r: any) => (
              <div key={r.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700 truncate">{r.name}</span>
                  <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded", r.is_active ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500")}>{r.is_active ? "On" : "Off"}</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
                  When {r.trigger_field}={r.trigger_value} → {r.action_type}{r.action_value ? `: ${r.action_value}` : ""}
                </p>
              </div>
            )) : <p className="text-xs text-slate-400">No rules for this project.</p>}
          </div>
          <Link href="/app/automation" className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all">
            <Plus className="w-3.5 h-3.5" /> Manage rules
          </Link>
        </div>
      </div>

      <RepoDetailSheet
        isOpen={!!selectedRepo}
        onClose={() => setSelectedRepo(null)}
        repo={selectedRepo}
      />

      <ConnectRepoModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
        projectId={String(projectId)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["project", projectId] })}
      />

      {/* Allocation Editor Modal */}
      <Modal isOpen={allocOpen} onClose={() => setAllocOpen(false)} title="Edit Allocation">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Teams <span className="text-slate-400 font-normal">(first selected = primary ★)</span></label>
            <div className="flex flex-wrap gap-2">
              {allTeams?.map((t: any) => {
                const active = selTeams.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelTeams(s => toggleIn(s, t.id))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                      active ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-primary/40"
                    )}
                  >
                    {t.name}{active && selTeams[0] === t.id ? " ★" : ""}
                  </button>
                )
              })}
              {(!allTeams || allTeams.length === 0) && <span className="text-xs text-slate-400">No teams yet.</span>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Members <span className="text-slate-400 font-normal">(optional)</span></label>
            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto">
              {allUsers?.map((u: any) => {
                const active = selMembers.includes(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelMembers(s => toggleIn(s, u.id))}
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
            <button onClick={() => setAllocOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button
              onClick={() => { if (!updateAllocation.isPending) updateAllocation.mutate({ team_ids: selTeams, member_ids: selMembers }) }}
              disabled={updateAllocation.isPending}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            >
              {updateAllocation.isPending ? "Saving…" : "Save Allocation"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Sprint Modal */}
      <Modal isOpen={isCreateSprintModalOpen} onClose={() => setIsCreateSprintModalOpen(false)} title="Plan New Sprint">
        <form 
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            createSprint.mutate({
              name: formData.get("name") as string,
              goal: formData.get("goal") as string,
              start_date: formData.get("start_date") as string,
              end_date: formData.get("end_date") as string,
              project_id: Number(projectId)
            })
          }}
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Sprint Name</label>
            <input name="name" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Sprint 1 - Alpha" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Goal</label>
            <textarea name="goal" rows={3} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="What is the main objective of this sprint?"></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Start Date</label>
              <input name="start_date" type="date" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">End Date</label>
              <input name="end_date" type="date" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsCreateSprintModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
            <button type="submit" disabled={createSprint.isPending} className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all">
              {createSprint.isPending ? "Planning..." : "Create Sprint"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
