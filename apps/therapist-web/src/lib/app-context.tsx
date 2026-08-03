'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { SubmissionEntry } from '@/lib/mock-data'
import type { NewClient } from '@/components/new-client-modal'
import type { ClientProgramState } from '@/components/view-program-drawer'
import { api, THERAPIST_ID, type ApiClient, type ApiProgram, type ApiProgramTemplate, type ApiSubmission } from '@/lib/api'

type ExerciseEntry = { name: string; videoUrl: string; instructions: string; duration: string }

type AppContextValue = {
  clientList: NewClient[]
  clientPrograms: Record<string, ClientProgramState>
  programTemplates: ApiProgramTemplate[]
  refreshProgramTemplates: () => Promise<void>
  createProgramTemplate: (body: {
    title: string; description?: string | null; category?: string | null;
    body_region?: string | null; injury_type?: string | null; functional_focus?: string | null;
    recovery_phase?: string | null; goals?: string | null; ergonomic_recommendations?: string | null;
    precautions?: string | null; equipment_needed?: string | null; progression_criteria?: string | null;
    frequency_per_week?: number | null; schedule_days?: string | null; template_ids: string[]
  }) => Promise<ApiProgramTemplate>
  submissionList: SubmissionEntry[]
  approved: Set<string>
  rejected: Set<string>
  rejectionNotes: Map<string, string>
  isLoading: boolean
  addClient: (client: NewClient) => Promise<void>
  toggleClientStatus: (id: string) => Promise<void>
  handleAssign: (clientId: string, exercises: ExerciseEntry[], frequency: number, notes: string) => void
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
    dob: c.dob ?? null,
    condition: c.condition ?? '',
    diagnosis: c.diagnosis ?? '',
    program: c.program?.name ?? 'Program not yet assigned',
    frequency: c.frequency,
    completedThisWeek: c.completed_this_week,
    nextSession: c.next_session ?? '—',
    status: c.status as 'active' | 'inactive',
    lastActivity: '',
    color: c.color ?? 'bg-blue-100 text-blue-700',
    createdAt: c.created_at,
    programCreatedAt: c.program?.created_at ?? undefined,
  }
}

function programToState(prog: ApiProgram): ClientProgramState {
  return {
    exercises: [...prog.exercises]
      .sort((a, b) => a.order - b.order)
      .map(pe => ({
        name: pe.template.title,
        videoUrl: pe.template.video_url ?? '',
        instructions: pe.template.instructions ?? '',
        duration: pe.template.duration_minutes ? `${pe.template.duration_minutes} min` : '',
      })),
    frequency: prog.frequency_per_week,
    notes: prog.notes ?? '',
    schedule: prog.schedule_days ? prog.schedule_days.split(',').filter(Boolean) : [],
  }
}

