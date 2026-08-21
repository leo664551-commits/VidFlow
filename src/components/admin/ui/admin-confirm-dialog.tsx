'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface AdminConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  requireReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  variant?: 'danger' | 'warning' | 'primary'
  isPending?: boolean
  onConfirm: (reason?: string) => void
  onClose: () => void
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  requireReason = false,
  reasonLabel = 'Reason for administrative action',
  reasonPlaceholder = 'Please describe the justification for this action...',
  variant = 'danger',
  isPending = false,
  onConfirm,
  onClose,
}: AdminConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is mandatory for this administrative action.')
      return
    }
    setError('')
    onConfirm(reason)
    setReason('')
  }

  const handleClose = () => {
    setReason('')
    setError('')
    onClose()
  }

  const confirmBtnStyles =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white font-semibold'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white font-semibold'
      : 'bg-cyan-600 hover:bg-cyan-700 text-white font-semibold'

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className={`p-2 rounded-xl border ${
                variant === 'danger'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-white">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-zinc-400 pt-1">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requireReason && (
          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold text-zinc-300">
              {reasonLabel} <span className="text-rose-400">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError('')
              }}
              placeholder={reasonPlaceholder}
              rows={3}
              className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 text-sm focus-visible:ring-zinc-700"
            />
            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
          </div>
        )}

        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel
            onClick={handleClose}
            disabled={isPending}
            className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={isPending}
            className={confirmBtnStyles}
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
