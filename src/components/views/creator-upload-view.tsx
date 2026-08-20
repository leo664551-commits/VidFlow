'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Progress } from '@/components/ui/progress'
import { uploadRaw, completeUpload } from '@/lib/api'
import { GENRES, AGE_RATINGS } from '@/config'
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import { Upload, FileVideo, CheckCircle2, Loader2 } from 'lucide-react'
import type { Genre, AgeRating } from '@/types'

export function CreatorUploadView() {
  const navigate = useAppStore((s) => s.navigate)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [publisher, setPublisher] = useState('')
  const [producer, setProducer] = useState('')
  const [genre, setGenre] = useState<Genre>('OTHER')
  const [ageRating, setAgeRating] = useState<AgeRating>('G')
  const [description, setDescription] = useState('')
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<'select' | 'details' | 'uploading' | 'complete'>('select')
  const [videoId, setVideoId] = useState('')

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected')
      setStep('uploading')
      setProgress(0)

      // Simulate progress while uploading
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90))
      }, 300)

      try {
        const result = await uploadRaw(file)
        clearInterval(interval)
        setProgress(100)
        setVideoId(result.videoId)
        return result
      } catch (err) {
        clearInterval(interval)
        throw err
      }
    },
    onSuccess: (result) => {
      // Now complete the upload with metadata
      completeUpload(result.videoId, {
        title: title || file!.name.replace(/\.[^.]+$/, ''),
        publisher,
        producer,
        genre,
        ageRating,
        description: description || undefined,
      })
        .then(() => {
          setStep('complete')
          queryClient.invalidateQueries({ queryKey: ['creator-videos'] })
          queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] })
          toast({ title: 'Video uploaded successfully!' })
        })
        .catch((err) => {
          toast({
            title: 'Failed to save metadata',
            description: err instanceof Error ? err.message : 'Error',
            variant: 'destructive',
          })
          setStep('details')
        })
    },
    onError: (err) => {
      setStep('select')
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      })
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
      setStep('details')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    uploadMutation.mutate()
  }

  if (step === 'complete') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <Card>
          <CardContent className="py-12 space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
            <h2 className="text-xl font-bold">Upload Complete</h2>
            <p className="text-sm text-muted-foreground">
              Your video has been uploaded and will be processed shortly.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('creator-videos')}>
                My Videos
              </Button>
              <Button onClick={() => {
                setStep('select')
                setFile(null)
                setTitle('')
                setPublisher('')
                setProducer('')
                setDescription('')
                setProgress(0)
              }}>
                Upload Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>

      {step === 'select' && (
        <Card>
          <CardContent className="py-12">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium">Click to select a video file</p>
              <p className="text-sm text-muted-foreground mt-1">
                MP4 or WebM, up to 500MB
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/webm"
              className="hidden"
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>
      )}

      {step === 'details' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileVideo className="h-5 w-5" />
                {file?.name}
              </CardTitle>
              <CardDescription>
                {(file!.size / (1024 * 1024)).toFixed(1)} MB
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upload-title">Title</Label>
                <Input
                  id="upload-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="upload-publisher">Publisher</Label>
                  <Input
                    id="upload-publisher"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload-producer">Producer</Label>
                  <Input
                    id="upload-producer"
                    value={producer}
                    onChange={(e) => setProducer(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Genre</Label>
                  <Select value={genre} onValueChange={(v) => setGenre(v as Genre)}>
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
                  <Select
                    value={ageRating}
                    onValueChange={(v) => setAgeRating(v as AgeRating)}
                  >
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
                <Label htmlFor="upload-desc">Description</Label>
                <Textarea
                  id="upload-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep('select')
                setFile(null)
              }}
            >
              Back
            </Button>
            <Button type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Upload Video
            </Button>
          </div>
        </form>
      )}

      {step === 'uploading' && (
        <Card>
          <CardContent className="py-12 space-y-4">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-muted-foreground" />
          <h2 className="text-lg font-semibold text-center">Uploading...</h2>
          <Progress value={progress} className="max-w-md mx-auto" />
          <p className="text-sm text-muted-foreground text-center">{progress}%</p>
        </CardContent>
      </Card>
      )}
    </div>
  )
}
