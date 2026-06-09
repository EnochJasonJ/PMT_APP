"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/authStore"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  User,
  Bell,
  Lock,
  Palette,
  Globe,
  HelpCircle,
} from "lucide-react"

type Tab = "profile" | "notifications" | "security" | "appearance" | "language"

const NOTIF_KEY = "settings:notifications"
const APPEARANCE_KEY = "settings:appearance"
const LANGUAGE_KEY = "settings:language"

const TABS: { id: Tab; icon: any; label: string }[] = [
  { id: "profile", icon: User, label: "Profile" },
  { id: "notifications", icon: Bell, label: "Notifications" },
  { id: "security", icon: Lock, label: "Security" },
  { id: "appearance", icon: Palette, label: "Appearance" },
  { id: "language", icon: Globe, label: "Language" },
]

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

export default function SettingsPage() {
  const { user, token, setAuth } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>("profile")

  // Profile
  const [fullName, setFullName] = useState(user?.full_name || "")
  const [email, setEmail] = useState(user?.email || "")

  // Security
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Preferences (client-side persisted)
  const [notifications, setNotifications] = useState({ email: true, taskAssigned: true, comments: true })
  const [appearance, setAppearance] = useState({ theme: "light" })
  const [language, setLanguage] = useState({ locale: "en" })

  useEffect(() => {
    setNotifications(readJSON(NOTIF_KEY, { email: true, taskAssigned: true, comments: true }))
    setAppearance(readJSON(APPEARANCE_KEY, { theme: "light" }))
    setLanguage(readJSON(LANGUAGE_KEY, { locale: "en" }))
  }, [])

  useEffect(() => {
    setFullName(user?.full_name || "")
    setEmail(user?.email || "")
  }, [user])

  const updateProfile = useMutation({
    mutationFn: async (data: any) => (await api.patch("/users/me", data)).data,
    onSuccess: (updatedUser) => {
      if (token) setAuth(updatedUser, token)
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Profile updated successfully")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to update profile"),
  })

  const changePassword = useMutation({
    mutationFn: async (data: any) => (await api.post("/users/me/password", data)).data,
    onSuccess: () => {
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("")
      toast.success("Password changed successfully")
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to change password"),
  })

  const saveNotifications = (next: typeof notifications) => {
    setNotifications(next)
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next))
    toast.success("Notification preferences saved")
  }

  const saveAppearance = (theme: string) => {
    const next = { theme }
    setAppearance(next)
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next))
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const dark = theme === "dark" || (theme === "system" && prefersDark)
    document.documentElement.classList.toggle("dark", dark)
    toast.success("Appearance updated")
  }

  const saveLanguage = (locale: string) => {
    const next = { locale }
    setLanguage(next)
    localStorage.setItem(LANGUAGE_KEY, JSON.stringify(next))
    toast.success("Language updated")
  }

  const submitPassword = () => {
    if (newPassword.length < 6) return toast.error("New password must be at least 6 characters")
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match")
    changePassword.mutate({ current_password: currentPassword, new_password: newPassword })
  }

  const card = "bg-white p-8 rounded-lg border border-slate-100 shadow-sm"

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-slate-500 mt-1">Configure your personal preferences and account security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                tab === item.id
                  ? "bg-white border border-slate-100 text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-8">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

            {tab === "profile" && (
              <div className={`${card} space-y-8`}>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center text-primary font-bold text-3xl border-2 border-teal-300 shadow-lg shadow-teal-700">
                    {user?.full_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{user?.full_name}</h3>
                    <p className="text-sm text-slate-500 mt-1 uppercase font-black tracking-widest text-[10px] bg-slate-50 px-2 py-0.5 rounded-md inline-block">
                      {user?.roles?.[0]?.name || "Member"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-primary transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-primary transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    onClick={() => { setFullName(user?.full_name || ""); setEmail(user?.email || "") }}
                    className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateProfile.mutate({ full_name: fullName, email })}
                    disabled={updateProfile.isPending || (fullName === user?.full_name && email === user?.email)}
                    className="px-5 py-2.5 bg-teal-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {tab === "notifications" && (
              <div className={`${card} space-y-6`}>
                <h3 className="text-lg font-bold text-slate-900">Notification Preferences</h3>
                {([
                  { key: "email", label: "Email notifications", desc: "Receive activity summaries by email." },
                  { key: "taskAssigned", label: "Task assignments", desc: "Notify me when a task is assigned to me." },
                  { key: "comments", label: "Comment mentions", desc: "Notify me about new comments on my tasks." },
                ] as const).map((row) => (
                  <div key={row.key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{row.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{row.desc}</p>
                    </div>
                    <button
                      onClick={() => saveNotifications({ ...notifications, [row.key]: !notifications[row.key] })}
                      className={`w-12 h-7 rounded-full transition-all relative ${notifications[row.key] ? "bg-primary" : "bg-slate-200"}`}
                    >
                      <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${notifications[row.key] ? "left-6" : "left-1"}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === "security" && (
              <div className={`${card} space-y-6`}>
                <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Current Password</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary text-sm font-medium" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">New Password</label>
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary text-sm font-medium" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Confirm Password</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary text-sm font-medium" />
                    </div>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={submitPassword}
                    disabled={changePassword.isPending || !currentPassword || !newPassword}
                    className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {changePassword.isPending ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>
            )}

            {tab === "appearance" && (
              <div className={`${card} space-y-6`}>
                <h3 className="text-lg font-bold text-slate-900">Appearance</h3>
                <p className="text-sm text-slate-500">Choose how the interface looks on this device.</p>
                <div className="grid grid-cols-3 gap-4">
                  {["light", "dark", "system"].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => saveAppearance(theme)}
                      className={`px-4 py-6 rounded-lg border text-sm font-bold capitalize transition-all ${
                        appearance.theme === theme ? "border-primary bg-indigo-50 text-primary shadow-sm" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === "language" && (
              <div className={`${card} space-y-6`}>
                <h3 className="text-lg font-bold text-slate-900">Language &amp; Region</h3>
                <div className="space-y-2 max-w-sm">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Display Language</label>
                  <select
                    value={language.locale}
                    onChange={(e) => saveLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary text-sm font-medium"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
              </div>
            )}

          </motion.div>

          {/* Help/Support */}
          <div className="bg-indigo-600 p-8 rounded-lg shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all duration-700"></div>
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white mb-4">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Need help?</h3>
              <p className="text-indigo-100 text-sm mt-2 max-w-sm">
                Check our documentation or contact support for advanced organizational configurations.
              </p>
              <a
                href="mailto:support@example.com"
                className="inline-block mt-6 px-6 py-2.5 bg-white text-primary rounded-xl text-sm font-black uppercase tracking-wider hover:bg-indigo-50 transition-all shadow-lg"
              >
                Get Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
