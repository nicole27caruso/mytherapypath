'use client'

import { useState, useEffect } from 'react'
import { useApp, programTarget } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FrequencyChips } from '@/components/frequency-chips'
import { GapChips } from '@/components/gap-chips'
import { api, type ApiTemplate, type ApiProgram } from '@/lib/api'
import { X, CheckCircle2, Circle, Calendar, Repeat2, Clock, Pencil, Video, Plus, AlignLeft, Library, AlertTriangle, Hourglass } from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Matches the backend's Monday-Sunday UTC week boundary (scheduling.week_start_utc)
// so "this week" means the same thing on the therapist and client sides.
function mondayOfCurrentWeek(): string {
  const now = new Date()
  const diffToMonday = (now.getUTCDay() + 6) % 7
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday))
  return monday.toISOString().split('T')[0]
}

export type ClientProgramState = {
  exercises: { name: string; videoUrl: string; instructions: string; duration: string; frequencyPerWeek: number; minDaysBetween: number }[]
  frequency: number
  notes: string
  schedule: string[]
}

interface ViewProgramDrawerProps {
  open: boolean
  clientId: string | null
  onClose: () => void
  programOverride?: ClientProgramState
  onSaveProgram: (clientId: string, state: ClientProgramState) => void
}

export function ViewProgramDrawer({ open, clientId, onClose, programOverride, onSaveProgram }: ViewProgramDrawerProps) {
  const { clientList, submissionList, library, logSession } = useApp()
  const libraryByCategory = new Map<string, ApiTemplate[]>()
  for (const t of library) {
    const key = t.category ?? 'Other'
    libraryByCategory.set(key, [...(libraryByCategory.get(key) ?? []), t])
  }
  const [manualChecked, setManualChecked] = useState<Set<string>>(new Set())
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editExercises, setEditExercises] = useState<{ name: string; videoUrl: string; instructions: string; duration: string; frequencyPerWeek: number; minDaysBetween: number }[]>([])
  const [editFrequency, setEditFrequency] = useState(3)
  const [editNotes, setEditNotes] = useState('')
  const [editSchedule, setEditSchedule] = useState<string[]>([])
  const [newExercise, setNewExercise] = useState('')
  const [videoExpanded, setVideoExpanded] = useState<Set<number>>(new Set())
  const [detailsExpanded, setDetailsExpanded] = useState<Set<number>>(new Set())
  const [saved, setSaved] = useState(false)
  const [liveProgram, setLiveProgram] = useState<ApiProgram | null>(null)

  // Fresh fetch on open — not sourced from the app-wide clientPrograms cache, which is
  // only populated at mount and after a save, so it wouldn't reflect a submission
  // approved/rejected moments earlier in the same session.
  useEffect(() => {
    if (!open || !clientId) return
    let cancelled = false
    api.programs.get(clientId).then(prog => { if (!cancelled) setLiveProgram(prog) })
    return () => { cancelled = true }
  }, [open, clientId])

  const client = clientList.find(c => c.id === clientId)

  if (!open || !client) return null

  const clientSubmissions = submissionList.filter(s => s.clientId === clientId)
  // "Proof submitted" must reset each week like the mobile app's badges do --
  // otherwise an approval from a prior week keeps showing as done forever.
  const weekStart = mondayOfCurrentWeek()
  const proofSubmitted = new Set(
    clientSubmissions.filter(s => s.date >= weekStart).map(s => s.exerciseName)
  )

  // No per-client fallback content here on purpose -- a client with no program
  // assigned yet (or no override loaded) just shows empty, rather than
  // silently substituting placeholder exercises/notes that were never
  // actually entered by the therapist.
  const displayExercises = programOverride
    ? programOverride.exercises.map(ae => ({
        name: ae.name,
        duration: ae.duration || '—',
        instructions: ae.instructions || 'No detailed instructions added yet.',
      }))
    : []
  const displayFrequency = programOverride?.frequency ?? client.frequency
  const displayNotes = programOverride?.notes ?? ''
  const displaySchedule = programOverride?.schedule ?? []
  // The program-level frequency is just the default applied to new exercises --
  // the real weekly target is the sum of each exercise's own target, which can
  // (and often does) diverge from that default once per-exercise targets are set.
  // Using the flat default as the completion denominator here understated the
  // real target and could push the displayed percentage over 100%.
  const weeklyTarget = programTarget(programOverride, client.frequency)
  const completion = Math.round((client.completedThisWeek / weeklyTarget) * 100)

  function enterEdit() {
    const source = programOverride?.exercises ?? []
    setEditExercises(source.map(ae => {
      const live = liveProgram?.exercises.find(pe => pe.template.title === ae.name)
      return {
        name: ae.name,
        videoUrl: ae.videoUrl ?? '',
        instructions: ae.instructions || '',
        duration: ae.duration || '',
        frequencyPerWeek: live?.frequency_per_week ?? ae.frequencyPerWeek ?? displayFrequency,
        minDaysBetween: live?.min_days_between ?? ae.minDaysBetween ?? 0,
      }
    }))
    setEditFrequency(displayFrequency)
    setEditNotes(displayNotes)
    setEditSchedule([...displaySchedule])
    setNewExercise('')
    setVideoExpanded(new Set())
    const preExpanded = new Set<number>()
    source.forEach((ae, i) => { if (ae.instructions || ae.duration) preExpanded.add(i) })
    setDetailsExpanded(preExpanded)
    setSaved(false)
    setIsEditing(true)
  }

  function handleSaveEdit() {
    if (!clientId) return
    const pending = newExercise.trim()
    const finalExercises = pending ? [...editExercises, { name: pending, videoUrl: '', instructions: '', duration: '', frequencyPerWeek: editFrequency, minDaysBetween: 0 }] : editExercises
    onSaveProgram(clientId, { exercises: finalExercises, frequency: editFrequency, notes: editNotes, schedule: editSchedule })
    setSaved(true)
    setTimeout(() => { setSaved(false); setIsEditing(false) }, 1200)
  }

  function addEditExercise() {
    if (newExercise.trim()) {
      setEditExercises(prev => [...prev, { name: newExercise.trim(), videoUrl: '', instructions: '', duration: '', frequencyPerWeek: editFrequency, minDaysBetween: 0 }])
      setNewExercise('')
    }
  }

  function addFromLibrary(templateId: string) {
    const t = library.find(l => l.id === templateId)
    if (!t) return
    setEditExercises(prev => [...prev, {
      name: t.title,
      videoUrl: t.video_url ?? '',
      instructions: t.instructions ?? '',
      duration: t.duration_minutes ? `${t.duration_minutes} min` : '',
      frequencyPerWeek: editFrequency,
      minDaysBetween: 0,
    }])
  }

  function updateExFrequency(i: number, val: number) {
    setEditExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, frequencyPerWeek: val } : ex))
  }

  function updateExMinDays(i: number, val: number) {
    setEditExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, minDaysBetween: val } : ex))
  }

  function updateExName(i: number, val: string) {
    setEditExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, name: val } : ex))
  }

  function updateExVideo(i: number, val: string) {
    setEditExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, videoUrl: val } : ex))
  }

  function updateExInstructions(i: number, val: string) {
    setEditExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, instructions: val } : ex))
  }

  function updateExDuration(i: number, val: string) {
    setEditExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, duration: val } : ex))
  }

  function shiftSet(prev: Set<number>, removed: number): Set<number> {
    const next = new Set<number>()
    prev.forEach(n => { if (n < removed) next.add(n); else if (n > removed) next.add(n - 1) })
    return next
  }

  function removeEx(i: number) {
    setEditExercises(prev => prev.filter((_, idx) => idx !== i))
    setVideoExpanded(prev => shiftSet(prev, i))
    setDetailsExpanded(prev => shiftSet(prev, i))
  }

  function toggleVideo(i: number) {
    setVideoExpanded(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })
  }

  function toggleDetails(i: number) {
    setDetailsExpanded(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })
  }

  function toggleDay(day: string) {
    setEditSchedule(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  function confirmMarkDone(name: string) {
    setManualChecked(prev => new Set([...prev, name]))
    setPendingConfirm(null)
    if (clientId) logSession(clientId, name)
  }

  function unmarkDone(name: string) {
    setManualChecked(prev => { const next = new Set(prev); next.delete(name); return next })
  }

  // ── EDIT MODE ──────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
        <div className="ml-auto relative w-[480px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">

          <div className="px-6 py-5 border-b bg-slate-50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${client.color}`}>
                {client.initials}
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Edit Program</h2>
                <p className="text-xs text-slate-500">{client.name} · {client.condition}</p>
              </div>
            </div>
            <button onClick={() => setIsEditing(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-3">Exercises</label>

              <div className="mb-4 p-3 rounded-lg border border-dashed bg-slate-50">
                {library.length > 0 && (
                  <>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
                      <Library className="w-3.5 h-3.5" />
                      Add from library
                    </label>
                    <Select value="" onValueChange={value => value && addFromLibrary(value)}>
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue placeholder="Search the exercise library..." />
                      </SelectTrigger>
                      <SelectContent>
                        {[...libraryByCategory.entries()].map(([category, items]) => (
                          <SelectGroup key={category}>
                            <SelectLabel>{category}</SelectLabel>
                            {items.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400 mt-1.5">Adds the exercise to the list below.</p>
                  </>
                )}
                <div className={`flex gap-2 ${library.length > 0 ? 'mt-2' : ''}`}>
                  <Input
                    placeholder={library.length > 0 ? '...or type a one-off exercise name' : 'Add an exercise...'}
                    value={newExercise}
                    onChange={e => setNewExercise(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addEditExercise()}
                    className="text-sm h-8 bg-white"
                  />
                  <Button size="sm" variant="outline" onClick={addEditExercise}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {editExercises.map((ex, i) => (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50">
                      <span className="w-5 text-xs text-slate-400 font-medium text-right flex-shrink-0">{i + 1}.</span>
                      <Input
                        value={ex.name}
                        onChange={e => updateExName(i, e.target.value)}
                        className="border-0 shadow-none focus-visible:ring-0 h-8 px-1"
                        placeholder={`Exercise ${i + 1}...`}
                      />
                      <button
                        onClick={() => toggleDetails(i)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors flex-shrink-0 ${
                          detailsExpanded.has(i) || ex.instructions
                            ? 'text-slate-700 bg-slate-200 hover:bg-slate-300'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                        {ex.instructions ? 'Details' : 'Add details'}
                      </button>
                      <button
                        onClick={() => toggleVideo(i)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors flex-shrink-0 ${
                          videoExpanded.has(i) || ex.videoUrl
                            ? 'text-teal-600 bg-teal-100 hover:bg-teal-200'
                            : 'text-slate-400 hover:text-teal-500 hover:bg-slate-200'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        {ex.videoUrl ? 'Video' : 'Add video'}
                      </button>
                      <button onClick={() => removeEx(i)} className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 border-t bg-white">
                      <span className="text-xs text-slate-500 flex-shrink-0">Times/week</span>
                      <FrequencyChips size="sm" value={ex.frequencyPerWeek} onChange={val => updateExFrequency(i, val)} />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 border-t bg-white">
                      <span className="text-xs text-slate-500 flex-shrink-0">Min. spacing</span>
                      <GapChips size="sm" value={ex.minDaysBetween} onChange={val => updateExMinDays(i, val)} />
                    </div>
                    {(detailsExpanded.has(i) || ex.instructions || ex.duration) && (
                      <div className="border-t bg-white px-3 py-3 space-y-2.5">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Instructions</label>
                          <textarea
                            className="w-full border rounded-lg p-2 text-xs text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
                            rows={3}
                            placeholder="Describe how to perform this exercise..."
                            value={ex.instructions}
                            onChange={e => updateExInstructions(i, e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Duration</label>
                          <Input
                            placeholder="e.g. 5 min"
                            value={ex.duration}
                            onChange={e => updateExDuration(i, e.target.value)}
                            className="h-7 text-xs w-32"
                          />
                        </div>
                      </div>
                    )}
                    {(videoExpanded.has(i) || ex.videoUrl) && (
                      <div className="border-t bg-white px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Video className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <Input
                            placeholder="Paste YouTube or Vimeo URL..."
                            value={ex.videoUrl}
                            onChange={e => updateExVideo(i, e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        {ex.videoUrl && (
                          <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline mt-1.5 block">
                            Preview link →
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-3">
                Default frequency for new exercises — <span className="text-teal-600 font-semibold">{editFrequency}x per week</span>
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Each exercise above has its own weekly target — this is just the starting value applied when you add a new one.
              </p>
              <FrequencyChips value={editFrequency} onChange={setEditFrequency} />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-3">Schedule Days</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map(day => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      editSchedule.includes(day) ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-2">Therapist Notes</label>
              <textarea
                className="w-full border rounded-xl p-4 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
                rows={5}
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Notes about this client's program, preferences, or progress..."
              />
            </div>

          </div>

          <div className="px-6 py-4 border-t bg-slate-50 flex gap-3 flex-shrink-0">
            <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button
              className={`flex-1 transition-colors ${saved ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-teal-600 hover:bg-teal-700'}`}
              onClick={handleSaveEdit}
              disabled={editExercises.length === 0 && !newExercise.trim()}
            >
              {saved ? '✓ Saved!' : 'Save Changes'}
            </Button>
          </div>

        </div>
      </div>
    )
  }

  // ── VIEW MODE ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="ml-auto relative w-[480px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">

        <div className="px-6 py-5 border-b bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${client.color}`}>
              {client.initials}
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{client.name}</h2>
              <p className="text-xs text-slate-500">Age {client.age} · {client.condition}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Current Program</p>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <h3 className="font-semibold text-teal-900">{client.program}</h3>
              <div className="flex items-center gap-4 mt-2 text-xs text-teal-700">
                <span className="flex items-center gap-1"><Repeat2 className="w-3 h-3" />{weeklyTarget}x per week</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Next: {client.nextSession}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">This Week</p>
              <span className={`text-xs font-medium ${completion === 100 ? 'text-emerald-600' : completion >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {client.completedThisWeek} of {weeklyTarget} sessions · {completion}%
              </span>
            </div>
            <Progress value={completion} className={`h-2 ${completion === 100 ? '[&>div]:bg-emerald-500' : completion >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-400'}`} />
            <div className="flex gap-1.5 mt-3">
              {displaySchedule.map(day => (
                <Badge key={day} variant="secondary" className="text-xs bg-teal-100 text-teal-700 hover:bg-teal-100">{day}</Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Exercises ({displayExercises.length})</p>
            <div className="space-y-3">
              {displayExercises.map(ex => {
                const hasProof = proofSubmitted.has(ex.name)
                const manualDone = manualChecked.has(ex.name)
                const isConfirming = pendingConfirm === ex.name
                const liveEx = liveProgram?.exercises.find(pe => pe.template.title === ex.name)

                if (isConfirming) {
                  return (
                    <div key={ex.name} className="rounded-xl border-2 border-teal-400 bg-teal-50 p-4">
                      <p className="text-sm font-medium text-teal-900 mb-1">Mark as done in-session?</p>
                      <p className="text-xs text-teal-700 mb-3">
                        Confirm that <span className="font-semibold">{ex.name}</span>{' '}was completed during today&apos;s in-person session.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => confirmMarkDone(ex.name)} className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                          Yes, mark done
                        </button>
                        <button onClick={() => setPendingConfirm(null)} className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={ex.name}
                    onClick={() => {
                      if (hasProof) return
                      if (manualDone) { unmarkDone(ex.name); return }
                      setPendingConfirm(ex.name)
                    }}
                    className={`rounded-xl border p-4 transition-colors ${
                      hasProof ? 'bg-emerald-50 border-emerald-200 cursor-default'
                      : manualDone ? 'bg-teal-50 border-teal-200 hover:bg-teal-100 cursor-pointer'
                      : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {hasProof ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        : manualDone ? <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                        : <Circle className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />}
                      <div>
                        <p className={`text-sm font-medium ${hasProof ? 'text-emerald-800' : manualDone ? 'text-teal-800' : 'text-slate-800'}`}>{ex.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{ex.instructions}</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400 flex-wrap">
                          <Clock className="w-3 h-3" />
                          {ex.duration}
                          {hasProof && <span className="ml-2 text-emerald-600 font-medium">· Proof submitted</span>}
                          {manualDone && !hasProof && <span className="ml-2 text-teal-600 font-medium">· Marked done — click to undo</span>}
                          {liveEx?.weekly_target != null && (
                            <span className="ml-2 flex items-center gap-1">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 hover:bg-slate-100">
                                {liveEx.weekly_count ?? 0}/{liveEx.weekly_target} this week
                              </Badge>
                              {liveEx.due_status === 'past_due' && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-red-100 text-red-600 hover:bg-red-100 flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Past due
                                </Badge>
                              )}
                              {!!liveEx.days_until_available && liveEx.days_until_available > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 hover:bg-amber-100 flex items-center gap-0.5">
                                  <Hourglass className="w-2.5 h-2.5" />
                                  {liveEx.days_until_available === 1 ? 'Resting 1 day' : `Resting ${liveEx.days_until_available} days`}
                                </Badge>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Therapist Notes</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-900 leading-relaxed">{displayNotes}</p>
            </div>
          </div>

        </div>

        <div className="px-6 py-4 border-t bg-slate-50 flex gap-3 flex-shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1 bg-teal-600 hover:bg-teal-700 gap-2" onClick={enterEdit}>
            <Pencil className="w-4 h-4" />
            Edit Program
          </Button>
        </div>

      </div>
    </div>
  )
}
