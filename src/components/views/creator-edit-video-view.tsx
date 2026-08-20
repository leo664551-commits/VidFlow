'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getVideoDetail, updateVideo } from '@/lib/api'
import { GENRES, AGE_RATINGS } from '@/config'
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import { DetailSkeleton } from '@/components/common/loading-skeleton'
import { Loader2, ArrowLeft, Save } from 'lucide-react'
import type { Genre, AgeRating } from '@/types'
import { useForm } from 'react-hook-form'

interface FormData {
  title: string
  publisher: string
  producer: string
  genre: Genre
  ageRating: AgeRating
  description: string
}

export function CreatorEditVideoView() {
  const selectedVideoId = useAppStore((s) => s.selectedVideoId)
  const navigate = useAppStore((s) => s.navigate)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: video, isLoading } = useQuery({
    queryKey: ['video-detail', selectedVideoId],
    queryFn: () => getVideoDetail(selectedVideoId!),
    enabled: !!selectedVideoId,
  })

  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    defaultValues: {
      title: '',
      publisher: '',
      producer: '',
      genre: 'OTHER',
      ageRating: 'G',
      description: '',
    },
    values: video
      ? {
          title: video.title,
          publisher: video.publisher,
          producer: video.producer,
          genre: video.genre,
          ageRating: video.ageRating,
          description: video.description ?? '',
        }
      : undefined,
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      updateVideo(selectedVideoId!, {
        title: data.title,
        publisher: data.publisher,
        producer: data.producer,
        genre: data.genre,
        ageRating: data.ageRating,
        description: data.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['video-detail', selectedVideoId],
      })
      queryClient.invalidateQueries({ queryKey: ['creator-videos'] })
      toast({ title: 'Video updated' })
      navigate('creator-videos')
    },
    onError: (err) => {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      })
    },
  })

  const genreValue = watch('genre')
  const ageRatingValue = watch('ageRating')

  if (isLoading)
    return (
      <div className="min-h-screen bg-gray-950 p-4">
        <DetailSkeleton />
      </div>
    )
  if (!video) return null

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center px-4 h-12">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-white hover:bg-white/10 -ml-2"
            onClick={() => navigate('feed')}
            aria-label="Back to feed"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 text-center text-lg font-semibold text-white -ml-12">
            Edit Video
          </h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="px-4 pt-6">
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4"
        >
          <Card className="bg-gray-900 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">
                Video Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-title"
                  className="text-gray-300 text-sm"
                >
                  Title
                </Label>
                <Input
                  id="edit-title"
                  {...register('title', { required: true })}
                  className="bg-gray-800 border-white/10 text-white h-10 focus-visible:ring-white/20 placeholder:text-gray-600"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit-publisher"
                    className="text-gray-300 text-sm"
                  >
                    Publisher
                  </Label>
                  <Input
                    id="edit-publisher"
                    {...register('publisher', { required: true })}
                    className="bg-gray-800 border-white/10 text-white h-10 focus-visible:ring-white/20 placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit-producer"
                    className="text-gray-300 text-sm"
                  >
                    Producer
                  </Label>
                  <Input
                    id="edit-producer"
                    {...register('producer', { required: true })}
                    className="bg-gray-800 border-white/10 text-white h-10 focus-visible:ring-white/20 placeholder:text-gray-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Genre</Label>
                  <Select
                    value={genreValue}
                    onValueChange={(v) => setValue('genre', v as Genre)}
                  >
                    <SelectTrigger className="bg-gray-800 border-white/10 text-white h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">
                    Age Rating
                  </Label>
                  <Select
                    value={ageRatingValue}
                    onValueChange={(v) => setValue('ageRating', v as AgeRating)}
                  >
                    <SelectTrigger className="bg-gray-800 border-white/10 text-white h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_RATINGS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-desc"
                  className="text-gray-300 text-sm"
                >
                  Description
                </Label>
                <Textarea
                  id="edit-desc"
                  {...register('description')}
                  rows={4}
                  className="bg-gray-800 border-white/10 text-white focus-visible:ring-white/20 placeholder:text-gray-600"
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('creator-videos')}
              className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-white text-gray-950 hover:bg-gray-200 font-medium"
            >
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Save className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
