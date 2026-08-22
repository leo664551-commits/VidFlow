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
      ? 'bg-[#DF4D50] hover:bg-[#DF4D50]/90 text-white font-semibold shadow-md'
      : variant === 'warning'
      ? 'bg-[#FF8D28] hover:bg-[#FF8D28]/90 text-black font-bold shadow-md'
      : 'bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-semibold shadow-md'

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className={`p-2 rounded-xl border ${
                variant === 'danger'
                  ? 'bg-[#DF4D50]/10 border-[#DF4D50]/30 text-[#DF4D50]'
                  : 'bg-[#FF8D28]/10 border-[#FF8D28]/30 text-[#FF8D28]'
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
