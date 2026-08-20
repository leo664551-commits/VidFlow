'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    mutationFn: () =>
      createCreator({
        email,
        displayName,
        creatorName,
        password,
        description: description || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Creator created successfully' })
      navigate('admin-creators')
    },
    onError: (err) => {
      toast({
        title: 'Failed to create creator',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      })
    },
  })

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('admin-creators')}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Creators
      </Button>

      <h1 className="text-2xl font-bold">Create Creator</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
        className="space-y-4"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Creator Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="creator-email">Email</Label>
              <Input
                id="creator-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creator-display">Display Name</Label>
              <Input
                id="creator-display"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creator-name">Creator Name</Label>
              <Input
                id="creator-name"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creator-password">Password</Label>
              <Input
                id="creator-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creator-desc">Description</Label>
              <Textarea
                id="creator-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Creator
        </Button>
      </form>
    </div>
  )
}
