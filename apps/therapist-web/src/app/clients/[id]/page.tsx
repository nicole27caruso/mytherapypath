'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/app-context'
import type { SubmissionEntry } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Video, ImageIcon,
  RotateCcw, CalendarDays, Activity, ClipboardList, Repeat2,
} from 'lucide-react'

// ─── Mock historical data ──────────────────────────────────────────────────────

// Weekly completion history per client (most recent week first)
const WEEKLY_HISTORY: Record<string, Array<{ week: string; completed: number; target: number }>> = {
  '1': [
    { week: 'Jul 7 – Jul 13',  completed: 2, target: 3 },
    { week: 'Jun 30 – Jul 6',  completed: 3, target: 3 },
    { week: 'Jun 23 – Jun 29', completed: 3, target: 3 },
    { week: 'Jun 16 – Jun 22', completed: 2, target: 3 },
    { week: 'Jun 9 – Jun 15',  completed: 3, target: 3 },
    { week: 'Jun 2 – Jun 8',   completed: 1, target: 3 },
    { week: 'May 26 – Jun 1',  completed: 3, target: 3 },
    { week: 'May 19 – May 25', completed: 2, target: 3 },
  ],
  '2': [
    { week: 'Jul 7 – Jul 13',  completed: 4, target: 5 },
    { week: 'Jun 30 – Jul 6',  completed: 5, target: 5 },
    { week: 'Jun 23 – Jun 29', completed: 5, target: 5 },
    { week: 'Jun 16 – Jun 22', completed: 4, target: 5 },
    { week: 'Jun 9 – Jun 15',  completed: 5, target: 5 },
    { week: 'Jun 2 – Jun 8',   completed: 5, target: 5 },
    { week: 'May 26 – Jun 1',  completed: 3, target: 5 },
    { week: 'May 19 – May 25', completed: 4, target: 5 },
  ],
  '3': [
    { week: 'Jul 7 – Jul 13',  completed: 3, target: 3 },
    { week: 'Jun 30 – Jul 6',  completed: 3, target: 3 },
    { week: 'Jun 23 – Jun 29', completed: 3, target: 3 },
    { week: 'Jun 16 – Jun 22', completed: 3, target: 3 },
    { week: 'Jun 9 – Jun 15',  completed: 2, target: 3 },
    { week: 'Jun 2 – Jun 8',   completed: 3, target: 3 },
    { week: 'May 26 – Jun 1',  completed: 3, target: 3 },
    { week: 'May 19 – May 25', completed: 3, target: 3 },
  ],
  '4': [
    { week: 'Jul 7 – Jul 13',  completed: 0, target: 4 },
    { week: 'Jun 30 – Jul 6',  completed: 0, target: 4 },
    { week: 'Jun 23 – Jun 29', completed: 1, target: 4 },
    { week: 'Jun 16 – Jun 22', completed: 2, target: 4 },
    { week: 'Jun 9 – Jun 15',  completed: 3, target: 4 },
    { week: 'Jun 2 – Jun 8',   completed: 4, target: 4 },
    { week: 'May 26 – Jun 1',  completed: 4, target: 4 },
    { week: 'May 19 – May 25', completed: 3, target: 4 },
  ],
  '5': [
    { week: 'Jul 7 – Jul 13',  completed: 1, target: 2 },
    { week: 'Jun 30 – Jul 6',  completed: 2, target: 2 },
    { week: 'Jun 23 – Jun 29', completed: 2, target: 2 },
    { week: 'Jun 16 – Jun 22', completed: 1, target: 2 },
    { week: 'Jun 9 – Jun 15',  completed: 2, target: 2 },
    { week: 'Jun 2 – Jun 8',   completed: 2, target: 2 },
    { week: 'May 26 – Jun 1',  completed: 1, target: 2 },
    { week: 'May 19 – May 25', completed: 2, target: 2 },
  ],
}

