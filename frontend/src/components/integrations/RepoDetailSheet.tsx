"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ExternalLink, GitCommit, GitMerge, CircleDot } from "lucide-react"
import Sheet from "@/components/ui/Sheet"

interface RepoDetailSheetProps {
  repo: any
  isOpen: boolean
  onClose: () => void
}

export default function RepoDetailSheet({ repo, isOpen, onClose }: RepoDetailSheetProps) {
  const enabled = !!repo?.id && isOpen

  const { data: commits, isLoading: commitsLoading } = useQuery({
    queryKey: ["commits", repo?.id],
    queryFn: async () => (await api.get(`/integrations/${repo.id}/commits`)).data,
    enabled,
  })

  const { data: pulls, isLoading: pullsLoading } = useQuery({
    queryKey: ["pulls", repo?.id],
    queryFn: async () => (await api.get(`/integrations/${repo.id}/pulls`)).data,
    enabled,
  })

  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ["issues", repo?.id],
    queryFn: async () => (await api.get(`/integrations/${repo.id}/issues`)).data,
    enabled,
  })

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={repo?.repository_name || "Repository"}>
      {repo && (
        <div className="space-y-10 pb-10">
          {/* Action Bar */}
          <div className="flex items-center gap-3">
            <a
              href={repo.repository_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-bold transition-all"
            >
              <ExternalLink className="w-4 h-4" /> View on GitHub
            </a>
            <span className="px-2 py-1 bg-white text-slate-500 text-[10px] font-black uppercase rounded-md tracking-wider border border-slate-200">
              {repo.provider} • {repo.branch_name || "main"}
            </span>
          </div>

          {/* Commits */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <GitCommit className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-slate-900">Recent Commits</h3>
            </div>
            {commitsLoading ? (
              <div className="text-sm text-slate-400 animate-pulse">Loading commits...</div>
            ) : commits && commits.length > 0 && !commits[0]?.error ? (
              <div className="space-y-4">
                {commits.map((c: any) => (
                  <div key={c.sha} className="bg-slate-50 border border-slate-100 p-4 rounded-lg">
                    <p className="text-sm font-bold text-slate-900">{c.commit?.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-medium text-slate-500">{c.commit?.author?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {c.sha?.substring(0, 7)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-rose-500 bg-rose-50 p-4 rounded-xl border border-rose-100">
                {commits?.[0]?.error || "No commits found or access denied."}
              </div>
            )}
          </section>

          {/* Pull Requests */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <GitMerge className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-900">Open Pull Requests</h3>
            </div>
            {pullsLoading ? (
              <div className="text-sm text-slate-400 animate-pulse">Loading PRs...</div>
            ) : pulls && pulls.length > 0 && !pulls[0]?.error ? (
              <div className="space-y-4">
                {pulls.map((pr: any) => (
                  <div
                    key={pr.id}
                    className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => window.open(pr.html_url, "_blank")}
                  >
                    <p className="text-sm font-bold text-primary">#{pr.number} {pr.title}</p>
                    <p className="text-xs text-slate-500 mt-1">Opened by {pr.user?.login}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">
                {pulls?.[0]?.error || "No open pull requests found."}
              </div>
            )}
          </section>

          {/* Issues */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CircleDot className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-900">Open Issues</h3>
            </div>
            {issuesLoading ? (
              <div className="text-sm text-slate-400 animate-pulse">Loading issues...</div>
            ) : issues && issues.length > 0 && !issues[0]?.error ? (
              <div className="space-y-4">
                {issues.map((issue: any) => (
                  <div
                    key={issue.id}
                    className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:border-amber-300 transition-colors cursor-pointer"
                    onClick={() => window.open(issue.html_url, "_blank")}
                  >
                    <p className="text-sm font-bold text-slate-900">#{issue.number} {issue.title}</p>
                    <p className="text-xs text-slate-500 mt-1">Opened by {issue.user?.login}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">
                {issues?.[0]?.error || "No open issues found."}
              </div>
            )}
          </section>
        </div>
      )}
    </Sheet>
  )
}
