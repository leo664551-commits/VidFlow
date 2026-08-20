'use client'

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'

interface PaginationControlsProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null

  const pages: (number | 'ellipsis')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('ellipsis')
    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (page < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages)
  }

  return (
    <Pagination className="mt-6">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(page - 1)}
            className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <PaginationItem key={`e-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                isActive={p === page}
                onClick={() => onPageChange(p)}
                className="cursor-pointer"
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          )
        )}
        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(page + 1)}
            className={
              page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
