'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import { LogIn, Loader2 } from 'lucide-react'

export function LoginView() {
  const navigate = useAppStore((s) => s.navigate)
  const setUser = useAppStore((s) => s.setUser)
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        setError('Invalid email or password')
        return
      }

      const meRes = await fetch('/api/auth/me')
      if (meRes.ok) {
        const user = await meRes.json()
        setUser(user)
        toast({ title: 'Welcome back!', description: `Signed in as ${user.displayName}` })
        const view =
          user.role === 'ADMIN'
            ? 'admin-dashboard' as const
            : user.role === 'CREATOR'
              ? 'creator-dashboard' as const
              : 'consumer-home' as const
        navigate(view)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <LogIn className="h-5 w-5" />
            Sign In
          </CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign In
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
                onClick={() => navigate('register')}
              >
                Register
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
