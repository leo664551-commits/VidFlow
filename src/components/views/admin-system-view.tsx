'use client'

import { useState } from 'react'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Sliders,
  Layers,
  Shield,
  CheckCircle2,
  Server,
  Key,
} from 'lucide-react'

export function AdminSystemView() {
  const [categories, setCategories] = useState([
    'Comedy',
    'Action',
    'Drama',
    'Science Fiction',
    'Horror',
    'Documentary',
    'Animation',
    'Thriller',
    'Romance',
    'Music',
    'Other',
  ])
  const [newCat, setNewCat] = useState('')

  const handleAddCategory = () => {
    if (!newCat.trim()) return
    if (categories.includes(newCat.trim())) {
      toast.error('Category already exists')
      return
    }
    setCategories([...categories, newCat.trim()])
    setNewCat('')
    toast.success(`Category "${newCat.trim()}" added to platform taxonomy`)
  }

  const handleSaveSettings = () => {
    toast.success('Platform system configuration updated')
  }

  return (
    <AdminLayout>
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Platform Settings & Policies</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#5E70FF]/15 text-[#5E70FF] border border-[#5E70FF]/30">
              Configuration
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Global content categories, watch verification rules, and administrative policies.
          </p>
        </div>

        <Button
          onClick={handleSaveSettings}
          className="bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-bold text-xs h-9 shadow-md shadow-[#5E70FF]/25"
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          Save System Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Categories Manager (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl">
            <CardHeader className="p-5 pb-3 border-b border-zinc-800">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#24BBA9]" />
                Content Taxonomies & Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="New category name..."
                  className="bg-zinc-950 border-zinc-800 text-white text-xs h-9"
                />
                <Button
                  onClick={handleAddCategory}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs shrink-0"
                >
                  Add Category
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-200"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Verification Rules (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl">
            <CardHeader className="p-5 pb-3 border-b border-zinc-800">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#5E70FF]" />
                Authoritative Metrics Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="font-bold text-white">View Verification Rule</span>
                <p className="text-zinc-400">
                  A view is counted authoritatively only when watch duration &ge; 5 seconds OR completion &ge; 30%.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="font-bold text-white">Creator Category Revision Limit</span>
                <p className="text-zinc-400">
                  Approved creators may modify their public category up to 2 times to prevent brand hijacking.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="font-bold text-white">Application Review Governance</span>
                <p className="text-zinc-400">
                  Every approval/rejection automatically generates an immutable audit record and updates role transitions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
