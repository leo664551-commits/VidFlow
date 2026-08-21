'use client'

import { Badge } from '@/components/ui/badge'

interface AdminStatusBadgeProps {
  status: string
  className?: string
  size?: 'sm' | 'md'
}

export function AdminStatusBadge({ status, className = '', size = 'sm' }: AdminStatusBadgeProps) {
  const normalized = status.toUpperCase()
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'

  switch (normalized) {
    // User / Creator Status
    case 'ACTIVE':
    case 'APPROVED':
    case 'READY':
    case 'VISIBLE':
    case 'RESOLVED':
    case 'QUALIFYING':
      return (
        <Badge
          variant="outline"
          className={`font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 shrink-0" />
          {normalized}
        </Badge>
      )

    // Pending / Processing / Review Status
    case 'PENDING':
    case 'PROCESSING':
    case 'UNDER REVIEW':
    case 'IN_REVIEW':
    case 'UPLOADING':
    case 'NORMAL':
      return (
        <Badge
          variant="outline"
          className={`font-semibold bg-amber-500/10 text-amber-400 border-amber-500/30 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 shrink-0 animate-pulse" />
          {normalized}
        </Badge>
      )

    // High Priority / Critical
    case 'HIGH':
    case 'CRITICAL':
    case 'URGENT':
      return (
        <Badge
          variant="outline"
          className={`font-bold bg-rose-500/15 text-rose-400 border-rose-500/40 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5 shrink-0 animate-ping" />
          {normalized}
        </Badge>
      )

    // Disabled / Suspended / Rejected / Failed / Removed Status
    case 'DISABLED':
    case 'SUSPENDED':
    case 'REJECTED':
    case 'FAILED':
    case 'UNPUBLISHED':
    case 'HIDDEN':
    case 'REMOVED':
      return (
        <Badge
          variant="outline"
          className={`font-semibold bg-red-500/10 text-red-400 border-red-500/30 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5 shrink-0" />
          {normalized}
        </Badge>
      )

    // Roles & Neutral
    case 'ADMIN':
      return (
        <Badge
          variant="outline"
          className={`font-semibold bg-purple-500/10 text-purple-300 border-purple-500/30 ${sizeClasses} ${className}`}
        >
          ADMIN
        </Badge>
      )
    case 'CREATOR':
      return (
        <Badge
          variant="outline"
          className={`font-semibold bg-[#25F4EE]/10 text-[#25F4EE] border-[#25F4EE]/30 ${sizeClasses} ${className}`}
        >
          CREATOR
        </Badge>
      )
    case 'CONSUMER':
      return (
        <Badge
          variant="outline"
          className={`font-semibold bg-zinc-800 text-zinc-300 border-zinc-700 ${sizeClasses} ${className}`}
        >
          CONSUMER
        </Badge>
      )
    case 'DISMISSED':
    case 'LOW':
    default:
      return (
        <Badge
          variant="outline"
          className={`font-semibold bg-zinc-800 text-zinc-400 border-zinc-700 ${sizeClasses} ${className}`}
        >
          {normalized}
        </Badge>
      )
  }
}
