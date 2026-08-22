'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createCreator } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import { UserPlus, Loader2, ArrowLeft } from 'lucide-react'

export function AdminCreatorNewView() {
  const { navigate } = useAppStore()
  const queryClient = useQueryClient()
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
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-recent-audit-logs'] })
      toast.success('Creator account provisioned successfully')
      navigate('admin-creators')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create creator')
    },
  })

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('admin-creators')}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Creators
          </Button>
          <span className="text-xs text-[#24BBA9] font-bold uppercase tracking-wider">
            Direct Creator Provisioning
          </span>
        </div>

        <Card className="bg-zinc-900/90 border-zinc-800 shadow-2xl">
          <CardHeader className="border-b border-zinc-800 pb-4">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#5E70FF]" />
              Manual Creator Provisioning
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                mutation.mutate()
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-300">Email Address</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@vidflow.com"
                  className="bg-zinc-950 border-zinc-800 text-white text-xs h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-300">Display Name</Label>
                  <Input
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="bg-zinc-950 border-zinc-800 text-white text-xs h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-300">Creator Handle</Label>
                  <Input
                    required
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    placeholder="alex_creator"
                    className="bg-zinc-950 border-zinc-800 text-white text-xs h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-300">Password</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-zinc-950 border-zinc-800 text-white text-xs h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-300">Creator Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="About this creator..."
                  className="bg-zinc-950 border-zinc-800 text-white text-xs"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-bold text-xs h-10 shadow-lg shadow-[#5E70FF]/25"
                >
                  {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Provision Creator Account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
