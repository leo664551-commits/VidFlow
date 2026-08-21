'use client'

import { useState } from 'react'

export interface UserAvatarProps {
  src?: string | null
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  className?: string
  bordered?: boolean
  role?: string | null
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl',
  '3xl': 'w-28 h-28 text-4xl',
}

export function UserAvatar({
  src,
  name,
  size = 'md',
  className = '',
  bordered = false,
  role,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)

  const initial = (name?.trim()?.[0] || 'U').toUpperCase()
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md

  const content = src && !imageError ? (
    <img
      src={src}
      alt={name || 'Avatar'}
      onError={() => setImageError(true)}
      className="w-full h-full rounded-full object-cover"
    />
  ) : (
    <div className="w-full h-full rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center font-bold text-white shadow-inner select-none">
      {initial}
    </div>
  )

  if (bordered) {
    return (
      <div
        className={`relative shrink-0 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-[#FE2C55] to-purple-600 shadow-md ${sizeClasses} ${className}`}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center ${sizeClasses} ${className}`}
    >
      {content}
    </div>
  )
}
