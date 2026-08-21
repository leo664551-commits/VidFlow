'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface AdminPaginationProps {
  page: number
  totalPages: number
  totalItems?: number
  limit?: number
  onPageChange: (page: number) => void
  className?: string
}

export function AdminPagination({
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  className = '',
}: AdminPaginationProps) {
  if (totalPages <= 1 && (!totalItems || totalItems <= (limit || 10))) {
    return null
  }

  const startItem = totalItems ? (page - 1) * (limit || 10) + 1 : undefined
  const endItem = totalItems ? Math.min(page * (limit || 10), totalItems) : undefined

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-2 text-xs text-zinc-400 ${className}`}>
      <div>
        {totalItems !== undefined && startItem !== undefined && endItem !== undefined ? (
          <span>
            Showing <strong className="text-white">{startItem}</strong> to{' '}
            <strong className="text-white">{endItem}</strong> of{' '}
            <strong className="text-white">{totalItems.toLocaleString()}</strong> results
          </span>
        ) : (
          <span>
            Page <strong className="text-white">{page}</strong> of{' '}
            <strong className="text-white">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          title="First Page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          title="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="px-3 py-1 bg-zinc-800/80 rounded-md border border-zinc-700/50 font-semibold text-white">
          {page} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          title="Next Page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          title="Last Page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
