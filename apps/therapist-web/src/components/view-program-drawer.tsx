'use client'

import { useState } from 'react'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, CheckCircle2, Circle, Calendar, Repeat2, Clock, Pencil, Video, Plus, Minus, AlignLeft, ListChecks } from 'lucide-react'

const CLIENT_PROGRAMS: Record<string, {
  exercises: { name: string; duration: string; instructions: string }[]
  schedule: string[]
  notes: string
}> = {
  '1': {
    exercises: [
      { name: 'Pinch and Release', duration: '5 min', instructions: 'Pick up small objects using a pinch grip and release into a container.' },
      { name: 'Bead Threading', duration: '5 min', instructions: 'Thread large plastic beads onto a lace or shoelace.' },
      { name: 'Playdough Squeeze', duration: '5 min', instructions: 'Roll, squeeze, and flatten playdough into balls and snakes.' },
      { name: 'Scissors Practice', duration: '5 min', instructions: 'Cut along straight and curved printed lines with child-safe scissors.' },
    ],
    schedule: ['Mon', 'Wed', 'Fri'],
    notes: 'Emma responds well to colorful materials and game-based framing. Keep sessions playful and positive. Reward sticker chart has been effective.',
  },
  '2': {
    exercises: [
      { name: 'Mirror Therapy', duration: '10 min', instructions: 'Use mirror box for visual feedback — focus on symmetrical arm movements.' },
      { name: 'Ball Squeeze Series', duration: '10 min', instructions: 'Squeeze therapy ball with increasing resistance, 3 sets of 15 reps.' },
      { name: 'Passive ROM', duration: '15 min', instructions: 'Passive range-of-motion for shoulder and elbow — caregiver assisted.' },
      { name: 'Wrist Rotation', duration: '10 min', instructions: 'Slow controlled wrist rotations, 3 sets of 10 reps each direction.' },
    ],
    schedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    notes: 'Monitor fatigue carefully. James tires quickly — allow 2-minute breaks between exercises. His affected side has improved ~15% this month.',
  },
  '3': {
    exercises: [
      { name: 'Sensory Bin Activity', duration: '8 min', instructions: 'Explore rice, dried beans, or kinetic sand with hands; hide and find objects.' },
      { name: 'Tactile Cards', duration: '7 min', instructions: 'Match textures by touch without looking (soft, rough, bumpy, smooth).' },
      { name: 'Weighted Lap Pad', duration: '5 min', instructions: 'Calming deep pressure using weighted lap pad — seated at table.' },
      { name: 'Deep Pressure Input', duration: '5 min', instructions: 'Firm hand-over-hand pressure on arms and legs for body awareness.' },
    ],
    schedule: ['Tue', 'Thu', 'Sat'],
    notes: 'Lily prefers low-stimulation environments. Dim lights when possible. Avoid loud background noise during sessions. Parent present at all times.',
  },
  '4': {
    exercises: [
      { name: 'Ball Squeeze', duration: '8 min', instructions: 'Grip therapy ball, hold 5 seconds, release — 3 sets of 10.' },
      { name: 'Wrist Curls', duration: '8 min', instructions: 'Light resistance wrist curls, palms up and palms down alternating.' },
      { name: 'Finger Extensions', duration: '7 min', instructions: 'Extend fingers against resistance band, 3 sets of 12 reps.' },
      { name: 'Grip Training', duration: '7 min', instructions: 'Forearm grip device at 50% resistance — increase each week.' },
    ],
    schedule: ['Mon', 'Tue', 'Thu', 'Fri'],
    notes: 'Michael is currently on leave following a flare-up. Program is on hold — next review scheduled for July 5th. Contact before resuming.',
  },
  '5': {
    exercises: [
      { name: 'Balance Board Routine', duration: '8 min', instructions: 'Stand on balance board and maintain center position for 30 seconds, 5 reps.' },
      { name: 'Bean Bag Toss', duration: '7 min', instructions: 'Toss and catch bean bags with alternating hands at increasing distance.' },
      { name: 'Jump Rope', duration: '5 min', instructions: 'Basic jump rope with two-foot landing, 3 sets of 20 jumps with rest.' },
      { name: 'Coordination Drills', duration: '5 min', instructions: 'Agility ladder footwork drills for bilateral foot-eye coordination.' },
    ],
    schedule: ['Wed', 'Sat'],
    notes: 'Sophie is making excellent progress. Consider increasing to 3x/week next month. She has shown strong motivation and self-initiates practice.',
  },
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export type ClientProgramState = {
  exercises: { name: string; videoUrl: string; instructions: string; duration: string }[]
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
  const { clientList, submissionList, programTemplates } = useApp()
  const [manualChecked, setManualChecked] = useState<Set<string>>(new Set())
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editExercises, setEditExercises] = useState<{ name: string; videoUrl: string; instructions: string; duration: string }[]>([])
  const [editFrequency, setEditFrequency] = useState(3)
  const [editNotes, setEditNotes] = useState('')
  const [editSchedule, setEditSchedule] = useState<string[]>([])
  const [newExercise, setNewExercise] = useState('')
  const [videoExpanded, setVideoExpanded] = useState<Set<number>>(new Set())
  const [detailsExpanded, setDetailsExpanded] = useState<Set<number>>(new Set())
  const [saved, setSaved] = useState(false)

  const client = clientList.find(c => c.id === clientId)
  const program = clientId ? (CLIENT_PROGRAMS[clientId] ?? { exercises: [], schedule: [], notes: '' }) : null

  if (!open || !client || !program) return null

  const clientSubmissions = submissionList.filter(s => s.clientId === clientId)
  const proofSubmitted = new Set(clientSubmissions.map(s => s.exerciseName))

  const displayExercises = programOverride
    ? programOverride.exercises.map(ae => {
        const detail = program.exercises.find(pe => pe.name === ae.name)
        return {
          name: ae.name,
          duration: ae.duration || detail?.duration || '—',
          instructions: ae.instructions || detail?.instructions || 'Custom exercise assigned by therapist.',
        }
      })
    : program.exercises
  const displayFrequency = programOverride?.frequency ?? client.frequency
  const displayNotes = programOverride?.notes ?? program.notes
  const displaySchedule = programOverride?.schedule ?? program.schedule
  const completion = Math.round((client.completedThisWeek / displayFrequency) * 100)

  function enterEdit() {
    const source = programOverride?.exercises ?? program?.exercises.map(e => ({ name: e.name, videoUrl: '', instructions: e.instructions, duration: e.duration })) ?? []
    setEditExercises(source.map(ae => {
      const detail = program?.exercises.find(pe => pe.name === ae.name)
      return {
        name: ae.name,
        videoUrl: ae.videoUrl ?? '',
        instructions: ae.instructions || detail?.instructions || '',
        duration: ae.duration || detail?.duration || '',
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
    const finalExercises = pending ? [...editExercises, { name: pending, videoUrl: '', instructions: '', duration: '' }] : editExercises
    onSaveProgram(clientId, { exercises: finalExercises, frequency: editFrequency, notes: editNotes, schedule: editSchedule })
    setSaved(true)
    setTimeout(() => { setSaved(false); setIsEditing(false) }, 1200)
  }

  function addEditExercise() {
    if (newExercise.trim()) {
      setEditExercises(prev => [...prev, { name: newExercise.trim(), videoUrl: '', instructions: '', duration: '' }])
      setNewExercise('')
    }
  }

  function applyTemplate(templateId: string) {
    const template = programTemplates.find(t => t.id === templateId)
    if (!template) return
    setEditExercises(template.exercises.map(pe => ({
      name: pe.template.title,
      videoUrl: pe.template.video_url ?? '',
      instructions: pe.template.instructions ?? '',
      duration: pe.template.duration_minutes ? `${pe.template.duration_minutes} min` : '',
    })))
    if (template.frequency_per_week) setEditFrequency(template.frequency_per_week)
    setVideoExpanded(new Set())
    setDetailsExpanded(new Set())
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

              {programTemplates.length > 0 && (
                <div className="mb-4 p-3 rounded-lg border border-dashed bg-slate-50">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
                    <ListChecks className="w-3.5 h-3.5" />
                    Load from a template
                  </label>
                  <Select value="" onValueChange={value => applyTemplate(value ?? '')}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Choose a program template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {programTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title} — {t.body_region ?? t.category ?? 'Program'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400 mt-1.5">Replaces the exercise list below with the template&apos;s exercises.</p>
                </div>
              )}

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
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="Add an exercise..."
                  value={newExercise}
                  onChange={e => setNewExercise(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addEditExercise()}
                  className="text-sm"
                />
                <Button size="sm" variant="outline" onClick={addEditExercise}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-3">
                Weekly Frequency — <span className="text-teal-600 font-semibold">{editFrequency}x per week</span>
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditFrequency(f => Math.max(1, f - 1))} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-slate-50 transition-colors">
                  <Minus className="w-4 h-4 text-slate-500" />
                </button>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map(n => (
                    <button key={n} onClick={() => setEditFrequency(n)} className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${n <= editFrequency ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <button onClick={() => setEditFrequency(f => Math.min(7, f + 1))} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-slate-50 transition-colors">
                  <Plus className="w-4 h-4 text-slate-500" />
                </button>
              </div>
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
                <span className="flex items-center gap-1"><Repeat2 className="w-3 h-3" />{displayFrequency}x per week</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Next: {client.nextSession}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">This Week</p>
              <span className={`text-xs font-medium ${completion === 100 ? 'text-emerald-600' : completion >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {client.completedThisWeek} of {displayFrequency} sessions · {completion}%
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
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {ex.duration}
                          {hasProof && <span className="ml-2 text-emerald-600 font-medium">· Proof submitted</span>}
                          {manualDone && !hasProof && <span className="ml-2 text-teal-600 font-medium">· Marked done — click to undo</span>}
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
