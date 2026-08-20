'use client'

import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import { register } from '@/lib/api'
import { UserPlus, Loader2 } from 'lucide-react'

export function RegisterView() {
  const navigate = useAppStore((s) => s.navigate)
  const setUser = useAppStore((s) => s.setUser)
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'CONSUMER' | 'CREATOR'>('CONSUMER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await register({ email, displayName, password, role })
      setUser(user)
      toast({
        title: 'Account created!',
        description: `Welcome, ${user.displayName}`,
      })
      const view =
        user.role === 'CREATOR' ? ('creator-dashboard' as const) : ('consumer-home' as const)
      navigate(view)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Account
          </CardTitle>
          <CardDescription>
            Join StreamVault to start sharing or watching videos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-name">Display Name</Label>
              <Input
                id="reg-name"
                placeholder="Your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as 'CONSUMER' | 'CREATOR')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSUMER">Consumer</SelectItem>
                  <SelectItem value="CREATOR">Creator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Account
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
                onClick={() => navigate('login')}
              >
                Sign In
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
