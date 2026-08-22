'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Music,
  Heart,
  MessageCircle,
  Share2,
  Check,
  ChevronDown,
  CloudUpload,
  FileVideo,
} from 'lucide-react'
import { uploadRaw, completeUpload } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import type { Genre, AgeRating } from '@/types'

const PRIVACY_OPTIONS = [
  { id: 'public', label: 'Public', desc: 'Anyone on VidFlow can watch this video' },
  { id: 'friends', label: 'Friends', desc: 'Only your followers can watch this video' },
  { id: 'private', label: 'Private', desc: 'Only you can watch this video' },
]

export function CreatorUploadView() {
  const { navigate, goBack } = useAppStore()
  const user = useAppStore((s) => s.user)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [selectedCoverIdx, setSelectedCoverIdx] = useState(0)
  const [coverFrames, setCoverFrames] = useState<string[]>([])
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public')
  const [privacyDropdownOpen, setPrivacyDropdownOpen] = useState(false)
  const [allowComments, setAllowComments] = useState(true)
  const [genre, setGenre] = useState<Genre>('OTHER')
  const [ageRating, setAgeRating] = useState<AgeRating>('PG')
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const handleBack = () => {
    goBack('creator-dashboard')
  }

  const processSelectedFile = (selectedFile: File) => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }
    setFile(selectedFile)
    if (!caption) {
      setCaption(selectedFile.name.replace(/\.[^.]+$/, ''))
    }
    const url = URL.createObjectURL(selectedFile)
    setVideoPreviewUrl(url)

    // Extract 7 real video frame snapshots using in-memory HTML5 video + canvas
    const video = document.createElement('video')
    video.src = url
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'

    video.onloadeddata = async () => {
      try {
        const duration = video.duration || 5
        const count = 7
        const extracted: string[] = []

        for (let i = 0; i < count; i++) {
          const targetTime = Math.min((duration / (count + 1)) * (i + 1), Math.max(duration - 0.1, 0))
          video.currentTime = targetTime
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked)
              resolve()
            }
            video.addEventListener('seeked', onSeeked)
          })

          const canvas = document.createElement('canvas')
          canvas.width = 120
          canvas.height = 160
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            extracted.push(canvas.toDataURL('image/jpeg', 0.8))
          }
        }

        if (extracted.length > 0) {
          setCoverFrames(extracted)
        }
      } catch (err) {
        console.warn('Frame extraction notice:', err)
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.type.startsWith('video/')) {
        toast.error('Please select a valid MP4 or WebM video file')
        return
      }
      processSelectedFile(selectedFile)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      if (!droppedFile.type.startsWith('video/')) {
        toast.error('Please drop a valid video file')
        return
      }
      processSelectedFile(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDiscard = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }
    setFile(null)
    setVideoPreviewUrl(null)
    setCoverFrames([])
    setCaption('')
    setSelectedCoverIdx(0)
    setPrivacy('public')
    setAllowComments(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const insertTag = (char: '#' | '@') => {
    setCaption((prev) => (prev.endsWith(' ') || prev === '' ? `${prev}${char}` : `${prev} ${char}`))
  }

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No video file selected')
      setIsUploading(true)
      setProgress(10)

      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 85))
      }, 250)

      try {
        const uploadRes = await uploadRaw(file)
        clearInterval(interval)
        setProgress(95)

        const creatorName = user?.creatorProfile?.creatorName || user?.displayName || 'Creator'
        await completeUpload(uploadRes.videoId, {
          title: caption.trim() || file.name.replace(/\.[^.]+$/, ''),
          publisher: creatorName,
          producer: creatorName,
          genre,
          ageRating,
          description: caption.trim(),
        })

        setProgress(100)
        return uploadRes
      } catch (err) {
        clearInterval(interval)
        throw err
      } finally {
        setIsUploading(false)
      }
    },
    onSuccess: () => {
      setUploadSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['creator-videos'] })
      queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['creator-my-videos'] })
      queryClient.invalidateQueries({ queryKey: ['user-me'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success('Your video has been posted successfully!')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Video upload failed')
    },
  })

  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 select-none">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center space-y-5 rounded-3xl bg-zinc-900/90 border border-white/10 p-8 shadow-2xl"
        >
          <div className="w-20 h-20 rounded-full bg-[#48B321]/20 text-[#48B321] mx-auto flex items-center justify-center border border-[#48B321]/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white">Video Published!</h2>
          <p className="text-sm text-gray-400">
            Your video is ready and visible to your viewers on VidFlow.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate('creator-videos')}
              className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-bold text-sm text-white transition-all border border-white/10"
            >
              My Videos
            </button>
            <button
              onClick={() => {
                setUploadSuccess(false)
                handleDiscard()
              }}
              className="flex-1 py-3 rounded-xl bg-[#5E70FF] hover:bg-[#4D5FE8] font-bold text-sm text-white transition-all shadow-lg shadow-[#5E70FF]/25"
            >
              Upload Another
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  const creatorInitial = user?.displayName?.[0]?.toUpperCase() || 'C'
  const creatorHandle = user?.creatorProfile?.creatorName || user?.displayName || 'creator'

  return (
    <div className="h-full w-full overflow-y-auto bg-black text-white pb-32 select-none scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth">
      {/* Top Navigation Bar with Back Button */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 py-3 border-b border-white/10">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors py-1.5 px-3 rounded-xl hover:bg-white/5"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-semibold hidden sm:inline">Back</span>
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-base sm:text-lg font-bold text-white leading-tight">Upload video</h1>
          <p className="text-xs text-gray-400 hidden sm:block">Post a video to your account</p>
        </div>
        <div className="w-16" />
      </div>

      {/* Main Studio Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ======================================================== */}
          {/* LEFT COLUMN: Upload Dropzone or Live Smartphone Preview */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 flex flex-col items-center">
            {!file ? (
              /* State 1: Dashed Upload Box */
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="w-full max-w-[420px] aspect-[9/12] sm:aspect-[9/13] rounded-3xl border-2 border-dashed border-zinc-700 hover:border-[#5E70FF] bg-zinc-950/60 hover:bg-zinc-900/40 p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group shadow-xl"
              >
                {/* Cloud Upload Icon Badge */}
                <div className="w-20 h-20 rounded-2xl bg-zinc-900 border-2 border-amber-500/80 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-[#5E70FF] transition-all shadow-lg">
                  <CloudUpload className="w-10 h-10 text-gray-300 group-hover:text-[#5E70FF] transition-colors" />
                </div>

                <h3 className="text-lg font-bold text-white mb-1">Select video to upload</h3>
                <p className="text-xs text-gray-400 mb-6">Or drag and drop a file</p>

                {/* Specs list */}
                <div className="text-xs text-gray-400 space-y-1.5 mb-8">
                  <p>MP4 or WebM</p>
                  <p>720x1280 resolution or higher</p>
                  <p>Up to 5 minutes</p>
                  <p>Less than 2 GB</p>
                </div>

                {/* Select File Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                  className="w-full max-w-[260px] py-3 rounded-xl bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-bold text-sm shadow-xl shadow-[#5E70FF]/25 transition-all hover:scale-[1.02]"
                >
                  Select file
                </button>
              </div>
            ) : (
              /* State 2: Live Smartphone 9:16 Frame */
              <div className="flex flex-col items-center w-full max-w-[340px] space-y-4">
                <div className="relative w-full aspect-[9/16] rounded-[36px] bg-black border-4 border-zinc-800 shadow-2xl overflow-hidden flex flex-col justify-between">
                  {/* Live Video / Poster */}
                  {videoPreviewUrl ? (
                    <video
                      src={videoPreviewUrl}
                      autoPlay
                      loop
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-black flex items-center justify-center">
                      <FileVideo className="w-12 h-12 text-zinc-600" />
                    </div>
                  )}

                  {/* Dark Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

                  {/* Top Bar inside Phone */}
                  <div className="relative z-10 pt-4 px-4 flex items-center justify-center text-xs font-bold text-white gap-4">
                    <span className="text-gray-400 text-[11px]">Following</span>
                    <span className="text-white border-b-2 border-white pb-0.5 text-xs">For You</span>
                  </div>

                  {/* Right Action Rail inside Phone */}
                  <div className="relative z-10 self-end mr-3 flex flex-col items-center gap-3.5 mb-14">
                    {/* Creator Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5E70FF] to-[#24BBA9] flex items-center justify-center text-white font-bold text-xs border border-white">
                      {creatorInitial}
                    </div>
                    {/* Like */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <Heart className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[9px] font-bold text-white mt-0.5">84.2K</span>
                    </div>
                    {/* Comment */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[9px] font-bold text-white mt-0.5">1.2K</span>
                    </div>
                    {/* Share */}
                    <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                      <Share2 className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Bottom Overlay inside Phone */}
                  <div className="relative z-10 p-4 space-y-1.5">
                    <p className="text-xs font-bold text-white leading-tight">@{creatorHandle}</p>
                    <p className="text-[11px] text-gray-200 line-clamp-2 leading-snug">
                      {caption || 'Your video caption will appear here...'}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-300">
                      <Music className="w-3 h-3 text-[#5E70FF]" />
                      <span className="truncate">Original sound - {creatorHandle}</span>
                    </div>
                  </div>
                </div>

                {/* File info pill & Change video button */}
                <div className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-white/10 shadow-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-[#48B321] shrink-0" />
                    <span className="text-xs text-gray-300 font-medium truncate">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-[#5E70FF] hover:underline shrink-0 ml-2"
                  >
                    Change video
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Video Form & Metadata Details */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 bg-zinc-950/80 rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Caption Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white">Caption</label>
                <span className="text-xs text-gray-400">{caption.length} / 150</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, 150))}
                  placeholder="Add a caption that describes your video..."
                  className="w-full h-12 rounded-xl bg-zinc-900 border border-white/15 px-4 pr-16 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#5E70FF] focus:border-[#5E70FF] transition-all"
                />
                {/* @ and # shortcut buttons inside input */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400">
                  <button
                    type="button"
                    onClick={() => insertTag('@')}
                    className="hover:text-white text-sm font-bold transition-colors"
                  >
                    @
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('#')}
                    className="hover:text-white text-sm font-bold transition-colors"
                  >
                    #
                  </button>
                </div>
              </div>
            </div>

            {/* Cover Frame Strip Selector */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-white">Cover</label>
              <div className="relative rounded-2xl bg-zinc-900 border border-white/10 p-2.5 overflow-hidden">
                <div className="grid grid-cols-7 gap-1.5 h-20 relative">
                  {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedCoverIdx(idx)}
                      className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                        selectedCoverIdx === idx
                          ? 'ring-2 ring-white scale-105 z-10 shadow-lg'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {coverFrames[idx] ? (
                        <img
                          src={coverFrames[idx]}
                          alt={`Cover frame ${idx + 1}`}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      ) : videoPreviewUrl ? (
                        <video
                          src={videoPreviewUrl}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-tr ${
                            idx % 2 === 0
                              ? 'from-[#5E70FF] via-purple-700 to-indigo-900'
                              : 'from-[#24BBA9] via-teal-700 to-zinc-900'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Who can view this video dropdown */}
            <div className="space-y-2 relative">
              <label className="text-sm font-bold text-white">Who can view this video</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPrivacyDropdownOpen(!privacyDropdownOpen)}
                  className="w-full h-12 rounded-xl bg-zinc-900 border border-white/15 px-4 flex items-center justify-between text-sm text-white font-medium hover:border-white/30 transition-all"
                >
                  <span className="capitalize">{privacy}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${privacyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {privacyDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-0 right-0 top-14 z-20 rounded-2xl bg-zinc-900 border border-white/15 p-2 shadow-2xl space-y-1"
                    >
                      {PRIVACY_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setPrivacy(opt.id as any)
                            setPrivacyDropdownOpen(false)
                          }}
                          className={`w-full p-3 rounded-xl text-left flex items-center justify-between transition-colors ${
                            privacy === opt.id ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-300'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-bold text-white">{opt.label}</p>
                            <p className="text-xs text-gray-400">{opt.desc}</p>
                          </div>
                          {privacy === opt.id && <Check className="w-4 h-4 text-[#5E70FF]" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Allow users to: Checkbox */}
            <div className="space-y-3 pt-1">
              <label className="text-sm font-bold text-white">Allow users to:</label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#5E70FF] cursor-pointer"
                  />
                  <span>Comment</span>
                </label>
              </div>
            </div>

            {/* Progress Bar (during active upload) */}
            {isUploading && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1.5 text-white font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5E70FF]" />
                    Uploading video...
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-[#5E70FF] transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(94,112,255,0.6)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Bottom Actions: Discard & Post */}
            <div className="flex items-center gap-4 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isUploading}
                className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm border border-white/15 transition-all"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => uploadMutation.mutate()}
                disabled={!file || isUploading}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
                  !file || isUploading
                    ? 'bg-zinc-800 text-gray-500 cursor-not-allowed border border-white/5'
                    : 'bg-[#5E70FF] hover:bg-[#4D5FE8] text-white shadow-[#5E70FF]/25 hover:scale-[1.02]'
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}
