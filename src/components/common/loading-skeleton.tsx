'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function VideoGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[9/16] w-full rounded-2xl bg-zinc-900 border border-white/5" />
          <Skeleton className="h-4 w-3/4 bg-zinc-800" />
          <Skeleton className="h-3 w-1/2 bg-zinc-800" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 bg-zinc-800" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1 bg-zinc-900" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-white/10 p-4 bg-zinc-900">
            <Skeleton className="h-4 w-24 bg-zinc-800" />
            <Skeleton className="h-8 w-16 bg-zinc-800" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl bg-zinc-900" />
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <Skeleton className="h-[calc(100vh-32px)] max-h-[860px] w-full max-w-[420px] aspect-[9/16] rounded-3xl bg-zinc-900 border border-white/10" />
    </div>
  )
}
