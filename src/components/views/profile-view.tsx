'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import { updateProfile } from '@/lib/api'
import { User, Loader2, Mail, Shield } from 'lucide-react'

export function ProfileView() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [editing, setEditing] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: { displayName: string }) => updateProfile(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      setEditing(false)
      toast({ title: 'Profile updated' })
      queryClient.invalidateQueries({ queryKey: ['auth-user'] })
    },
    onError: (err) => {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ displayName })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Display Name</Label>
              <Input
                id="profile-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={!editing || mutation.isPending}
              />
            </div>

            {!editing ? (
              <Button type="button" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDisplayName(user?.displayName ?? '')
                    setEditing(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </form>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Role:</span>
              <Badge variant="secondary">{user?.role}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge
                variant={user?.status === 'ACTIVE' ? 'default' : 'destructive'}
              >
                {user?.status}
              </Badge>
            </div>
            {user?.creatorProfile && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Creator Profile</h4>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{user.creatorProfile.creatorName}</span>
                  </p>
                  {user.creatorProfile.description && (
                    <p className="text-sm text-muted-foreground">
                      {user.creatorProfile.description}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
