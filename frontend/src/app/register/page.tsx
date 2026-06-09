"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"
import { toast } from "sonner"
import { Mail, Lock, User as UserIcon, UserPlus, AlertTriangle } from "lucide-react"
import Button from "@/components/ui/Button"

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [token, setToken] = useState<string | null>(null)
  const [state, setState] = useState<"loading" | "valid" | "invalid">("loading")
  const [invite, setInvite] = useState<{ email: string; team_name?: string | null } | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token")
    setToken(t)
    if (!t) { setState("invalid"); setErrorMsg("No invitation token provided."); return }
    api.get(`/invitations/verify/${t}`)
      .then((res) => { setInvite(res.data); setState("valid") })
      .catch((e) => { setState("invalid"); setErrorMsg(e.response?.data?.detail || "This invitation is invalid or has expired.") })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return }
    if (password !== confirm) { toast.error("Passwords do not match."); return }
    setSubmitting(true)
    try {
      const res = await api.post("/invitations/accept", { token, full_name: fullName || null, password })
      const accessToken = res.data.access_token
      const me = await api.get("/users/me", { headers: { Authorization: `Bearer ${accessToken}` } })
      setAuth(me.data, accessToken)
      toast.success("Welcome aboard!")
      router.push("/app/dashboard")
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Could not complete registration.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-10 bg-white rounded-[32px] shadow-xl border border-slate-100"
      >
        {state === "loading" && (
          <p className="text-center text-slate-400 font-bold py-10">Verifying invitation…</p>
        )}

        {state === "invalid" && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 text-rose-500 border border-rose-100">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Invitation Unavailable</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">{errorMsg}</p>
            <button onClick={() => router.push("/login")} className="mt-6 text-sm font-black text-[#459a8c] hover:underline">
              Go to sign in
            </button>
          </div>
        )}

        {state === "valid" && invite && (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-primary border border-indigo-100">
                <UserPlus className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Join the workspace</h1>
              <p className="text-slate-500 mt-2 text-center text-sm font-medium">
                {invite.team_name ? <>You&apos;re joining the <strong>{invite.team_name}</strong> team.</> : "Set a password to activate your account."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="email" value={invite.email} disabled
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm font-medium" />
                </div>
              </div>

              <Button type="submit" isLoading={submitting} className="w-full py-3.5 text-base rounded-2xl">
                Create account & join
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
