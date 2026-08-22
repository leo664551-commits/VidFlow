'use client'

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface AdminStatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  colorClass?: string
  trend?: {
    value: string
    isPositive: boolean
    label?: string
  }
  badge?: string
  onClick?: () => void
}

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  colorClass = 'text-[#5E70FF]',
  trend,
  badge,
  onClick,
}: AdminStatCardProps) {
  return (
    <Card
      onClick={onClick}
      className={`bg-zinc-900/90 border-zinc-800/80 shadow-md transition-all ${
        onClick ? 'cursor-pointer hover:border-zinc-700 hover:bg-zinc-900' : ''
      }`}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-zinc-800/90 border border-zinc-700/50">
              <Icon className={`w-5 h-5 ${colorClass}`} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
          </div>
          {badge && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#FF8D28]/10 text-[#FF8D28] border border-[#FF8D28]/30">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>

          {trend && (
            <div
              className={`flex items-center gap-1 text-xs font-semibold ${
                trend.isPositive ? 'text-[#48B321]' : 'text-[#DF4D50]'
              }`}
            >
              {trend.isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
