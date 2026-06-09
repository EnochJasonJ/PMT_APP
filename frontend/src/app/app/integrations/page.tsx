"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import {
  GitBranch, RefreshCw, Activity, Plus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FaGithub } from "react-icons/fa"
import { toast } from "sonner"
import RepoDetailSheet from "@/components/integrations/RepoDetailSheet"
import ConnectRepoModal from "@/components/integrations/ConnectRepoModal"

export default function IntegrationsPage() {
  const queryClient = useQueryClient()
  const [selectedRepo, setSelectedRepo] = useState<any>(null)
  const [connectOpen, setConnectOpen] = useState(false)

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get("/projects/")).data
  })

  const syncMutation = useMutation({
    mutationFn: async () => (await api.post("/jobs/trigger/repo-sync")).data,
    onSuccess: () => toast.success("Background sync triggered! Check logs for updates.")
  })

  if (projectsLoading) return <div className="flex items-center justify-center h-full text-slate-500">Loading Integrations...</div>

  const allIntegrations = projects?.flatMap((p: any) => p.integrations || []) || []

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Integrations</h1>
          <p className="text-slate-500 mt-1">Connect your engineering workflows to project tasks.</p>
        </div>
        <div className="flex gap-3 self-start">
          <button
            onClick={() => syncMutation.mutate()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className={cn("w-4 h-4", syncMutation.isPending && "animate-spin")} />
            Sync All
          </button>
          <button
            onClick={() => setConnectOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Connect Repository
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {allIntegrations.map((repo: any, idx: number) => (
          <motion.div
            key={repo.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => setSelectedRepo(repo)}
            className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden group cursor-pointer hover:border-primary/30 transition-all"
          >
            <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:text-primary transition-all duration-300 text-slate-600">
                  <FaGithub className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{repo.repository_name}</h3>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-md tracking-wider">
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                    <GitBranch className="w-3.5 h-3.5" /> {repo.branch_name}
                    <span className="mx-1">•</span>
                    <span className="text-slate-400 font-normal">{repo.repository_url}</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {allIntegrations.length === 0 && (
          <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
            <Activity className="w-12 h-12 text-slate-100 mx-auto mb-4" />
            <h3 className="text-slate-900 font-bold">No sources linked</h3>
            <p className="text-slate-400 text-sm mt-1">Connect your version control systems to see them here.</p>
          </div>
        )}
      </div>

      <RepoDetailSheet
        isOpen={!!selectedRepo}
        onClose={() => setSelectedRepo(null)}
        repo={selectedRepo}
      />

      <ConnectRepoModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
        projects={projects}
        title="Connect Repository"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["projects"] })}
      />
    </div>
  )
}
