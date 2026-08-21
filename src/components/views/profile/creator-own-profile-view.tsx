'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import {
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  getMyProfile,
  getCreatorVideos,
  getMyLikedVideos,
  getCreatorDashboard,
} from '@/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  ArrowLeft,
  Share2,
  Pencil,
  Sparkles,
  Play,
  Eye,
  Plus,
  LayoutDashboard,
  Upload,
  Camera,
  Trash2,
  Globe,
  Mail,
  Instagram,
  Youtube,
  Twitter,
  AtSign,
  ExternalLink,
  Copy,
  Check,
  Heart,
  Star,
  Film,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FollowListModal } from '@/components/modals/follow-list-modal'
import { CATEGORY_MAP, getCategoryEmoji } from '../creator-profile-view'
import { UserAvatar } from '@/components/common/user-avatar'
import { FeedVideo, VideoWithCreator } from '@/types'

const GENRE_GRADIENTS: Record<string, string> = {
  ACTION: 'from-red-600 via-rose-800 to-black',
  COMEDY: 'from-amber-500 via-yellow-700 to-black',
  DRAMA: 'from-purple-600 via-indigo-900 to-black',
  HORROR: 'from-zinc-700 via-gray-900 to-black',
  SCIENCE_FICTION: 'from-cyan-600 via-blue-900 to-black',
  DOCUMENTARY: 'from-emerald-600 via-teal-900 to-black',
  ANIMATION: 'from-pink-500 via-rose-900 to-black',
  THRILLER: 'from-orange-600 via-amber-900 to-black',
  ROMANCE: 'from-rose-500 via-pink-900 to-black',
  MUSIC: 'from-violet-600 via-purple-900 to-black',
  OTHER: 'from-gray-600 via-zinc-900 to-black',
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function CreatorOwnProfileView() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const navigate = useAppStore((s) => s.navigate)
  const goBack = useAppStore((s) => s.goBack)
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'videos' | 'liked' | 'reviews'>('videos')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [copiedUsername, setCopiedUsername] = useState(false)

  // Edit creator form states
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || '')
  const [editUsername, setEditUsername] = useState(user?.username || '')
  const [editBio, setEditBio] = useState(user?.bio || '')
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(user?.avatarUrl || null)
  const [editGender, setEditGender] = useState(user?.gender || 'PREFER_NOT_TO_SAY')
  const [editWebsite, setEditWebsite] = useState(user?.website || '')
  const [editInstagram, setEditInstagram] = useState(user?.instagram || '')
  const [editYoutube, setEditYoutube] = useState(user?.youtube || '')
  const [editTwitter, setEditTwitter] = useState(user?.twitter || '')
  const [editContactEmail, setEditContactEmail] = useState(user?.contactEmail || '')
  const [editCategory, setEditCategory] = useState(user?.category || 'Comedy')
  const [editCustomCategory, setEditCustomCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [followModalOpen, setFollowModalOpen] = useState(false)
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Authoritative fresh user profile from DB
  const { data: userProfile } = useQuery({
    queryKey: ['user-me'],
    queryFn: getMyProfile,
    enabled: !!user,
  })

  // Creator's published videos
  const { data: creatorVideosData, isLoading: videosLoading } = useQuery({
    queryKey: ['creator-my-videos', user?.id],
    queryFn: () => getCreatorVideos({ limit: 50 }),
    enabled: !!user,
  })

  // Creator's private liked videos
  const { data: likedVideosData, isLoading: likedLoading } = useQuery({
    queryKey: ['my-liked-videos'],
    queryFn: getMyLikedVideos,
    enabled: !!user,
  })

  // Creator's received ratings & reviews from dashboard
  const { data: dashboardData } = useQuery({
    queryKey: ['creator-dashboard'],
    queryFn: getCreatorDashboard,
    enabled: !!user,
  })

  const activeUser = userProfile || user
  const displayUsername =
    activeUser?.username ||
    activeUser?.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') ||
    `user_${activeUser?.id.slice(-4)}`

  // Authoritative counts
  const postsCount = activeUser?.postCount ?? creatorVideosData?.pagination?.total ?? 0
  const followersCount = activeUser?.followerCount ?? 0
  const followingCount = activeUser?.followingCount ?? 0

  const videosList = creatorVideosData?.data || []
  const likedVideosList = likedVideosData?.data || []
  const ratingsSummary = dashboardData?.ratings

  const hasSocialLinks =
    activeUser?.instagram ||
    activeUser?.youtube ||
    activeUser?.twitter ||
    activeUser?.website ||
    activeUser?.contactEmail

  const handleOpenEditModal = () => {
    setEditDisplayName(activeUser?.displayName || '')
    setEditUsername(displayUsername)
    setEditBio(activeUser?.bio || '')
    setEditAvatarUrl(activeUser?.avatarUrl || null)
    setEditGender(activeUser?.gender || 'PREFER_NOT_TO_SAY')
    setEditWebsite(activeUser?.website || '')
    setEditInstagram(activeUser?.instagram || '')
    setEditYoutube(activeUser?.youtube || '')
    setEditTwitter(activeUser?.twitter || '')
    setEditContactEmail(activeUser?.contactEmail || '')
    setEditCategory(activeUser?.category || 'Comedy')
    setEditModalOpen(true)
  }

  // Handle avatar upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploadingAvatar(true)
    try {
      const res = await uploadAvatar(file)
      setEditAvatarUrl(res.avatarUrl)
      toast.success('Avatar uploaded!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Avatar upload failed')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      await deleteAvatar()
      setEditAvatarUrl(null)
      toast.success('Avatar removed')
    } catch {
      setEditAvatarUrl(null)
    }
  }

  // Save creator profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editDisplayName.trim()) {
      toast.error('Display name cannot be empty')
      return
    }

    const cleanUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '')
    if (cleanUsername.length < 3) {
      toast.error('Username must be at least 3 characters long')
      return
    }

    const finalCategory =
      editCategory === 'Other' ? editCustomCategory.trim() || 'Other' : editCategory

    setSaving(true)
    try {
      const updated = await updateProfile({
        displayName: editDisplayName.trim(),
        username: cleanUsername,
        bio: editBio.trim(),
        avatarUrl: editAvatarUrl || undefined,
        gender: editGender,
        website: editWebsite.trim() || undefined,
        instagram: editInstagram.trim().replace(/^@/, '') || undefined,
        youtube: editYoutube.trim() || undefined,
        twitter: editTwitter.trim().replace(/^@/, '') || undefined,
        contactEmail: editContactEmail.trim() || undefined,
        category: finalCategory,
      })

      setUser({
        ...user!,
        displayName: updated.displayName,
        username: updated.username,
        bio: updated.bio,
        avatarUrl: updated.avatarUrl,
        gender: updated.gender,
        website: updated.website,
        instagram: updated.instagram,
        youtube: updated.youtube,
        twitter: updated.twitter,
        contactEmail: updated.contactEmail,
        category: updated.category,
        categoryChangeCount: updated.categoryChangeCount,
      })

      queryClient.invalidateQueries({ queryKey: ['user-me'] })
      queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] })
      setEditModalOpen(false)
      toast.success('Creator profile updated!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyUsername = () => {
    const handle = `@${displayUsername}`
    navigator.clipboard.writeText(handle)
    setCopiedUsername(true)
    toast.success(`Copied ${handle} to clipboard!`)
    setTimeout(() => setCopiedUsername(false), 2000)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/platform/@${displayUsername}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${activeUser?.displayName || 'Creator'} on VidFlow`,
          text: `Check out @${displayUsername} on VidFlow!`,
          url,
        })
        return
      } catch {}
    }
    navigator.clipboard.writeText(url)
    toast.success('Profile link copied to clipboard!')
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-black pb-24 scrollbar-thin scrollbar-thumb-zinc-800">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <button
          onClick={() => goBack('feed')}
          className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-bold text-white text-sm truncate max-w-[200px]">
            {activeUser?.displayName || 'Creator Profile'}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">@{displayUsername}</span>
        </div>
        <button
          onClick={handleShare}
          className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
          aria-label="Share"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Creator Profile Header Content */}
      <div className="px-4 pt-6 pb-2 max-w-2xl mx-auto">
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Avatar with gradient border */}
          <div className="relative group shrink-0">
            <UserAvatar
              src={activeUser?.avatarUrl}
              name={activeUser?.displayName}
              size="2xl"
              bordered
            />
            {/* Quick edit photo overlay */}
            <button
              onClick={handleOpenEditModal}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#FE2C55] text-white flex items-center justify-center border-2 border-black shadow-lg hover:scale-110 transition-transform"
              aria-label="Change photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Creator Info & Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                {activeUser?.displayName || 'Creator'}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                CREATOR
              </span>
            </div>

            {/* Username Tag */}
            <div className="flex items-center gap-1.5 mb-3">
              <button
                onClick={handleCopyUsername}
                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all"
                title="Click to copy username"
              >
                <AtSign className="w-3 h-3 text-[#FE2C55]" />
                <span>{displayUsername}</span>
                {copiedUsername ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-500 group-hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>

            {/* Authoritative Stats Row: posts, followers, following */}
            <div className="flex items-center gap-5 sm:gap-7 text-sm select-none">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1">
                <span className="font-bold text-white text-base">{postsCount}</span>
                <span className="text-gray-400 text-xs sm:text-sm">posts</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFollowModalTab('followers')
                  setFollowModalOpen(true)
                }}
                className="flex flex-col sm:flex-row sm:items-center sm:gap-1 group cursor-pointer hover:opacity-80 transition-opacity text-left"
              >
                <span className="font-bold text-white text-base group-hover:text-[#FE2C55] transition-colors">
                  {formatNumber(followersCount)}
                </span>
                <span className="text-gray-400 text-xs sm:text-sm">followers</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFollowModalTab('following')
                  setFollowModalOpen(true)
                }}
                className="flex flex-col sm:flex-row sm:items-center sm:gap-1 group cursor-pointer hover:opacity-80 transition-opacity text-left"
              >
                <span className="font-bold text-white text-base group-hover:text-[#FE2C55] transition-colors">
                  {formatNumber(followingCount)}
                </span>
                <span className="text-gray-400 text-xs sm:text-sm">following</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bio & Niche Category */}
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold text-[#25F4EE] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Digital creator
            </p>
            {activeUser?.category && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-xs font-bold text-purple-300 shadow-sm">
                <span>{getCategoryEmoji(activeUser.category)}</span>
                <span>{activeUser.category}</span>
              </span>
            )}
          </div>

          {activeUser?.bio ? (
            <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">
              {activeUser.bio}
            </p>
          ) : (
            <button
              onClick={handleOpenEditModal}
              className="text-xs font-semibold text-[#FE2C55] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add a bio to your profile
            </button>
          )}

          {/* Social Links Row */}
          {hasSocialLinks && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {activeUser?.instagram && (
                <a
                  href={`https://instagram.com/${activeUser.instagram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-pink-500/20 text-xs font-semibold text-pink-300 hover:scale-105 transition-all"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>@{activeUser.instagram.replace(/^@/, '')}</span>
                </a>
              )}
              {activeUser?.youtube && (
                <a
                  href={
                    activeUser.youtube.startsWith('http')
                      ? activeUser.youtube
                      : `https://youtube.com/${activeUser.youtube.startsWith('@') ? activeUser.youtube : `@${activeUser.youtube}`}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-950/40 border border-red-500/20 text-xs font-semibold text-red-300 hover:scale-105 transition-all"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>YouTube</span>
                </a>
              )}
              {activeUser?.twitter && (
                <a
                  href={`https://x.com/${activeUser.twitter.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-950/40 border border-sky-500/20 text-xs font-semibold text-sky-300 hover:scale-105 transition-all"
                >
                  <Twitter className="w-3.5 h-3.5" />
                  <span>@{activeUser.twitter.replace(/^@/, '')}</span>
                </a>
              )}
              {activeUser?.website && (
                <a
                  href={
                    activeUser.website.startsWith('http')
                      ? activeUser.website
                      : `https://${activeUser.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white hover:scale-105 transition-all"
                >
                  <Globe className="w-3.5 h-3.5 text-teal-400" />
                  <span className="truncate max-w-[130px]">
                    {activeUser.website.replace(/^https?:\/\//, '')}
                  </span>
                  <ExternalLink className="w-3 h-3 text-gray-500" />
                </a>
              )}
              {activeUser?.contactEmail && (
                <a
                  href={`mailto:${activeUser.contactEmail}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/40 border border-amber-500/20 text-xs font-semibold text-amber-300 hover:scale-105 transition-all"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>{activeUser.contactEmail}</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons: Edit Profile, Creator Studio, Share */}
        <div className="flex items-center gap-2.5 mt-5 flex-wrap">
          <button
            onClick={handleOpenEditModal}
            className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20 flex items-center justify-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </button>

          <button
            onClick={() => navigate('creator-dashboard')}
            className="flex-1 min-w-[140px] py-2.5 rounded-xl bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            Creator Studio
          </button>

          <button
            onClick={handleShare}
            className="w-11 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center border border-white/10 transition-all shadow-lg shrink-0"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Creator Profile Tabs */}
      <div className="max-w-2xl mx-auto mt-4">
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors relative flex items-center justify-center gap-1.5 ${
              activeTab === 'videos' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>My Videos ({postsCount})</span>
            {activeTab === 'videos' && (
              <motion.div
                layoutId="creatorProfileTabLine"
                className="absolute bottom-0 inset-x-6 h-0.5 bg-[#FE2C55]"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('liked')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors relative flex items-center justify-center gap-1.5 ${
              activeTab === 'liked' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
            <span>Liked</span>
            {activeTab === 'liked' && (
              <motion.div
                layoutId="creatorProfileTabLine"
                className="absolute bottom-0 inset-x-6 h-0.5 bg-[#FE2C55]"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors relative flex items-center justify-center gap-1.5 ${
              activeTab === 'reviews' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            <span>Ratings & Reviews</span>
            {activeTab === 'reviews' && (
              <motion.div
                layoutId="creatorProfileTabLine"
                className="absolute bottom-0 inset-x-6 h-0.5 bg-[#FE2C55]"
              />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* TAB 1: CREATOR VIDEOS */}
          {activeTab === 'videos' && (
            videosLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#FE2C55]" />
              </div>
            ) : videosList.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {videosList.map((v: VideoWithCreator) => {
                  const gradient = GENRE_GRADIENTS[v.genre] || GENRE_GRADIENTS.OTHER
                  return (
                    <div
                      key={v.id}
                      onClick={() => navigate('video-detail', v.id)}
                      className="aspect-[9/16] rounded-xl overflow-hidden relative cursor-pointer group bg-zinc-900 border border-white/10 shadow-md"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-b ${gradient} group-hover:scale-105 transition-transform duration-300`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between text-[11px] font-semibold text-white">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-gray-300" />
                          {formatNumber(v.viewCount || 0)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 uppercase">
                          {v.genre}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-gray-500 space-y-3">
                <p className="text-sm font-semibold">No videos uploaded yet</p>
                <button
                  onClick={() => navigate('creator-upload')}
                  className="px-5 py-2.5 rounded-xl bg-[#FE2C55] text-white font-bold text-xs shadow-lg inline-flex items-center gap-2 hover:bg-[#FE2C55]/90 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  Upload your first video
                </button>
              </div>
            )
          )}

          {/* TAB 2: LIKED VIDEOS */}
          {activeTab === 'liked' && (
            likedLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#FE2C55]" />
              </div>
            ) : likedVideosList.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {likedVideosList.map((v: FeedVideo) => {
                  const gradient = GENRE_GRADIENTS[v.genre] || GENRE_GRADIENTS.OTHER
                  return (
                    <div
                      key={v.id}
                      onClick={() => navigate('video-detail', v.id)}
                      className="aspect-[9/16] rounded-xl overflow-hidden relative cursor-pointer group bg-zinc-900 border border-white/10 shadow-md"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-b ${gradient} group-hover:scale-105 transition-transform duration-300`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                      <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between text-[11px] font-semibold text-white">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-gray-300" />
                          {formatNumber(v.viewCount || 0)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 uppercase truncate max-w-[60px]">
                          {v.creator?.creatorName || v.genre}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-gray-500 space-y-3">
                <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                  <Heart className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">No liked videos yet</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Videos you like while browsing the feed will appear here privately.
                </p>
              </div>
            )
          )}

          {/* TAB 3: RATINGS & REVIEWS (Received from Audience) */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {/* Overall Aggregate Score Card */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-400 block uppercase">
                    Audience Reputation
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-black text-amber-400">
                      ⭐ {ratingsSummary?.averageRating?.toFixed(1) || '0.0'}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({ratingsSummary?.totalRatings || 0} reviews)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('creator-dashboard')}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all border border-white/10"
                >
                  View Analytics
                </button>
              </div>

              {/* Reviews List */}
              {ratingsSummary?.reviews && ratingsSummary.reviews.length > 0 ? (
                <div className="space-y-3">
                  {ratingsSummary.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            src={rev.user?.avatarUrl}
                            name={rev.user?.displayName}
                            size="sm"
                          />
                          <span className="text-xs font-bold text-white">
                            {rev.user?.displayName || 'Viewer'}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-amber-400">
                          ⭐ {rev.overallRating ? rev.overallRating.toFixed(1) : rev.rating}/10
                        </span>
                      </div>
                      {rev.review && (
                        <p className="text-xs text-gray-300 italic">"{rev.review}"</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <p className="text-xs">No audience reviews received yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CREATOR EDIT PROFILE MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white flex items-center justify-between">
              <span>Edit Creator Profile</span>
              <span className="text-xs font-normal text-gray-400">Public & Socials</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            {/* Avatar Picker with Permanent Storage Upload */}
            <div className="flex flex-col items-center justify-center gap-3 py-2 border-b border-white/10 pb-4">
              <div
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <UserAvatar
                  src={editAvatarUrl}
                  name={editDisplayName}
                  size="2xl"
                  bordered
                />
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarFileChange}
                accept="image/*"
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      {editAvatarUrl ? 'Change Photo' : 'Upload Photo'}
                    </>
                  )}
                </button>
                {editAvatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-500/20 text-xs font-semibold text-red-400 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>Unique Username</span>
                <span className="text-[10px] text-[#25F4EE] font-normal">Cannot be duplicated</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                  @
                </span>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) =>
                    setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))
                  }
                  placeholder="username"
                  maxLength={30}
                  required
                  className="w-full rounded-xl bg-zinc-900 border border-white/10 pl-8 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FE2C55] transition-all font-mono"
                />
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">Creator / Channel Name</label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Channel Name"
                maxLength={50}
                required
                className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FE2C55] transition-all"
              />
            </div>

            {/* Category / Niche with Lifetime 2-Change Limit */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300">Content Category / Niche</label>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    (activeUser?.categoryChangeCount || 0) >= 2
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}
                >
                  {Math.max(0, 2 - (activeUser?.categoryChangeCount || 0))}/2 lifetime changes left
                </span>
              </div>

              {(activeUser?.categoryChangeCount || 0) >= 2 ? (
                <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 flex items-center gap-2.5">
                  <span className="text-xl">{getCategoryEmoji(activeUser?.category)}</span>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {activeUser?.category || 'Comedy'}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      🔒 Category is locked (2 lifetime changes reached).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(CATEGORY_MAP).map(([key, item]) => {
                    const isSelected = editCategory === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEditCategory(key)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border text-left ${
                          isSelected
                            ? 'bg-[#FE2C55] text-white border-[#FE2C55] shadow-md scale-[1.02]'
                            : 'bg-zinc-900 text-gray-300 border-white/10 hover:bg-zinc-800'
                        }`}
                      >
                        <span className="text-base shrink-0">{item.emoji}</span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300">Bio</label>
                <span className="text-[10px] text-gray-500">{editBio.length}/500</span>
              </div>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Tell your audience about your channel and passions..."
                className="w-full rounded-xl bg-zinc-900 border border-white/10 p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FE2C55] transition-all resize-none"
              />
            </div>

            {/* Social Links */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <h4 className="text-xs font-black text-gray-300 uppercase tracking-wider">
                Creator Links & Inquiries
              </h4>

              {/* Instagram */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                  Instagram Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    value={editInstagram}
                    onChange={(e) => setEditInstagram(e.target.value)}
                    placeholder="instagram_handle"
                    maxLength={100}
                    className="w-full rounded-xl bg-zinc-900 border border-white/10 pl-7 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#FE2C55]"
                  />
                </div>
              </div>

              {/* YouTube */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                  <Youtube className="w-3.5 h-3.5 text-red-400" />
                  YouTube Channel / URL
                </label>
                <input
                  type="text"
                  value={editYoutube}
                  onChange={(e) => setEditYoutube(e.target.value)}
                  placeholder="https://youtube.com/@channel or channel_name"
                  maxLength={150}
                  className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#FE2C55]"
                />
              </div>

              {/* Twitter */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                  <Twitter className="w-3.5 h-3.5 text-sky-400" />
                  Twitter / X Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    value={editTwitter}
                    onChange={(e) => setEditTwitter(e.target.value)}
                    placeholder="twitter_handle"
                    maxLength={100}
                    className="w-full rounded-xl bg-zinc-900 border border-white/10 pl-7 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#FE2C55]"
                  />
                </div>
              </div>

              {/* Website */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-teal-400" />
                  Portfolio / Website URL
                </label>
                <input
                  type="url"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  maxLength={200}
                  className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#FE2C55]"
                />
              </div>

              {/* Business Contact Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  Business Inquiries Email
                </label>
                <input
                  type="email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  placeholder="business@example.com"
                  maxLength={100}
                  className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#FE2C55]"
                />
              </div>
            </div>

            {/* Save Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Follow List Modal */}
      {followModalOpen && (
        <FollowListModal
          isOpen={followModalOpen}
          onClose={() => setFollowModalOpen(false)}
          initialTab={followModalTab}
          userId={activeUser?.id || ''}
          title={activeUser?.displayName || displayUsername}
        />
      )}
    </div>
  )
}
