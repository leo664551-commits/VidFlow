'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import { Play } from 'lucide-react'

export function LandingView() {
  const navigate = useAppStore((s) => s.navigate)

  return (
    <div className="h-full w-full bg-black flex flex-col items-center justify-center px-8 relative overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center max-w-sm w-full"
      >
        {/* Logo icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5E70FF] to-[#24BBA9] flex items-center justify-center mb-6 shadow-xl shadow-[#5E70FF]/25">
          <Play className="h-8 w-8 text-white ml-1 fill-white" />
        </div>

        {/* App name */}
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
          Vid<span className="text-[#5E70FF]">Flow</span>
        </h1>
        <p className="text-gray-400 text-sm mb-10">
          Short videos, big entertainment
        </p>

        {/* Auth buttons */}
        <div className="w-full flex flex-col items-center gap-3">
          <button
            onClick={() => navigate('login')}
            className="w-64 h-12 bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-semibold rounded-full text-sm shadow-lg shadow-[#5E70FF]/30 transition-all"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('register')}
            className="w-64 h-12 border border-white/20 text-white font-semibold rounded-full text-sm hover:bg-white/10 transition-colors"
          >
            Register
          </button>
        </div>
      </motion.div>
    </div>
  )
}
