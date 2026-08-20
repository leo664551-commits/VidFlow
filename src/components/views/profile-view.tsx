'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/app-store'
import { updateProfile, logout } from '@/lib/api'
import {
  Loader2,
  ArrowLeft,
  Mail,
  MessageSquare,
  Star,
  LogOut,
  ChevronRight,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'

const GRADIENTS = [
  'bg-gradient-to-br from-rose-500 to-pink-600',
  'bg-gradient-to-br from-amber-500 to-orange-600',
  'bg-gradient-to-br from-emerald-500 to-teal-600',
  'bg-gradient-to-br from-cyan-500 to-sky-600',
  'bg-gradient-to-br from-violet-500 to-purple-600',
  'bg-gradient-to-br from-fuchsia-500 to-pink-600',
]

function getGradient(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  CREATOR: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  CONSUMER: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

export function ProfileView() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const navigate = useAppStore((s) => s.navigate)
  const clearUser = useAppStore((s) => s.clearUser)

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName)
  }, [user?.displayName])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateProfile({ displayName })
      setUser(updated)
      setEditing(false)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      // continue even if logout fails
    } finally {
      clearUser()
      setLoggingOut(false)
    }
  }

  if (!user) return null

  const gradient = getGradient(user.id)
  const initial = user.displayName?.[0]?.toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-sm flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate('feed')}
          className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setEditing((prev) => !prev)}
          className="text-white text-sm font-medium hover:text-gray-300 transition-colors"
        >
          Edit
        </button>
      </div>

      {/* Profile section */}
      <div className="flex flex-col items-center px-4 pt-6 pb-4">
        {/* Avatar */}
        <div
          className={`w-20 h-20 rounded-full ${gradient} flex items-center justify-center text-white text-3xl font-bold shrink-0 mb-4`}
        >
          {initial}
        </div>

        {/* Name + email */}
        <h2 className="text-white text-xl font-bold">{user.displayName}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>

        {/* Role badge */}
        <Badge
          variant="outline"
          className={`mt-2 text-[11px] px-2.5 py-0.5 rounded-full border ${ROLE_COLORS[user.role] || ROLE_COLORS.CONSUMER}`}
        >
          {user.role}
        </Badge>

        {/* Stats row */}
        <div className="flex items-center gap-10 mt-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <p className="text-white text-lg font-bold">12</p>
            </div>
            <p className="text-gray-500 text-xs mt-0.5">Comments</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 text-gray-500" />
              <p className="text-white text-lg font-bold">8</p>
            </div>
            <p className="text-gray-500 text-xs mt-0.5">Ratings</p>
          </div>
        </div>
      </div>

      {/* Edit profile section (expandable) */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Pencil className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300 text-sm font-medium">Edit Profile</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-white/10 border-white/10 text-white h-10 flex-1"
                  placeholder="Display name"
                  autoFocus
                />
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-white text-black hover:bg-white/90 h-10 px-4 font-semibold rounded-lg shrink-0"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu items */}
      <div className="px-4 mt-4 space-y-1 border-t border-white/10 pt-3">
        {user.role === 'CREATOR' && (
          <button
            onClick={() => navigate('creator-dashboard')}
            className="w-full flex items-center gap-3 p-3.5 rounded-lg hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-white text-sm flex-1">Creator Dashboard</span>
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        )}

        {user.role === 'ADMIN' && (
          <button
            onClick={() => navigate('admin-dashboard')}
            className="w-full flex items-center gap-3 p-3.5 rounded-lg hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-white text-sm flex-1">Admin Dashboard</span>
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        )}

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 p-3.5 rounded-lg hover:bg-white/5 transition-colors text-left"
        >
          {loggingOut ? (
            <Loader2 className="h-5 w-5 text-red-500 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5 text-red-500" />
          )}
          <span className="text-red-500 text-sm flex-1">Log Out</span>
        </button>
      </div>
    </div>
  )
}
