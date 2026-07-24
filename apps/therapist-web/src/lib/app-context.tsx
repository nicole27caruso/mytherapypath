'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { templates } from '@/lib/mock-data'
import type { SubmissionEntry } from '@/lib/mock-data'
import type { NewClient } from '@/components/new-client-modal'
import type { ClientProgramState } from '@/components/view-program-drawer'
import { api, THERAPIST_ID, type ApiClient, type ApiSubmission } from '@/lib/api'

type ExerciseEntry = { name: string; videoUrl: string; instructions: string; duration: string }

type AppContextValue = {
  clientList: NewClient[]
  clientPrograms: Record<string, ClientProgramState>
  submissionList: SubmissionEntry[]
  approved: Set<string>
  rejected: Set<string>
  rejectionNotes: Map<string, string>
  isLoading: boolean
  addClient: (client: NewClient) => Promise<void>
  toggleClientStatus: (id: string) => Promise<void>
  handleAssign: (clientId: string, exercises: ExerciseEntry[], frequency: number) => void
  handleSaveProgram: (clientId: string, state: ClientProgramState) => void
  signOff: (id: string, note: string) => Promise<void>
  reject: (id: string, note: string) => Promise<void>
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function toNewClient(c: ApiClient): NewClient {
  return {
    id: c.id,
    name: c.name,
    initials: getInitials(c.name),
    age: c.age ?? 0,
    condition: c.condition ?? '',
    program: c.program?.name ?? 'Program not yet assigned',
    frequency: c.frequency,
    completedThisWeek: c.completed_this_week,
    nextSession: c.next_session ?? '—',
    status: c.status as 'active' | 'inactive',
    lastActivity: '',
    color: c.color ?? 'bg-blue-100 text-blue-700',
  }
}

function toSubmissionEntry(sub: ApiSubmission, clientsMap: Map<string, ApiClient>): SubmissionEntry {
  const client = clientsMap.get(sub.client_id)
  return {
    id: sub.id,
    clientId: sub.client_id,
    clientName: client?.name ?? 'Unknown',
    clientInitials: client ? getInitials(client.name) : '??',
    clientColor: client?.color ?? 'bg-slate-100 text-slate-600',
    exerciseName: sub.exercise_name,
    date: sub.submitted_at.split('T')[0],
    type: (sub.media_type ?? 'video') as 'video' | 'photo',
    status: sub.status as 'pending' | 'approved' | 'rejected',
    notes: sub.therapist_note ?? '',
    duration: sub.duration ?? '',
    revisionOf: sub.revision_of_id ?? undefined,
    revisionNumber: sub.revision_number ?? undefined,
  }
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [clientList, setClientList] = useState<NewClient[]>([])
  const [clientPrograms, setClientPrograms] = useState<Record<string, ClientProgramState>>({})
  const [submissionList, setSubmissionList] = useState<SubmissionEntry[]>([])
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [rejected, setRejected] = useState<Set<string>>(new Set())
  const [rejectionNotes, setRejectionNotes] = useState<Map<string, string>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [rawClients, rawSubs] = await Promise.all([
          api.clients.list(),
          api.submissions.list(),
        ])
        const clientsMap = new Map(rawClients.map(c => [c.id, c]))
        setClientList(rawClients.map(toNewClient))
        const subs = rawSubs.map(s => toSubmissionEntry(s, clientsMap))
        setSubmissionList(subs)
        setApproved(new Set(subs.filter(s => s.status === 'approved').map(s => s.id)))
        setRejected(new Set(subs.filter(s => s.status === 'rejected').map(s => s.id)))
        setRejectionNotes(new Map(
          subs.filter(s => s.status === 'rejected' && s.notes).map(s => [s.id, s.notes])
        ))
      } catch (err) {
        console.error('Failed to load from API:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  async function addClient(client: NewClient) {
    try {
      const created = await api.clients.create({
        therapist_id: THERAPIST_ID,
        name: client.name,
        age: client.age,
        condition: client.condition,
        color: client.color,
        frequency: client.frequency,
        next_session: client.nextSession === '—' ? null : client.nextSession,
        status: client.status,
      })
      setClientList(prev => [...prev, toNewClient(created)])
      if (client.templateId) {
        const t = templates.find(tmpl => tmpl.id === client.templateId)
        if (t) {
          setClientPrograms(prev => ({
            ...prev,
            [created.id]: {
              exercises: t.exercises.map(name => ({ name, videoUrl: '', instructions: '', duration: '' })),
              frequency: t.frequency,
              notes: '',
              schedule: [],
            },
          }))
        }
      }
    } catch (err) {
      console.error('Failed to create client:', err)
    }
  }

  async function toggleClientStatus(id: string) {
    const client = clientList.find(c => c.id === id)
    if (!client) return
    const newStatus = client.status === 'active' ? 'inactive' : 'active'
    setClientList(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
    try {
      await api.clients.update(id, { status: newStatus })
    } catch (err) {
      console.error('Failed to toggle client status:', err)
      setClientList(prev => prev.map(c => c.id === id ? { ...c, status: client.status } : c))
    }
  }

  function handleAssign(clientId: string, exercises: ExerciseEntry[], frequency: number) {
    setClientPrograms(prev => ({
      ...prev,
      [clientId]: {
        exercises,
        frequency,
        notes: prev[clientId]?.notes ?? '',
        schedule: prev[clientId]?.schedule ?? [],
      },
    }))
  }

  function handleSaveProgram(clientId: string, state: ClientProgramState) {
    setClientPrograms(prev => ({ ...prev, [clientId]: state }))
  }

  async function signOff(id: string, note: string) {
    setApproved(prev => new Set([...prev, id]))
    setSubmissionList(prev =>
      prev.map(s => s.id === id ? { ...s, status: 'approved' as const, notes: note } : s)
    )
    try {
      await api.submissions.approve(id, note)
    } catch (err) {
      console.error('Failed to approve submission:', err)
    }
  }

  async function reject(id: string, note: string) {
    setRejected(prev => new Set([...prev, id]))
    setRejectionNotes(prev => new Map([...prev, [id, note]]))
    setSubmissionList(prev =>
      prev.map(s => s.id === id ? { ...s, status: 'rejected' as const, notes: note } : s)
    )
    try {
      await api.submissions.reject(id, note)
    } catch (err) {
      console.error('Failed to reject submission:', err)
    }
  }

  return (
    <AppContext.Provider value={{
      clientList, clientPrograms, submissionList, approved, rejected, rejectionNotes,
      isLoading, addClient, toggleClientStatus, handleAssign, handleSaveProgram, signOff, reject,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
