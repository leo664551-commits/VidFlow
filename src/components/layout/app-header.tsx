'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Search,
  User,
  LogOut,
  Menu,
  LayoutDashboard,
  Video,
  Upload,
  Users,
  MessageSquare,
  Plus,
  Home,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { signOut } from 'next-auth/react'

export function AppHeader() {
  const { user, navigate, searchQuery, setSearchQuery } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(searchQuery)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    navigate('search')
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    useAppStore.getState().clearUser()
    setMobileOpen(false)
  }

  const closeMobile = () => setMobileOpen(false)

  const consumerLinks = [
    { label: 'Home', icon: Home, view: 'consumer-home' as const },
  ]

  const creatorLinks = [
    { label: 'Dashboard', icon: LayoutDashboard, view: 'creator-dashboard' as const },
    { label: 'My Videos', icon: Video, view: 'creator-videos' as const },
    { label: 'Upload', icon: Upload, view: 'creator-upload' as const },
  ]

  const adminLinks = [
    { label: 'Dashboard', icon: LayoutDashboard, view: 'admin-dashboard' as const },
    { label: 'Creators', icon: Plus, view: 'admin-creators' as const },
    { label: 'Users', icon: Users, view: 'admin-users' as const },
    { label: 'Videos', icon: Video, view: 'admin-videos' as const },
    { label: 'Comments', icon: MessageSquare, view: 'admin-comments' as const },
  ]

  const navLinks =
    user?.role === 'ADMIN'
      ? adminLinks
      : user?.role === 'CREATOR'
        ? creatorLinks
        : user
          ? consumerLinks
          : []

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center gap-4 px-4">
        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle>StreamVault</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.view}
                  onClick={() => {
                    navigate(link.view)
                    closeMobile()
                  }}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted transition-colors text-left"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <button
          onClick={() => navigate(user ? (user.role === 'ADMIN' ? 'admin-dashboard' : user.role === 'CREATOR' ? 'creator-dashboard' : 'consumer-home') : 'landing')}
          className="flex items-center gap-2 font-bold text-lg shrink-0"
        >
          <Video className="h-5 w-5" />
          <span className="hidden sm:inline">StreamVault</span>
        </button>

        {/* Search (center) */}
        {user && user.role === 'CONSUMER' && (
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                className="pl-9 h-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </form>
        )}

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-auto">
          {navLinks.map((link) => (
            <Button
              key={link.view}
              variant="ghost"
              size="sm"
              onClick={() => navigate(link.view)}
              className="gap-1.5"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Button>
          ))}
        </nav>

        {/* User menu / Auth buttons */}
        <div className="flex items-center gap-2 ml-auto md:ml-0">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {user.displayName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('profile')}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('login')}>
                Login
              </Button>
              <Button size="sm" onClick={() => navigate('register')}>
                Register
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
