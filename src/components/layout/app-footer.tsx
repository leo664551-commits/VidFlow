'use client'

import { Video } from 'lucide-react'

export function AppFooter() {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4" />
          <span className="font-medium">StreamVault</span>
        </div>
        <p>&copy; {new Date().getFullYear()} StreamVault. All rights reserved.</p>
      </div>
    </footer>
  )
}
