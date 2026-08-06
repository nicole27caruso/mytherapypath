'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApp } from '@/lib/app-context'
import { X, Plus, Minus, Video, Library } from 'lucide-react'
import type { ApiTemplate } from '@/lib/api'

type ExerciseEntry = { name: string; videoUrl: string; instructions: string; duration: string }

function libraryToExercise(t: ApiTemplate): ExerciseEntry {
  return {
    name: t.title,
    videoUrl: t.video_url ?? '',
    instructions: t.instructions ?? '',
    duration: t.duration_minutes ? `${t.duration_minutes} min` : '',
  }
}

interface AssignDrawerProps {
  open: boolean
  onClose: () => void
  preselectedClientId?: string
  preselectedExerciseId?: string
  existingExercises?: ExerciseEntry[]
  existingFrequency?: number
  existingNotes?: string
  onAssign?: (clientId: string, exercises: ExerciseEntry[], frequency: number, notes: string) => void
}

export function AssignDrawer({ open, onClose, preselectedClientId, preselectedExerciseId, existingExercises, existingFrequency, existingNotes, onAssign }: AssignDrawerProps) {
  const { clientList, library } = useApp()
  const preExercise = library.find(t => t.id === preselectedExerciseId)
  const preClient = clientList.find(c => c.id === preselectedClientId)

  const libraryByCategory = new Map<string, ApiTemplate[]>()
  for (const t of library) {
    const key = t.category ?? 'Other'
    libraryByCategory.set(key, [...(libraryByCategory.get(key) ?? []), t])
  }

  const [clientId, setClientId] = useState(preselectedClientId ?? '')
  const initialExercises = existingExercises ?? (preExercise ? [libraryToExercise(preExercise)] : [])
  const [exercises, setExercises] = useState<ExerciseEntry[]>(initialExercises)
  const [newExercise, setNewExercise] = useState('')
  const [frequency, setFrequency] = useState(existingFrequency ?? 3)
  const [notes, setNotes] = useState(existingNotes ?? '')
  const [saved, setSaved] = useState(false)
  const [videoExpanded, setVideoExpanded] = useState<Set<number>>(new Set())

  useEffect(() => {
    // Defer setting state to avoid synchronous setState in effect (prevents cascading renders)
    const id = setTimeout(() => {
      setClientId(preselectedClientId ?? '')
      if (preselectedExerciseId) {
        const selected = library.find(t => t.id === preselectedExerciseId)
        if (selected) setExercises([libraryToExercise(selected)])
      }
    }, 0)
    return () => clearTimeout(id)
  }, [preselectedClientId, preselectedExerciseId, library])

  function addFromLibrary(templateId: string) {
    const t = library.find(l => l.id === templateId)
    if (t) setExercises(prev => [...prev, libraryToExercise(t)])
  }

  function addExercise() {
    if (newExercise.trim()) {
      setExercises(prev => [...prev, { name: newExercise.trim(), videoUrl: '', instructions: '', duration: '' }])
      setNewExercise('')
    }
  }

  function removeExercise(i: number) {
    setExercises(prev => prev.filter((_, idx) => idx !== i))
    setVideoExpanded(prev => {
      const next = new Set<number>()
      prev.forEach(n => { if (n < i) next.add(n); else if (n > i) next.add(n - 1) })
      return next
    })
  }

  function updateVideoUrl(i: number, val: string) {
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, videoUrl: val } : ex))
  }

  function toggleVideo(i: number) {
    setVideoExpanded(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function handleSave() {
    const pending = newExercise.trim()
    const finalExercises = pending
      ? [...exercises, { name: pending, videoUrl: '', instructions: '', duration: '' }]
      : exercises
    if (pending) setNewExercise('')
    const resolvedClientId = preselectedClientId || clientId
    if (resolvedClientId) onAssign?.(resolvedClientId, finalExercises, frequency, notes)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 1500)
  }

  const canSave = (clientId || preselectedClientId) && (exercises.length > 0 || newExercise.trim().length > 0)

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[440px] bg-white z-50 flex flex-col shadow-2xl">

        <div className="flex items-center justify-between px-6 py-5 border-b">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Assign Program</h2>
            <p className="text-xs text-slate-500 mt-0.5">Set up a home exercise program for a client</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Client</label>
            {preClient ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${preClient.color}`}>
                  {preClient.initials}
                </div>
                <div>
                  <p className="text-sm font-medium">{preClient.name}</p>
                  <p className="text-xs text-slate-500">{preClient.condition}</p>
                </div>
              </div>
            ) : (
              <Select value={clientId} onValueChange={value => setClientId(value ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clientList.filter(c => c.status === 'active').map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.condition}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 block mb-2">
              <Library className="w-3.5 h-3.5" />
              Add from library
            </label>
            <Select value="" onValueChange={value => value && addFromLibrary(value)}>
              <SelectTrigger>
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
            <p className="text-xs text-slate-400 mt-1.5">Adds the exercise to the list below. You can also type a one-off exercise name manually.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Exercises</label>
            <div className="space-y-2 mb-3">
              {exercises.length === 0 && (
                <p className="text-sm text-slate-400 italic py-2">No exercises added yet.</p>
              )}
              {exercises.map((ex, i) => (
                <div key={i} className="rounded-lg border overflow-hidden">
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50">
                    <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm flex-1">{ex.name}</span>
                    <button
                      onClick={() => toggleVideo(i)}
                      title="Add tutorial video URL"
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors flex-shrink-0 ${
                        videoExpanded.has(i) || ex.videoUrl
                          ? 'text-teal-600 bg-teal-100 hover:bg-teal-200'
                          : 'text-slate-400 hover:text-teal-500 hover:bg-slate-200'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      {ex.videoUrl ? 'Video' : 'Add video'}
                    </button>
                    <button onClick={() => removeExercise(i)} className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {(videoExpanded.has(i) || ex.videoUrl) && (
                    <div className="border-t bg-white px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Video className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <Input
                          placeholder="Paste YouTube or Vimeo URL..."
                          value={ex.videoUrl}
                          onChange={e => updateVideoUrl(i, e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                      {ex.videoUrl && (
                        <a
                          href={ex.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-teal-600 hover:underline mt-1.5 block"
                        >
                          Preview link →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add an exercise..."
                value={newExercise}
                onChange={e => setNewExercise(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addExercise()}
                className="text-sm"
              />
              <Button size="sm" variant="outline" onClick={addExercise}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-3">
              Weekly Frequency —{' '}
              <span className="text-teal-600 font-semibold">{frequency}x per week</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFrequency(f => Math.max(1, f - 1))}
                className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <Minus className="w-4 h-4 text-slate-500" />
              </button>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button
                    key={n}
                    onClick={() => setFrequency(n)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      n <= frequency ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setFrequency(f => Math.min(7, f + 1))}
                className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Notes for Client</label>
            <textarea
              className="w-full border rounded-lg p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
              rows={3}
              placeholder="Any special instructions or encouragement for the client..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

        </div>

        <div className="px-6 py-4 border-t flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className={`flex-1 transition-colors ${saved ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-teal-600 hover:bg-teal-700'}`}
            onClick={handleSave}
            disabled={!canSave}
          >
            {saved ? '✓ Assigned!' : 'Assign Program'}
          </Button>
        </div>

      </div>
    </>
  )
}
