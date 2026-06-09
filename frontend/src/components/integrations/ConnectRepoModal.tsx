"use client"

import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"
import Modal from "@/components/ui/Modal"

interface ConnectRepoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  // When projectId is set the project is fixed; otherwise a picker is shown.
  projectId?: number | string
  projects?: any[]
  title?: string
}

export default function ConnectRepoModal({ isOpen, onClose, onSuccess, projectId, projects, title }: ConnectRepoModalProps) {
  const fixedProject = projectId !== undefined && projectId !== null

  const [provider, setProvider] = useState("github")
  const [repoName, setRepoName] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [token, setToken] = useState("")
  const [branch, setBranch] = useState("main")
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [branches, setBranches] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      setProvider("github"); setRepoName(""); setRepoUrl(""); setToken("")
      setBranch("main"); setSelectedProject(""); setBranches([])
    }
  }, [isOpen])

  const loadBranches = useMutation({
    mutationFn: async () =>
      (await api.post("/integrations/branches", { repository_url: repoUrl, access_token: token || null, provider })).data,
    onSuccess: (data: string[]) => {
      if (Array.isArray(data) && data.length > 0) {
        setBranches(data)
        if (!data.includes(branch)) setBranch(data[0])
        toast.success(`${data.length} branches found`)
      } else {
        setBranches([])
        toast.error("No branches found — check the URL/token, or enter the branch manually")
      }
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to fetch branches"),
  })

  const connect = useMutation({
    mutationFn: async () =>
      (await api.post("/integrations/", {
        provider,
        repository_name: repoName,
        repository_url: repoUrl,
        branch_name: branch || "main",
        project_id: Number(fixedProject ? projectId : selectedProject),
        is_active: true,
        access_token: token || null,
      })).data,
    onSuccess: () => {
      toast.success("Repository linked")
      onSuccess()
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to link repository"),
  })

  const canSubmit = repoName && repoUrl && (fixedProject || selectedProject) && !connect.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || "Link Repository"}>
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) connect.mutate() }}
      >
        {!fixedProject && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="" disabled>Select a project</option>
              {projects?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option>
            <option value="bitbucket">Bitbucket</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Repository Name</label>
          <input
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="e.g. acme/web-app"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Repository URL</label>
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            required
            type="url"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="https://github.com/acme/web-app"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Access Token <span className="text-slate-400 font-normal">(optional, for private repos)</span></label>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            type="password"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="ghp_..."
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">Branch</label>
            <button
              type="button"
              onClick={() => repoUrl ? loadBranches.mutate() : toast.error("Enter the repository URL first")}
              disabled={loadBranches.isPending}
              className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loadBranches.isPending ? "animate-spin" : ""}`} />
              {loadBranches.isPending ? "Loading..." : "Load branches"}
            </button>
          </div>
          {branches.length > 0 ? (
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          ) : (
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="main"
            />
          )}
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
          <button type="submit" disabled={!canSubmit} className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all">
            {connect.isPending ? "Linking..." : "Link Repository"}
          </button>
        </div>
      </form>
    </Modal>
  )
}