// In-clinic session log entries per client
const SESSION_LOGS: Record<string, Array<{ date: string; exerciseName: string; note?: string }>> = {
  '1': [
    { date: '2026-07-01', exerciseName: 'Pinch and Release', note: 'Good pinch strength. Improved from last session.' },
    { date: '2026-06-25', exerciseName: 'Bead Threading' },
    { date: '2026-06-18', exerciseName: 'Playdough Squeeze', note: 'Emma needed prompting but completed all sets.' },
  ],
  '2': [
    { date: '2026-07-02', exerciseName: 'Ball Squeeze Series', note: 'Grip strength measurably improved.' },
    { date: '2026-06-28', exerciseName: 'Wrist Rotation' },
    { date: '2026-06-20', exerciseName: 'Ball Squeeze Series' },
  ],
  '3': [
    { date: '2026-07-02', exerciseName: 'Sensory Bin Activity', note: 'Lily engaged well today.' },
    { date: '2026-06-25', exerciseName: 'Tactile Cards' },
  ],
  '4': [
    { date: '2026-06-20', exerciseName: 'Grip Training', note: 'Michael reporting pain. Reduced reps.' },
  ],
  '5': [
    { date: '2026-06-30', exerciseName: 'Balance Board Routine', note: 'Great form — ready to increase difficulty.' },
    { date: '2026-06-18', exerciseName: 'Balance Board Routine' },
  ],
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TimelineEntry =
  | { kind: 'submission'; date: string; sub: SubmissionEntry }
  | { kind: 'session'; date: string; exerciseName: string; note?: string }

type SubFilter = 'all' | 'pending' | 'approved' | 'rejected'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientHistoryPage({ params }: { params: { id: string } }) {
  const { clientList, clientPrograms, submissionList, isLoading } = useApp()
  const [subFilter, setSubFilter] = useState<SubFilter>('all')

  const client = clientList.find(c => c.id === params.id)

  const [programDuration, setProgramDuration] = useState<string | null>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      if (!client) { setProgramDuration(null); return }
      const programStartDate = client.programCreatedAt ?? client.createdAt
      if (!programStartDate) { setProgramDuration(null); return }
      const days = Math.max(1, Math.round((Date.now() - new Date(programStartDate).getTime()) / 86400000))
      let result: string
      if (days < 7) result = `${days} day${days === 1 ? '' : 's'}`
      else if (days < 30) result = `${Math.round(days / 7)} wk`
      else result = `${Math.round(days / 30)} mo`
      setProgramDuration(result)
    }, 0)
    return () => clearTimeout(id)
  }, [client?.programCreatedAt, client?.createdAt, client])

  if (isLoading) {
    return (
      <div className="p-8">
        <Link href="/clients" className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>
        <p className="text-slate-500">Loading client information…</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-8">
        <Link href="/clients" className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>
        <p className="text-slate-500">Client not found.</p>
      </div>
    )
  }

  const program = clientPrograms[client.id]
  const freq = program?.frequency ?? client.frequency
  const clientSubs = submissionList.filter(s => s.clientId === client.id)
  const weeklyHistory = WEEKLY_HISTORY[client.id] ?? []
  const sessionLogs = SESSION_LOGS[client.id] ?? []

  // Build unified timeline
  const timeline: TimelineEntry[] = [
    ...clientSubs.map(sub => ({ kind: 'submission' as const, date: sub.date, sub })),
    ...sessionLogs.map(log => ({ kind: 'session' as const, date: log.date, exerciseName: log.exerciseName, note: log.note })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  // Stats
  const approvedCount = clientSubs.filter(s => s.status === 'approved').length
  const rejectedCount = clientSubs.filter(s => s.status === 'rejected').length
  const pendingCount  = clientSubs.filter(s => s.status === 'pending').length
  const weeksOnTarget = weeklyHistory.filter(w => w.completed >= w.target).length

  // Submission history with filter + group revisions
  const filteredSubs = clientSubs
    .filter(s => subFilter === 'all' || s.status === subFilter)
    .sort((a, b) => b.date.localeCompare(a.date))

  function getRevisionOf(sub: SubmissionEntry) {
    return sub.revisionOf ? clientSubs.find(s => s.id === sub.revisionOf) : undefined
  }

  const subCounts: Record<SubFilter, number> = {
    all:      clientSubs.length,
    pending:  pendingCount,
    approved: approvedCount,
    rejected: rejectedCount,
  }

  return (
    <div className="p-8 max-w-5xl">

      {/* Back nav */}
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </Link>

      {/* ── Client header ── */}
      <div className="flex items-start gap-5 mb-8">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 ${client.color}`}>
          {client.initials}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
            <Badge className={client.status === 'active'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-600'}>
              {client.status}
            </Badge>
          </div>
          <p className="text-slate-500">Age {client.age} · {client.condition}</p>
          {client.dob && (
            <p className="text-xs text-slate-400 mt-0.5">DOB: {new Date(client.dob).toLocaleDateString()}</p>
          )}
          {client.diagnosis && (
            <p className="text-xs text-slate-400 mt-0.5">Diagnosis: {client.diagnosis}</p>
          )}
          <p className="text-xs text-slate-400 mt-0.5">{client.program}</p>
        </div>
        <div className="flex gap-2">
          <div className="text-center px-4 py-2 bg-slate-50 rounded-lg border">
            <p className="text-xl font-bold text-slate-900">{clientSubs.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Submissions</p>
          </div>
          <div className="text-center px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-xl font-bold text-emerald-700">{approvedCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Approved</p>
          </div>
          <div className="text-center px-4 py-2 bg-teal-50 rounded-lg border border-teal-100">
            <p className="text-xl font-bold text-teal-700">{weeksOnTarget}/{weeklyHistory.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Weeks on target</p>
          </div>
          <div className="text-center px-4 py-2 bg-slate-50 rounded-lg border">
            <p className="text-xl font-bold text-slate-900">{freq}x</p>
            <p className="text-xs text-slate-500 mt-0.5">Per week</p>
          </div>
          {programDuration && (
            <div className="text-center px-4 py-2 bg-slate-50 rounded-lg border">
              <p className="text-xl font-bold text-slate-900">{programDuration}</p>
              <p className="text-xs text-slate-500 mt-0.5">In program</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Weekly completion heatmap ── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-teal-600" />
            <CardTitle className="text-base font-semibold">Weekly Completion — Last 8 Weeks</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {weeklyHistory.map((wk, i) => {
              const pct = wk.target > 0 ? Math.round((wk.completed / wk.target) * 100) : 0
              const isOnTarget = wk.completed >= wk.target
              const isPartial  = !isOnTarget && wk.completed > 0
              const isMissed   = wk.completed === 0
              return (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-xs text-slate-400 w-36 flex-shrink-0 font-mono">{wk.week}</span>
                  <div className="flex-1">
                    <Progress
                      value={pct}
                      className={`h-2 ${
                        isOnTarget ? '[&>div]:bg-emerald-500'
                        : isPartial ? '[&>div]:bg-amber-400'
                        : '[&>div]:bg-slate-300'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-2 w-24 flex-shrink-0">
                    <span className={`text-xs font-semibold tabular-nums ${
                      isOnTarget ? 'text-emerald-600'
                      : isPartial ? 'text-amber-600'
                      : 'text-slate-400'
                    }`}>
                      {wk.completed}/{wk.target}
                    </span>
                    {isOnTarget && <span className="text-xs text-emerald-500">✓ On target</span>}
                    {isPartial  && <span className="text-xs text-amber-500">Partial</span>}
                    {isMissed   && <span className="text-xs text-slate-400">No activity</span>}
                  </div>
                  {i === 0 && (
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                      This week
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Two-column: Timeline + Program summary ── */}
      <div className="grid grid-cols-3 gap-6 mb-6">

        {/* Activity timeline */}
        <div className="col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-base font-semibold">Activity Timeline</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No activity recorded yet.</p>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-100" />

                  <div className="space-y-4">
                    {timeline.map((entry, i) => {
                      if (entry.kind === 'session') {
                        return (
                          <div key={`s-${i}`} className="flex items-start gap-4 relative">
                            <div className="w-10 h-10 rounded-full bg-teal-100 border-2 border-white flex items-center justify-center flex-shrink-0 z-10">
                              <ClipboardList className="w-4 h-4 text-teal-600" />
                            </div>
                            <div className="flex-1 pt-1.5 pb-3 border-b border-slate-50 last:border-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <p className="text-sm font-medium text-slate-900">{entry.exerciseName}</p>
                                <span className="text-xs text-slate-400 flex-shrink-0">{entry.date}</span>
                              </div>
                              <p className="text-xs text-teal-600 font-medium">In-clinic session</p>
                              {entry.note && (
                                <p className="text-xs text-slate-500 mt-1 italic">&ldquo;{entry.note}&rdquo;</p>
                              )}
                            </div>
                          </div>
                        )
                      }

                      const sub = entry.sub
                      const isApproved = sub.status === 'approved'
                      const isRejected = sub.status === 'rejected'
                      const isRevision = !!sub.revisionOf

                      return (
                        <div key={`sub-${sub.id}`} className="flex items-start gap-4 relative">
                          <div className={`w-10 h-10 rounded-full border-2 border-white flex items-center justify-center flex-shrink-0 z-10 ${
                            isApproved ? 'bg-emerald-100' : isRejected ? 'bg-red-100' : 'bg-slate-100'
                          }`}>
                            {isApproved && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                            {isRejected && <XCircle className="w-4 h-4 text-red-500" />}
                            {!isApproved && !isRejected && (sub.type === 'video'
                              ? <Video className="w-4 h-4 text-slate-500" />
                              : <ImageIcon className="w-4 h-4 text-slate-500" />)}
                          </div>
                          <div className="flex-1 pt-1.5 pb-3 border-b border-slate-50 last:border-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-900">{sub.exerciseName}</p>
                                {isRevision && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    Rev {sub.revisionNumber}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 flex-shrink-0">{sub.date}</span>
                            </div>
                            <p className={`text-xs font-medium ${
                              isApproved ? 'text-emerald-600'
                              : isRejected ? 'text-red-500'
                              : 'text-slate-500'
                            }`}>
                              {isApproved ? 'Submission approved'
                               : isRejected ? 'Submission returned for revision'
                               : `${sub.type === 'video' ? 'Video' : 'Photo'} submitted — pending review`}
                            </p>
                            {(isApproved || isRejected) && sub.notes && (
                              <p className="text-xs text-slate-500 mt-1 italic">&ldquo;{sub.notes}&rdquo;</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Program summary */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Repeat2 className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-base font-semibold">Current Program</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Program</p>
                <p className="text-sm font-medium text-slate-800">{client.program}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Frequency</p>
                <p className="text-sm text-slate-700">{freq}x per week</p>
              </div>
              {program?.schedule && program.schedule.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Schedule</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                      <span key={day} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        program.schedule.includes(day)
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}>{day}</span>
                    ))}
                  </div>
                </div>
              )}
              {(program?.exercises ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Exercises</p>
                  <div className="space-y-1">
                    {(program?.exercises ?? []).map((ex, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-semibold flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-700">{ex.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {program?.notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-xs text-slate-600 italic leading-relaxed">{program.notes}</p>
                </div>
              )}
              <div className="pt-2 border-t">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  Next session: {client.nextSession ?? '—'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                  <Activity className="w-3 h-3" />
                  Last activity: {client.lastActivity ?? '—'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Submission history ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-teal-600" />
              <CardTitle className="text-base font-semibold">Submission History</CardTitle>
            </div>
            <div className="flex gap-1.5">
              {(['all', 'pending', 'approved', 'rejected'] as SubFilter[]).map(f => (
                <Button
                  key={f}
                  size="sm"
                  variant={subFilter === f ? 'default' : 'outline'}
                  onClick={() => setSubFilter(f)}
                  className={`h-7 text-xs gap-1.5 ${subFilter === f ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                >
                  {f === 'rejected' ? 'Returned' : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    subFilter === f ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {subCounts[f]}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubs.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4 text-center">No submissions in this filter.</p>
          ) : (
            <div className="space-y-2">
              {filteredSubs.map(sub => {
                const originalSub = getRevisionOf(sub)
                const isApproved = sub.status === 'approved'
                const isRejected = sub.status === 'rejected'
                const isRevision = !!sub.revisionOf

                return (
                  <div key={sub.id} className={`flex items-start gap-4 p-3 rounded-lg border ${
                    isRejected ? 'bg-red-50 border-red-100'
                    : isApproved ? 'bg-emerald-50 border-emerald-100'
                    : 'bg-white'
                  }`}>
                    {/* Status icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isApproved ? 'bg-emerald-100' : isRejected ? 'bg-red-100' : 'bg-slate-100'
                    }`}>
                      {isApproved && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {isRejected && <XCircle className="w-4 h-4 text-red-500" />}
                      {!isApproved && !isRejected && (sub.type === 'video'
                        ? <Video className="w-4 h-4 text-slate-500" />
                        : <ImageIcon className="w-4 h-4 text-slate-500" />)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-slate-900">{sub.exerciseName}</p>
                        {isRevision && (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                            <RotateCcw className="w-2.5 h-2.5" />
                            Revision #{sub.revisionNumber}
                          </span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          isApproved ? 'bg-emerald-100 text-emerald-700'
                          : isRejected ? 'bg-red-100 text-red-600'
                          : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isApproved ? 'Approved' : isRejected ? 'Returned' : 'Pending'}
                        </span>
                      </div>

                      {isRevision && originalSub && (
                        <p className="text-xs text-amber-600 mb-0.5">
                          Revision of submission returned {originalSub.date}
                        </p>
                      )}

                      {sub.notes && (
                        <p className="text-xs text-slate-500 italic mt-0.5">&ldquo;{sub.notes}&rdquo;</p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">{sub.date}</p>
                      <p className="text-xs text-slate-400 mt-0.5 capitalize">
                        {sub.type}
                        {sub.duration ? ` · ${sub.duration}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
