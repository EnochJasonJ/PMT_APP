"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle,
  MessageSquare,
  Key,
  Shield,
  Plus
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"
import { cn } from "@/lib/utils"

export default function RequestsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.roles?.some(role => role.name.toLowerCase() === 'admin')
  
  const [newRequest, setNewRequest] = useState({ title: "", description: "" })
  const [otherCat, setOtherCat] = useState(false)
  const [responses, setResponses] = useState<Record<number, string>>({})

  const CATEGORIES = ["Security Key", "Access / Permission", "Hardware", "Software / License", "Leave", "Other"]

  const { data: requests, isLoading } = useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const res = await api.get("/requests/")
      return res.data
    }
  })

  const submitMutation = useMutation({
    mutationFn: async (data: any) => api.post("/requests/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] })
      setNewRequest({ title: "", description: "" })
      setOtherCat(false)
    }
  })

  const respondMutation = useMutation({
    mutationFn: async ({ id, status, response }: { id: number, status: string, response: string }) => 
      api.patch(`/requests/${id}`, { status, response_content: response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] })
      setResponses({})
    }
  })

  const pendingRequests = requests?.filter((r: any) => r.status === 'pending') || []
  const historyRequests = requests?.filter((r: any) => r.status !== 'pending') || []

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-bold text-[#1e293b] uppercase tracking-wider">
            {isAdmin ? "Admin Console — Requests" : "My Requests"}
          </h2>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#459a8c]" />
            New Request
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Category</label>
              <select
                value={otherCat ? "Other" : newRequest.title}
                onChange={e => {
                  const v = e.target.value
                  if (v === "Other") { setOtherCat(true); setNewRequest({ ...newRequest, title: "" }) }
                  else { setOtherCat(false); setNewRequest({ ...newRequest, title: v }) }
                }}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#459a8c]/20 focus:border-[#459a8c] focus:outline-none py-2 px-3 transition-all cursor-pointer"
              >
                <option value="" disabled>Select category…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {otherCat && (
                <input
                  type="text"
                  placeholder="Specify category…"
                  value={newRequest.title}
                  onChange={e => setNewRequest({ ...newRequest, title: e.target.value })}
                  className="w-full mt-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#459a8c]/20 focus:border-[#459a8c] focus:outline-none py-2 px-3 transition-all"
                />
              )}
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Description</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Tell the admin what you need..."
                  value={newRequest.description}
                  onChange={e => setNewRequest({...newRequest, description: e.target.value})}
                  className="flex-grow bg-slate-50 border-slate-200 rounded-xl text-sm focus:ring-[#459a8c] focus:border-[#459a8c]"
                />
                <button
                  onClick={() => submitMutation.mutate(newRequest)}
                  disabled={!newRequest.description || !newRequest.title}
                  className="px-6 py-2 bg-[#459a8c] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#459a8c]/20 hover:bg-[#3b8277] disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Section */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</span>
          <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
        </div>

        <div className="space-y-4">
          {pendingRequests.map((req: any) => (
            <motion.div 
              key={req.id}
              layout
              className="bg-white border-l-4 border-l-amber-400 border border-slate-100 rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                    {req.user_name?.[0] || 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 text-sm">{req.user_name || "User"}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md uppercase">
                        {req.title}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>

              <p className="text-sm text-slate-600 mb-4 pl-11">{req.description}</p>

              {isAdmin ? (
                <div className="flex gap-2 pl-11">
                  <input 
                    type="text"
                    placeholder="Send the credential / response..."
                    value={responses[req.id] || ""}
                    onChange={e => setResponses({...responses, [req.id]: e.target.value})}
                    className="flex-grow bg-slate-50 border-slate-200 rounded-xl text-sm focus:ring-[#459a8c] focus:border-[#459a8c] py-2"
                  />
                  <button 
                    onClick={() => respondMutation.mutate({ id: req.id, status: 'approved', response: responses[req.id] })}
                    className="px-6 py-2 bg-[#459a8c] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#459a8c]/20 hover:bg-[#3b8277] transition-all flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>
              ) : (
                <div className="pl-11 flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase">
                  <Clock className="w-3 h-3" />
                  Awaiting Admin response
                </div>
              )}
            </motion.div>
          ))}
          {pendingRequests.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 font-bold text-sm">
              No pending requests
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History</span>
          <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{historyRequests.length}</span>
        </div>

        <div className="space-y-4 opacity-70">
          {historyRequests.map((req: any) => (
            <div 
              key={req.id}
              className="bg-slate-50 border border-slate-100 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase",
                    req.status === 'approved' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  )}>
                    {req.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 text-sm">{req.title}</span>
                      <span className={cn(
                        "px-2 py-0.5 text-[9px] font-bold rounded-md uppercase",
                        req.status === 'approved' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">
                  Raised {new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>

              <p className="text-sm text-slate-500 mb-3 pl-11">{req.description}</p>
              
              {req.response_content && (
                <div className="pl-11">
                  <div className="bg-white/50 border border-slate-200 rounded-xl p-3 flex gap-3">
                    <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-slate-400 uppercase">Response</p>
                        {req.responded_at && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">
                            Responded {new Date(req.responded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 font-mono bg-slate-100 px-2 py-1 rounded select-all break-all">
                        {req.response_content}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
