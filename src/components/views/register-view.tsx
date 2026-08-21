'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/store/app-store'
import { register as apiRegister, login, getAuthUser } from '@/lib/api'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

const registerSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type RegisterValues = z.infer<typeof registerSchema>

export function RegisterView() {
  const navigate = useAppStore((s) => s.navigate)
  const setUser = useAppStore((s) => s.setUser)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  })

  const onSubmit = async (values: RegisterValues) => {
    setLoading(true)
    try {
      await apiRegister({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
        role: 'CONSUMER',
      })
      await login(values.email, values.password)
      const user = await getAuthUser()
      setUser(user)
      toast.success('Account created!')
      navigate('feed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-black flex flex-col scrollbar-thin scrollbar-thumb-zinc-800">
      {/* Back arrow */}
      <div className="px-4 pt-4">
        <button
          onClick={() => navigate('landing')}
          className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex-1 flex flex-col items-center justify-center px-6 -mt-8"
      >
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg-name" className="text-gray-300 text-sm">
                Display Name
              </Label>
              <Input
                id="reg-name"
                placeholder="Your display name"
                className="bg-white/10 border-white/10 text-white placeholder-gray-500 h-11 focus-visible:ring-white/20"
                {...register('displayName')}
              />
              {errors.displayName && (
                <p className="text-red-400 text-xs">{errors.displayName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-email" className="text-gray-300 text-sm">
                Email
              </Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                className="bg-white/10 border-white/10 text-white placeholder-gray-500 h-11 focus-visible:ring-white/20"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-red-400 text-xs">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-password" className="text-gray-300 text-sm">
                Password
              </Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="Create a password"
                className="bg-white/10 border-white/10 text-white placeholder-gray-500 h-11 focus-visible:ring-white/20"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-red-400 text-xs">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-white text-black hover:bg-white/90 font-semibold rounded-lg"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <button
              type="button"
              className="text-white font-medium hover:underline"
              onClick={() => navigate('login')}
            >
              Sign in
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
