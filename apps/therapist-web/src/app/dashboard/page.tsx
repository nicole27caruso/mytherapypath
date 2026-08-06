'use client'

import { useState } from 'react'
import { useApp, programTarget } from '@/lib/app-context'
import type { SubmissionEntry } from '@/lib/mock-data'
import { SubmissionModal } from '@/components/submission-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Users, TrendingUp, FileVideo, ClipboardList, Video, ImageIcon, CheckCircle2, XCircle } from 'lucide-react'

function StatCard({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string; subtitle: string; icon: React.ElementType; color: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { clientList, clientPrograms, submissionList, approved, rejected, rejectionNotes, signOff, reject } = useApp()
  const [selected, setSelected] = useState<SubmissionEntry | null>(null)

  const activeClients = clientList.filter(c => c.status === 'active')
  const inactiveCount = clientList.filter(c => c.status === 'inactive').length
  const pendingCount = submissionList.filter(s => s.status === 'pending').length

  const avgCompletion = activeClients.length > 0
    ? Math.round(
        activeClients.reduce((acc, c) => {
          const freq = programTarget(clientPrograms[c.id], c.frequency)
          return acc + (c.completedThisWeek / freq) * 100
        }, 0) / activeClients.length
      )
    : 0

  function getRevisionOf(sub: SubmissionEntry) {
    return sub.revisionOf ? submissionList.find(s => s.id === sub.revisionOf) : undefined
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Good morning, Dr. Sarah Kim</h1>
        <p className="text-slate-500 mt-1">Here&apos;s your overview at a glance.</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Active Clients"
          value={String(activeClients.length)}
          subtitle={`${inactiveCount} inactive`}
          icon={Users}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Pending Submissions"
          value={String(pendingCount)}
          subtitle="Awaiting sign-off"
          icon={FileVideo}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Total Clients"
          value={String(clientList.length)}
          subtitle={`${activeClients.length} active · ${inactiveCount} inactive`}
          icon={ClipboardList}
          color="bg-teal-50 text-teal-600"
        />
        <StatCard
          title="Avg. Completion"
          value={`${avgCompletion}%`}
          subtitle="This week across active clients"
          icon={TrendingUp}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Client Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">Client</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Condition</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">This Week</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Next Session</th>
                  </tr>
                </thead>
                <tbody>
                  {clientList.map((client, i) => {
                    const freq = programTarget(clientPrograms[client.id], client.frequency)
                    return (
                      <tr key={client.id} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${client.color}`}>
                              {client.initials}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{client.name}</p>
                              <p className="text-xs text-slate-400">Age {client.age}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{client.condition}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={(client.completedThisWeek / freq) * 100}
                              className="h-1.5 w-16"
                            />
                            <span className="text-xs text-slate-500">{client.completedThisWeek}/{freq}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={client.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}
                          >
                            {client.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{client.nextSession}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Submissions</CardTitle>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                  {pendingCount} pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {submissionList.map(sub => (
                <div
                  key={sub.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelected(sub)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${sub.clientColor}`}>
                    {sub.clientInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sub.clientName}</p>
                    <p className="text-xs text-slate-500 truncate">{sub.exerciseName}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {sub.type === 'video'
                        ? <Video className="w-3 h-3 text-slate-400" />
                        : <ImageIcon className="w-3 h-3 text-slate-400" />}
                      <span className="text-xs text-slate-400">{sub.date}</span>
                    </div>
                  </div>
                  {sub.status === 'approved' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  )}
                  {sub.status === 'rejected' && (
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  {sub.status === 'pending' && (
                    <Button
                      size="sm"
                      className="text-xs h-7 px-2 bg-teal-600 hover:bg-teal-700"
                      onClick={e => { e.stopPropagation(); setSelected(sub) }}
                    >
                      Sign Off
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

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
