'use client'

import { useState } from 'react'
import { useApp } from '@/lib/app-context'
import type { SubmissionEntry } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SubmissionModal } from '@/components/submission-modal'
import { Video, ImageIcon, Play, CheckCircle2, XCircle, RotateCcw, Clock } from 'lucide-react'

type Status = 'all' | 'pending' | 'approved' | 'rejected'

export default function SubmissionsPage() {
  const { submissionList, approved, rejected, rejectionNotes, signOff, reject } = useApp()
  const [filter, setFilter] = useState<Status>('all')
  const [selected, setSelected] = useState<SubmissionEntry | null>(null)

  const counts: Record<Status, number> = {
    all:      submissionList.length,
    pending:  submissionList.filter(s => s.status === 'pending').length,
    approved: submissionList.filter(s => s.status === 'approved').length,
    rejected: submissionList.filter(s => s.status === 'rejected').length,
  }

  const visible = submissionList.filter(s => filter === 'all' || s.status === filter)

  function getRevisionOf(sub: SubmissionEntry) {
    return sub.revisionOf ? submissionList.find(s => s.id === sub.revisionOf) : undefined
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Submissions</h1>
          <p className="text-slate-500 mt-1">
            {counts.pending} pending · {counts.approved} approved · {counts.rejected} returned
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as Status[]).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className={`gap-2 ${filter === f ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
            >
              {f === 'rejected' ? 'Returned' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                filter === f ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {counts[f]}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {visible.map(sub => {
          const isApproved = sub.status === 'approved'
          const isRejected = sub.status === 'rejected'
          const isRevision = !!sub.revisionOf

          return (
            <Card
              key={sub.id}
              className={`overflow-hidden transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                isApproved || isRejected ? 'opacity-75' : ''
              }`}
              onClick={() => setSelected(sub)}
            >
              <div className="relative bg-slate-100 aspect-video flex items-center justify-center">
                {sub.type === 'video' ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 opacity-80" />
                    <div className="relative flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <Play className="w-6 h-6 text-white ml-0.5" />
                      </div>
                      {sub.duration && <span className="text-white/80 text-xs">{sub.duration}</span>}
                    </div>
                    <Badge className="absolute top-2 right-2 bg-black/40 text-white border-0 text-xs gap-1">
                      <Video className="w-2.5 h-2.5" /> Video
                    </Badge>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-200 to-blue-300" />
                    <div className="relative flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-sky-600/60" />
                    </div>
                    <Badge className="absolute top-2 right-2 bg-black/40 text-white border-0 text-xs gap-1">
                      <ImageIcon className="w-2.5 h-2.5" /> Photo
                    </Badge>
                  </>
                )}

                {/* Status icon top-left */}
                <div className="absolute top-2 left-2">
                  {isApproved && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {isRejected && <XCircle className="w-5 h-5 text-red-400" />}
                </div>

                {/* Revision badge */}
                {isRevision && (
                  <div className="absolute bottom-2 left-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-500 text-white px-1.5 py-0.5 rounded">
                      <RotateCcw className="w-2.5 h-2.5" /> Revision
                    </span>
                  </div>
                )}
              </div>

              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${sub.clientColor}`}>
                    {sub.clientInitials}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">{sub.clientName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{sub.exerciseName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
                  <Clock className="w-3 h-3" />
                  {sub.date}
                </div>

                {isApproved && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Signed off — click to view notes
                  </div>
                )}
                {isRejected && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                    <XCircle className="w-3.5 h-3.5" />
                    Returned for revision
                  </div>
                )}
                {!isApproved && !isRejected && (
                  <p className="text-xs text-slate-400 italic">
                    {isRevision ? 'Revised submission — click to review' : 'Click to review'}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {visible.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">All caught up!</p>
          <p className="text-sm mt-1">No submissions in this filter.</p>
        </div>
      )}

      <SubmissionModal
        key={selected?.id}
        submission={selected}
        isApproved={selected?.status === 'approved'}
        isRejected={selected?.status === 'rejected'}
        rejectionNote={selected ? (rejectionNotes.get(selected.id) ?? selected.notes) : ''}
        revisionOf={selected ? getRevisionOf(selected) : undefined}
        onClose={() => setSelected(null)}
        onSignOff={signOff}
        onReject={reject}
      />
    </div>
  )
}
