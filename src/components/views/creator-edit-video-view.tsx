'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Loader2, ArrowLeft } from 'lucide-react'
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
      queryClient.invalidateQueries({ queryKey: ['video-detail', selectedVideoId] })
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

  if (isLoading) return <div className="container mx-auto px-4 py-6"><DetailSkeleton /></div>
  if (!video) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('creator-videos')}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to My Videos
      </Button>

      <h1 className="text-2xl font-bold">Edit Video</h1>

      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="space-y-4"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Video Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" {...register('title', { required: true })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-publisher">Publisher</Label>
                <Input id="edit-publisher" {...register('publisher', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-producer">Producer</Label>
                <Input id="edit-producer" {...register('producer', { required: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Genre</Label>
                <Select value={genreValue} onValueChange={(v) => setValue('genre', v as Genre)}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Age Rating</Label>
                <Select value={ageRatingValue} onValueChange={(v) => setValue('ageRating', v as AgeRating)}>
                  <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea id="edit-desc" {...register('description')} rows={4} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('creator-videos')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
