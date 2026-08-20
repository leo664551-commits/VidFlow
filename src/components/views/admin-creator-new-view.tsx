'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createCreator } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, Loader2, ArrowLeft } from 'lucide-react'

export function AdminCreatorNewView() {
  const navigate = useAppStore((s) => s.navigate)
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [password, setPassword] = useState('')
  const [description, setDescription] = useState('')

  const mutation = useMutation({
    mutationFn: () => createCreator({ email, displayName, creatorName, password, description: description || undefined }),
    onSuccess: () => { toast({ title: 'Creator created successfully' }); navigate('admin-creators') },
    onError: (err) => { toast({ title: 'Failed to create creator', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' }) },
  })

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center justify-center h-14 px-4 relative">
          <Button variant="ghost" size="icon" className="absolute left-2 sm:left-4 text-gray-400 hover:text-white hover:bg-gray-800" onClick={() => navigate('feed')} aria-label="Back to feed">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-white">Create Creator</h1>
        </div>
      </header>

      <div className="px-4 pt-6">
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4 max-w-lg mx-auto">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <UserPlus className="h-4 w-4 text-amber-400" />
                </div>
                Creator Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="creator-email" className="text-gray-300 text-sm">Email</Label>
                <Input id="creator-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-gray-800 border-gray-700 text-white h-10 focus-visible:ring-gray-600 focus-visible:border-gray-600 placeholder-gray-500" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="creator-display" className="text-gray-300 text-sm">Display Name</Label>
                <Input id="creator-display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="bg-gray-800 border-gray-700 text-white h-10 focus-visible:ring-gray-600 focus-visible:border-gray-600 placeholder-gray-500" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="creator-name" className="text-gray-300 text-sm">Creator Name</Label>
                <Input id="creator-name" value={creatorName} onChange={(e) => setCreatorName(e.target.value)} required className="bg-gray-800 border-gray-700 text-white h-10 focus-visible:ring-gray-600 focus-visible:border-gray-600 placeholder-gray-500" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="creator-password" className="text-gray-300 text-sm">Password</Label>
                <Input id="creator-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="bg-gray-800 border-gray-700 text-white h-10 focus-visible:ring-gray-600 focus-visible:border-gray-600 placeholder-gray-500" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="creator-desc" className="text-gray-300 text-sm">Description</Label>
                <Textarea id="creator-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-gray-800 border-gray-700 text-white focus-visible:ring-gray-600 focus-visible:border-gray-600 placeholder-gray-500" />
              </div>
            </CardContent>
          </Card>
          <Button type="submit" disabled={mutation.isPending} className="w-full bg-amber-500 text-black hover:bg-amber-400 font-semibold h-11">
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Creator
          </Button>
        </form>
      </div>
    </div>
  )
}
