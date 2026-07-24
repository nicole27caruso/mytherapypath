'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Play, CheckCircle2, XCircle, RotateCcw, Video, ImageIcon } from 'lucide-react'
import type { SubmissionEntry } from '@/lib/mock-data'

interface SubmissionModalProps {
  submission: SubmissionEntry | null
  isApproved: boolean
  isRejected: boolean
  rejectionNote: string
  revisionOf?: SubmissionEntry
  onClose: () => void
  onSignOff: (id: string, note: string) => void
  onReject: (id: string, note: string) => void
}

export function SubmissionModal({
  submission,
  isApproved,
  isRejected,
  rejectionNote,
  revisionOf,
  onClose,
  onSignOff,
  onReject,
}: SubmissionModalProps) {
  const [note, setNote] = useState(
    isRejected ? rejectionNote : (submission?.notes ?? '')
  )
  const [confirmed, setConfirmed] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  if (!submission) return null

  function handleSignOff() {
    setConfirmed(true)
    setTimeout(() => {
      onSignOff(submission!.id, note)
      onClose()
    }, 800)
  }

  function handleReject() {
    setRejecting(true)
    setTimeout(() => {
      onReject(submission!.id, note)
      onClose()
    }, 800)
  }

  const isPending = !isApproved && !isRejected

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">

          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${submission.clientColor}`}>
                {submission.clientInitials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{submission.clientName}</p>
                  {submission.revisionOf && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      <RotateCcw className="w-3 h-3" />
                      Revision #{submission.revisionNumber}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{submission.exerciseName} · {submission.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="gap-1 bg-slate-100 text-slate-600 hover:bg-slate-100">
                {submission.type === 'video'
                  ? <Video className="w-3 h-3" />
                  : <ImageIcon className="w-3 h-3" />}
                {submission.type}
              </Badge>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 bg-slate-900 flex items-center justify-center min-h-64 relative">
              {submission.type === 'video' ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center hover:bg-white/20 cursor-pointer transition-colors">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                  <p className="text-white/60 text-sm">Click to play</p>
                  {submission.duration && (
                    <Badge className="bg-black/40 text-white border-0">{submission.duration}</Badge>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-white/40">
                  <ImageIcon className="w-16 h-16" />
                  <p className="text-sm">Photo submission</p>
                </div>
              )}
            </div>

            <div className="w-72 flex flex-col border-l">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Exercise</p>
                  <p className="text-sm font-medium text-slate-900">{submission.exerciseName}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Submitted</p>
                  <p className="text-sm text-slate-700">{submission.date}</p>
                </div>

                {/* Show original rejection note when reviewing a revision */}
                {revisionOf && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      Previous Rejection ({revisionOf.date})
                    </p>
                    <p className="text-xs text-red-700 italic leading-relaxed">
                      &ldquo;{revisionOf.notes}&rdquo;
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    {isRejected ? 'Rejection Reason' : isPending ? 'Notes / Rejection Reason' : 'Therapist Notes'}
                  </p>
                  {isApproved ? (
                    <p className="text-sm text-slate-600 italic border-l-2 border-emerald-300 pl-3">
                      &ldquo;{note || 'No notes added.'}&rdquo;
                    </p>
                  ) : isRejected ? (
                    <p className="text-sm text-red-700 italic border-l-2 border-red-300 pl-3">
                      &ldquo;{rejectionNote || 'No reason provided.'}&rdquo;
                    </p>
                  ) : (
                    <textarea
                      className="w-full border rounded-lg p-2.5 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                      rows={5}
                      placeholder="Add clinical notes (approve) or explain what to redo (reject)..."
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="p-4 border-t">
                {isApproved ? (
                  <div className="flex items-center gap-2 text-emerald-600 justify-center py-1">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Signed off</span>
                  </div>
                ) : isRejected ? (
                  <div className="flex items-center gap-2 text-red-500 justify-center py-1">
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Returned for revision</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className={`flex-1 border-red-200 transition-colors ${
                        rejecting
                          ? 'bg-red-500 text-white border-red-500 hover:bg-red-500'
                          : 'text-red-600 hover:bg-red-50 hover:border-red-300'
                      }`}
                      onClick={handleReject}
                    >
                      {rejecting ? '✕ Rejected' : 'Reject'}
                    </Button>
                    <Button
                      className={`flex-1 transition-colors ${
                        confirmed ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-teal-600 hover:bg-teal-700'
                      }`}
                      onClick={handleSignOff}
                    >
                      {confirmed ? '✓ Approved!' : 'Approve'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