// Exercises don't carry a template id from the UI, so saving a program means
// resolving each exercise to a backend ExerciseTemplate — reusing one that
// already matches by title, creating a new one otherwise — before replacing
// the program with the full resolved list (the API replaces, it doesn't merge).
async function persistProgram(
  clientId: string,
  exercises: ExerciseEntry[],
  frequency: number,
  notes: string,
  schedule: string[]
): Promise<ApiProgram> {
  const existingTemplates = await api.templates.list()
  const templateByTitle = new Map(existingTemplates.map(t => [t.title.trim().toLowerCase(), t]))

  const templateIds: string[] = []
  for (const ex of exercises) {
    const key = ex.name.trim().toLowerCase()
    let template = templateByTitle.get(key)
    if (!template) {
      const minutesMatch = ex.duration.match(/\d+/)
      template = await api.templates.create({
        title: ex.name.trim(),
        instructions: ex.instructions || null,
        video_url: ex.videoUrl || null,
        duration_minutes: minutesMatch ? parseInt(minutesMatch[0], 10) : null,
      })
      templateByTitle.set(key, template)
    }
    templateIds.push(template.id)
  }

  return api.programs.save({
    client_id: clientId,
    frequency_per_week: frequency,
    notes: notes || null,
    schedule_days: schedule.length ? schedule.join(',') : null,
    template_ids: templateIds,
  })
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
  const [programTemplates, setProgramTemplates] = useState<ApiProgramTemplate[]>([])
  const [submissionList, setSubmissionList] = useState<SubmissionEntry[]>([])
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [rejected, setRejected] = useState<Set<string>>(new Set())
  const [rejectionNotes, setRejectionNotes] = useState<Map<string, string>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [rawClients, rawSubs, rawTemplateList] = await Promise.all([
          api.clients.list(),
          api.submissions.list(),
          api.programTemplates.list(),
        ])
        const clientsMap = new Map(rawClients.map(c => [c.id, c]))
        setClientList(rawClients.map(toNewClient))
        setProgramTemplates(rawTemplateList)

        const programEntries = await Promise.all(
          rawClients.map(async c => [c.id, await api.programs.get(c.id)] as const)
        )
        const programsMap: Record<string, ClientProgramState> = {}
        for (const [id, prog] of programEntries) {
          if (prog) programsMap[id] = programToState(prog)
        }
        setClientPrograms(programsMap)

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

  async function refreshProgramTemplates() {
    try {
      const rawTemplateList = await api.programTemplates.list()
      setProgramTemplates(rawTemplateList)
    } catch (err) {
      console.error('Failed to load program templates:', err)
    }
  }

  async function createProgramTemplate(body: {
    title: string; description?: string | null; category?: string | null;
    body_region?: string | null; injury_type?: string | null; functional_focus?: string | null;
    recovery_phase?: string | null; goals?: string | null; ergonomic_recommendations?: string | null;
    precautions?: string | null; equipment_needed?: string | null; progression_criteria?: string | null;
    frequency_per_week?: number | null; schedule_days?: string | null; template_ids: string[]
  }) {
    const created = await api.programTemplates.create(body)
    setProgramTemplates(prev => [...prev, created])
    return created
  }

  async function addClient(client: NewClient) {
    try {
      const created = await api.clients.create({
        therapist_id: THERAPIST_ID,
        name: client.name,
        age: client.age,
        dob: client.dob ?? null,
        condition: client.condition,
        diagnosis: client.diagnosis ?? null,
        color: client.color,
        frequency: client.frequency,
        next_session: client.nextSession === '—' ? null : client.nextSession,
        status: client.status,
      })
      setClientList(prev => [...prev, toNewClient(created)])
      if (client.templateId) {
        const t = programTemplates.find(tmpl => tmpl.id === client.templateId)
        if (t) {
          const exercises = t.exercises.map(pe => ({
            name: pe.template.title,
            videoUrl: pe.template.video_url ?? '',
            instructions: pe.template.instructions ?? '',
            duration: pe.template.duration_minutes ? `${pe.template.duration_minutes} min` : '',
          }))
          try {
            const saved = await persistProgram(created.id, exercises, t.frequency_per_week ?? 3, '', [])
            setClientPrograms(prev => ({ ...prev, [created.id]: programToState(saved) }))
          } catch (err) {
            console.error('Failed to save starter program:', err)
          }
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

  function handleAssign(clientId: string, exercises: ExerciseEntry[], frequency: number, notes: string) {
    const schedule = clientPrograms[clientId]?.schedule ?? []
    persistProgram(clientId, exercises, frequency, notes, schedule)
      .then(saved => setClientPrograms(prev => ({ ...prev, [clientId]: programToState(saved) })))
      .catch(err => console.error('Failed to save program:', err))
  }

  function handleSaveProgram(clientId: string, state: ClientProgramState) {
    persistProgram(clientId, state.exercises, state.frequency, state.notes, state.schedule)
      .then(saved => setClientPrograms(prev => ({ ...prev, [clientId]: programToState(saved) })))
      .catch(err => console.error('Failed to save program:', err))
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
      clientList, clientPrograms, programTemplates, refreshProgramTemplates, createProgramTemplate, submissionList, approved, rejected, rejectionNotes,
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
