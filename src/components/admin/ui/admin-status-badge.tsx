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
          className={`font-semibold bg-[#48B321]/10 text-[#48B321] border-[#48B321]/30 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#48B321] mr-1.5 shrink-0" />
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
          className={`font-semibold bg-[#FF8D28]/10 text-[#FF8D28] border-[#FF8D28]/30 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF8D28] mr-1.5 shrink-0 animate-pulse" />
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
          className={`font-bold bg-[#DF4D50]/15 text-[#DF4D50] border-[#DF4D50]/40 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#DF4D50] mr-1.5 shrink-0 animate-ping" />
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
          className={`font-semibold bg-[#DF4D50]/10 text-[#DF4D50] border-[#DF4D50]/30 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#DF4D50] mr-1.5 shrink-0" />
          {normalized}
        </Badge>
      )

    // Roles & Neutral
    case 'ADMIN':
      return (
        <Badge
          variant="outline"
          className={`font-semibold bg-[#5E70FF]/15 text-[#5E70FF] border-[#5E70FF]/30 ${sizeClasses} ${className}`}
        >
          ADMIN
        </Badge>
      )
    case 'CREATOR':
      return (
        <Badge
          variant="outline"
          className={`font-semibold bg-[#24BBA9]/15 text-[#24BBA9] border-[#24BBA9]/30 ${sizeClasses} ${className}`}
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
