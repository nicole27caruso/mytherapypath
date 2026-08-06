'use client'

import { useState } from 'react'
import { useApp } from '@/lib/app-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { ViewProgramDrawer } from '@/components/view-program-drawer'
import { NewClientModal } from '@/components/new-client-modal'
import { Search, Plus, Calendar, Repeat2, History } from 'lucide-react'
import Link from 'next/link'

type StatusFilter = 'all' | 'active' | 'inactive'

export default function ClientsPage() {
  const { clientList, clientPrograms, addClient, toggleClientStatus, handleSaveProgram, isLoading } = useApp()
  const [viewClientId, setViewClientId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showAddClient, setShowAddClient] = useState(false)

  const filtered = clientList.filter(c => {
    const q = search.toLowerCase()
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.condition.toLowerCase().includes(q) || c.program.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const activeCount = clientList.filter(c => c.status === 'active').length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 mt-1">
            {clientList.length} clients total · {activeCount} active
          </p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700 gap-2" onClick={() => setShowAddClient(true)}>
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search clients..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'active', 'inactive'] as StatusFilter[]).map(f => (
            <Button
              key={f}
              size="sm"
              variant={statusFilter === f ? 'default' : 'outline'}
              onClick={() => setStatusFilter(f)}
              className={statusFilter === f ? 'bg-teal-600 hover:bg-teal-700' : ''}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map(client => {
          const prog = clientPrograms[client.id]
          const freq = prog?.frequency ?? client.frequency
          const completion = Math.round((client.completedThisWeek / freq) * 100)
          return (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${client.color}`}>
                    {client.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">{client.name}</h3>
                      <button
                        onClick={() => toggleClientStatus(client.id)}
                        title={`Click to mark as ${client.status === 'active' ? 'inactive' : 'active'}`}
                      >
                        <Badge
                          className={`cursor-pointer transition-colors ${
                            client.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {client.status}
                        </Badge>
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">Age {client.age} · {client.condition}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{client.program}</p>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>This week ({client.completedThisWeek}/{freq} sessions)</span>
                        <span className={completion === 100 ? 'text-emerald-600 font-medium' : completion >= 50 ? 'text-amber-600' : 'text-red-500'}>
                          {completion}%
                        </span>
                      </div>
                      <Progress
                        value={completion}
                        className={`h-2 ${completion === 100 ? '[&>div]:bg-emerald-500' : completion >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-400'}`}
                      />
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Repeat2 className="w-3 h-3" />
                        {freq}x/week
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Next: {client.nextSession}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => setViewClientId(client.id)}>
                    View Program
                  </Button>
                  <Link href={`/clients/${client.id}`}>
                    <Button size="sm" variant="outline" className="text-xs h-8 gap-1 px-3">
                      <History className="w-3 h-3" />
                      History
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-400">
          <p className="font-medium">Loading clients…</p>
        </div>
      ) : filtered.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <p className="font-medium">No clients match your filter.</p>
          <p className="text-sm mt-1">Try adjusting your search or status filter.</p>
        </div>
      )}

      <ViewProgramDrawer
        open={viewClientId !== null}
        clientId={viewClientId}
        onClose={() => setViewClientId(null)}
        programOverride={viewClientId ? clientPrograms[viewClientId] : undefined}
        onSaveProgram={handleSaveProgram}
      />

      <NewClientModal
        open={showAddClient}
        onClose={() => setShowAddClient(false)}
        onAdd={addClient}
        existingCount={clientList.length}
      />
    </div>
  )
}
