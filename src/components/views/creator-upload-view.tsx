'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Progress } from '@/components/ui/progress'
import { uploadRaw, completeUpload } from '@/lib/api'
import { GENRES, AGE_RATINGS } from '@/config'
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import {
  Upload,
  FileVideo,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
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
  const [step, setStep] = useState<
    'select' | 'details' | 'uploading' | 'complete'
  >('select')

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected')
      setStep('uploading')
      setProgress(0)
      const interval = setInterval(
        () => {
          setProgress((p) => Math.min(p + 10, 90))
        },
        300
      )
      try {
        const result = await uploadRaw(file)
        clearInterval(interval)
        setProgress(100)
        return result
      } catch (err) {
        clearInterval(interval)
        throw err
      }
    },
    onSuccess: (result) => {
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
          queryClient.invalidateQueries({
            queryKey: ['creator-dashboard'],
          })
          toast({ title: 'Video uploaded successfully!' })
        })
        .catch((err) => {
          toast({
            title: 'Failed to save metadata',
            description:
              err instanceof Error ? err.message : 'Error',
            variant: 'destructive',
          })
          setStep('details')
        })
    },
    onError: (err) => {
      setStep('select')
      toast({
        title: 'Upload failed',
        description:
          err instanceof Error ? err.message : 'Error',
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
      <div className="min-h-screen bg-gray-950 flex flex-col">
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
              Upload Video
            </h1>
            <div className="w-8" />
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Upload Complete</h2>
            <p className="text-sm text-gray-400">
              Your video has been uploaded and will be processed shortly.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => navigate('creator-videos')}
                className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
              >
                My Videos
              </Button>
              <Button
                onClick={() => {
                  setStep('select')
                  setFile(null)
                  setTitle('')
                  setPublisher('')
                  setProducer('')
                  setDescription('')
                  setProgress(0)
                }}
                className="bg-white text-gray-950 hover:bg-gray-200 font-medium"
              >
                Upload Another
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
            Upload Video
          </h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="px-4 pt-6">
        {step === 'select' && (
          <div
            className="border-2 border-dashed border-white/15 rounded-xl p-12 text-center cursor-pointer hover:border-white/30 hover:bg-white/[0.02] transition-all group"
            onClick={() => fileRef.current?.click()}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-900 flex items-center justify-center group-hover:bg-gray-800 transition-colors">
              <Upload className="h-8 w-8 text-gray-500 group-hover:text-gray-300 transition-colors" />
            </div>
            <p className="text-white font-medium text-lg">
              Click to select a video file
            </p>
            <p className="text-sm text-gray-500 mt-1">
              MP4 or WebM, up to 500MB
            </p>
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card className="bg-gray-900 border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
                  <FileVideo className="h-4 w-4 text-gray-500" />
                  {file?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="upload-title"
                    className="text-gray-300 text-sm"
                  >
                    Title
                  </Label>
                  <Input
                    id="upload-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="bg-gray-800 border-white/10 text-white h-10 focus-visible:ring-white/20 placeholder:text-gray-600"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="upload-publisher"
                      className="text-gray-300 text-sm"
                    >
                      Publisher
                    </Label>
                    <Input
                      id="upload-publisher"
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      required
                      className="bg-gray-800 border-white/10 text-white h-10 focus-visible:ring-white/20 placeholder:text-gray-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="upload-producer"
                      className="text-gray-300 text-sm"
                    >
                      Producer
                    </Label>
                    <Input
                      id="upload-producer"
                      value={producer}
                      onChange={(e) => setProducer(e.target.value)}
                      required
                      className="bg-gray-800 border-white/10 text-white h-10 focus-visible:ring-white/20 placeholder:text-gray-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Genre</Label>
                    <Select
                      value={genre}
                      onValueChange={(v) => setGenre(v as Genre)}
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
                      value={ageRating}
                      onValueChange={(v) => setAgeRating(v as AgeRating)}
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
                    htmlFor="upload-desc"
                    className="text-gray-300 text-sm"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="upload-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="bg-gray-800 border-white/10 text-white focus-visible:ring-white/20 placeholder:text-gray-600"
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
                className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={uploadMutation.isPending}
                className="bg-white text-gray-950 hover:bg-gray-200 font-medium"
              >
                {uploadMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Upload Video
              </Button>
            </div>
          </form>
        )}

        {step === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Uploading...</h2>
            <Progress value={progress} className="max-w-xs mx-auto w-full" />
            <p className="text-sm text-gray-400">{progress}%</p>
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
