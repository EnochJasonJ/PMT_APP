"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { 
  Users, 
  ShieldCheck, 
  Mail, 
  UserPlus,
  Settings2,
  BadgeCheck,
  Plus,
  Trash2,
  Lock,
  User,
  Copy,
  Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import Modal from "@/components/ui/Modal"

export default function TeamsPage() {
  const queryClient = useQueryClient()
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)

  // Forms
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteTeam, setInviteTeam] = useState("")
  const [inviteResult, setInviteResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: "", description: "", parent_team_id: "" })
  const [teamMembers, setTeamMembers] = useState<number[]>([])
  const [editingTeam, setEditingTeam] = useState<any>(null)
  const [editTeam, setEditTeam] = useState({ name: "", description: "", parent_team_id: "" })
  const [editTeamMembers, setEditTeamMembers] = useState<number[]>([])
  const [manualUser, setManualUser] = useState({
    full_name: "",
    email: "",
    password: "",
    team_id: "",
    role_ids: [] as number[]
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users/")).data
  })

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await api.get("/teams/")).data
  })

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api.get("/roles/")).data
  })

  const { data: invitations } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => (await api.get("/invitations/")).data
  })

  const inviteMutation = useMutation({
    mutationFn: async () => (await api.post("/invitations/", {
      email: inviteEmail,
      team_id: inviteTeam ? Number(inviteTeam) : null,
    })).data,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["teams"] })
      setInviteResult(data)   // show generated credentials
      setCopied(false)
      toast.success("Account created")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to create account")
  })

  const closeInvite = () => {
    setIsInviteModalOpen(false)
    setInviteEmail(""); setInviteTeam(""); setInviteResult(null); setCopied(false)
  }
  const copyCreds = () => {
    if (!inviteResult) return
    navigator.clipboard.writeText(inviteResult.invite_url)
    setCopied(true)
  }

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        team_id: data.team_id === "" ? null : parseInt(data.team_id),
        role_ids: data.role_ids.filter((id: any) => !isNaN(id))
      }
      return api.post("/users/", payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setIsManualAddModalOpen(false)
      setManualUser({ full_name: "", email: "", password: "", team_id: "", role_ids: [] })
      toast.success("Member added")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to add member")
  })

  const createTeamMutation = useMutation({
    mutationFn: async (data: typeof newTeam & { member_ids: number[] }) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        parent_team_id: data.parent_team_id === "" ? null : parseInt(data.parent_team_id),
        member_ids: data.member_ids,
      }
      return api.post("/teams/", payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setIsTeamModalOpen(false)
      setNewTeam({ name: "", description: "", parent_team_id: "" })
      setTeamMembers([])
      toast.success("Team created")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to create team"),
  })
  const toggleTeamMember = (id: number) =>
    setTeamMembers(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const openEditTeam = (team: any) => {
    setEditingTeam(team)
    setEditTeam({
      name: team.name,
      description: team.description || "",
      parent_team_id: team.parent_team_id ? String(team.parent_team_id) : "",
    })
    setEditTeamMembers((team.members || []).map((m: any) => m.id))
  }
  const toggleEditTeamMember = (id: number) =>
    setEditTeamMembers(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const updateTeamMutation = useMutation({
    mutationFn: async () => api.patch(`/teams/${editingTeam.id}`, {
      name: editTeam.name,
      description: editTeam.description || null,
      parent_team_id: editTeam.parent_team_id === "" ? null : parseInt(editTeam.parent_team_id),
      member_ids: editTeamMembers,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setEditingTeam(null)
      toast.success("Team updated")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to update team"),
  })

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setEditingTeam(null)
      toast.success("Team deleted")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to delete team"),
  })

  if (usersLoading || teamsLoading) {
    return <div className="flex items-center justify-center h-full text-slate-500 font-medium">Loading Organization...</div>
  }

  return (
    <div className="space-y-10 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tight">Organization</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Teams & Access Controls</p>
        </div>
        <div className="flex gap-3 self-start">
          <button 
            onClick={() => setIsManualAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Manual Add
          </button>
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-[#459a8c] hover:bg-[#3b8277] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-[#459a8c]/20 transition-all active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            Invite Member
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Teams List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Active Teams</h2>
          {teams?.map((team: any, idx: number) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => openEditTeam(team)}
              className="bg-white p-5 rounded-lg border border-slate-100 shadow-sm hover:shadow-md hover:border-[#459a8c]/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-md flex items-center justify-center text-slate-400 group-hover:bg-[#459a8c]/10 group-hover:text-[#459a8c] transition-all">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#1e293b] leading-tight">{team.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{team.description || "Core operational team."}</p>
                  {team.parent_team_id && (
                    <p className="text-[9px] font-black text-[#459a8c] uppercase mt-1 tracking-wider">
                      ↳ sub-team of {teams?.find((t: any) => t.id === team.parent_team_id)?.name || `#${team.parent_team_id}`}
                    </p>
                  )}
                </div>
                <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 group-hover:text-[#459a8c] transition-colors">
                  <User className="w-3 h-3" /> {team.members?.length || 0}
                </span>
              </div>
            </motion.div>
          ))}
          <button
            onClick={() => setIsTeamModalOpen(true)}
            className="w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 font-bold text-sm hover:border-[#459a8c]/20 hover:text-[#459a8c] transition-all"
          >
            + New Team
          </button>

          <div className="pt-8 border-t border-slate-100 space-y-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pending Invitations</h2>
            <div className="space-y-3">
              {invitations?.filter((i: any) => !i.is_used).map((invite: any) => (
                <div key={invite.id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#1e293b]">{invite.email}</span>
                    <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md uppercase">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-[9px] bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-slate-500 truncate flex-grow font-mono">
                      {invite.token}
                    </code>
                  </div>
                </div>
              ))}
              {invitations?.filter((i: any) => !i.is_used).length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-slate-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-300 uppercase">No pending invites</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Directory */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Member Directory</h2>
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Access Level</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user: any, idx: number) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center text-[#459a8c] font-bold text-xs">
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1e293b] leading-tight">{user.full_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles?.map((role: any) => (
                            <span key={role.id} className="px-2 py-0.5 bg-emerald-50 text-[#459a8c] text-[9px] font-black uppercase rounded-md tracking-wider border border-emerald-100">
                              {role.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider",
                          user.is_active ? "text-emerald-600" : "text-slate-400"
                        )}>
                          <BadgeCheck className="w-3.5 h-3.5" /> {user.is_active ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Add Modal */}
      <Modal isOpen={isManualAddModalOpen} onClose={() => setIsManualAddModalOpen(false)} title="Manual Add Member">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Full Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-2.5 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold"
                value={manualUser.full_name}
                onChange={e => setManualUser({...manualUser, full_name: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Email Address</label>
              <input 
                type="email" 
                className="w-full px-4 py-2.5 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold"
                value={manualUser.email}
                onChange={e => setManualUser({...manualUser, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">Initial Password</label>
            <div className="relative">
              <input 
                type="password" 
                className="w-full px-4 py-2.5 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold pl-10"
                value={manualUser.password}
                onChange={e => setManualUser({...manualUser, password: e.target.value})}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Assign Team</label>
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold"
                value={manualUser.team_id}
                onChange={e => setManualUser({...manualUser, team_id: e.target.value})}
              >
                <option value="">No Team</option>
                {teams?.map((team: any) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Primary Role</label>
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold"
                onChange={e => setManualUser({...manualUser, role_ids: [parseInt(e.target.value)]})}
              >
                <option value="">Select Role</option>
                {roles?.map((role: any) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button onClick={() => setIsManualAddModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
            <button 
              onClick={() => createMutation.mutate(manualUser)}
              disabled={!manualUser.email || !manualUser.password}
              className="flex-1 py-3 bg-[#459a8c] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#459a8c]/20 hover:bg-[#3b8277] disabled:opacity-50 transition-all"
            >
              Add Member
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Team Modal */}
      <Modal isOpen={isTeamModalOpen} onClose={() => { setIsTeamModalOpen(false); setTeamMembers([]) }} title="Create New Team">
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">Team Name</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold"
              placeholder="e.g. Frontend Squad"
              value={newTeam.name}
              onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">Description</label>
            <textarea
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 border-slate-100 rounded-xl text-sm font-medium resize-none"
              placeholder="What does this team do?"
              value={newTeam.description}
              onChange={e => setNewTeam({ ...newTeam, description: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">Parent Team <span className="text-slate-300 normal-case">(optional — for sub-teams)</span></label>
            <select
              className="w-full px-4 py-2.5 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold"
              value={newTeam.parent_team_id}
              onChange={e => setNewTeam({ ...newTeam, parent_team_id: e.target.value })}
            >
              <option value="">No parent (top-level team)</option>
              {teams?.map((team: any) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">Members <span className="text-slate-300 normal-case">(optional — assigns them to this team)</span></label>
            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-1">
              {users?.map((u: any) => {
                const active = teamMembers.includes(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleTeamMember(u.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                      active ? "bg-[#459a8c] text-white border-[#459a8c]" : "bg-white text-slate-600 border-slate-200 hover:border-[#459a8c]/40"
                    )}
                  >
                    {u.full_name}
                  </button>
                )
              })}
              {(!users || users.length === 0) && <span className="text-xs text-slate-400">No users yet.</span>}
            </div>
            <p className="text-[9px] font-bold text-slate-300 pt-1">A user can belong to multiple teams — selecting adds them to this team.</p>
          </div>
          <div className="pt-4 flex gap-3">
            <button onClick={() => { setIsTeamModalOpen(false); setTeamMembers([]) }} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
            <button
              onClick={() => { if (!createTeamMutation.isPending) createTeamMutation.mutate({ ...newTeam, member_ids: teamMembers }) }}
              disabled={!newTeam.name || createTeamMutation.isPending}
              className="flex-1 py-3 bg-[#459a8c] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#459a8c]/20 hover:bg-[#3b8277] disabled:opacity-50 transition-all"
            >
              {createTeamMutation.isPending ? "Creating…" : "Create Team"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Team Modal */}
      <Modal isOpen={!!editingTeam} onClose={() => setEditingTeam(null)} title="Edit Team">
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">Team Name</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold"
              value={editTeam.name}
              onChange={e => setEditTeam({ ...editTeam, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">Description</label>
            <textarea
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 border-slate-100 rounded-xl text-sm font-medium resize-none"
              value={editTeam.description}
              onChange={e => setEditTeam({ ...editTeam, description: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">Parent Team <span className="text-slate-300 normal-case">(optional)</span></label>
            <select
              className="w-full px-4 py-2.5 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold"
              value={editTeam.parent_team_id}
              onChange={e => setEditTeam({ ...editTeam, parent_team_id: e.target.value })}
            >
              <option value="">No parent (top-level team)</option>
              {teams?.filter((t: any) => t.id !== editingTeam?.id).map((team: any) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">Members</label>
            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-1">
              {users?.map((u: any) => {
                const active = editTeamMembers.includes(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleEditTeamMember(u.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                      active ? "bg-[#459a8c] text-white border-[#459a8c]" : "bg-white text-slate-600 border-slate-200 hover:border-[#459a8c]/40"
                    )}
                  >
                    {u.full_name}
                  </button>
                )
              })}
            </div>
            <p className="text-[9px] font-bold text-slate-300 pt-1">A user can belong to multiple teams.</p>
          </div>
          <div className="pt-4 flex items-center gap-3">
            <button
              onClick={() => { if (confirm(`Delete team "${editingTeam?.name}"?`)) deleteTeamMutation.mutate(editingTeam.id) }}
              className="px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex-1" />
            <button onClick={() => setEditingTeam(null)} className="px-5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
            <button
              onClick={() => { if (!updateTeamMutation.isPending) updateTeamMutation.mutate() }}
              disabled={!editTeam.name || updateTeamMutation.isPending}
              className="px-5 py-3 bg-[#459a8c] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#459a8c]/20 hover:bg-[#3b8277] disabled:opacity-50 transition-all"
            >
              {updateTeamMutation.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal isOpen={isInviteModalOpen} onClose={closeInvite} title="Invite Team Member">
        {inviteResult ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <BadgeCheck className="w-5 h-5" />
              <span className="text-sm font-black">
                {inviteResult.email_sent ? `Invite emailed to ${inviteResult.email}` : "Invitation created"}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              {inviteResult.email_sent
                ? "They'll get an email with a link to set their password and join. The link expires in 72 hours."
                : "Email isn't configured yet, so copy this link and send it to the member. It expires in 72 hours."}
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invitation Link</p>
              <p className="text-xs font-bold text-[#459a8c] font-mono break-all">{inviteResult.invite_url}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={copyCreds}
                className="flex-1 py-3 bg-[#459a8c] text-white rounded-xl text-sm font-bold hover:bg-[#3b8277] transition-all flex items-center justify-center gap-2">
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy link</>}
              </button>
              <button onClick={closeInvite} className="px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Done</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold pl-10"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team <span className="text-slate-300 normal-case font-bold">(optional)</span></label>
              <select value={inviteTeam} onChange={e => setInviteTeam(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold">
                <option value="">No team yet</option>
                {teams?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">
              Emails a secure link (Member role) where they set their own password and join. If email isn&apos;t configured yet, you&apos;ll get a copyable link instead.
            </p>
            <button
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteEmail || inviteMutation.isPending}
              className="w-full py-3 bg-[#459a8c] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#459a8c]/20 hover:bg-[#3b8277] disabled:opacity-50 transition-all"
            >
              {inviteMutation.isPending ? "Sending…" : "Send Invite"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
