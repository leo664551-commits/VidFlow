'use client'

import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-12 w-12 text-gray-500 mb-4" />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 mt-1 max-w-sm">
          {description}
        </p>
      )}
    </div>
  )
}
