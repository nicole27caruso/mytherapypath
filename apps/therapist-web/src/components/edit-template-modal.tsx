'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus, Video } from 'lucide-react'

export type ExerciseEntry = { name: string; videoUrl: string }

export type EditableTemplate = {
  id: string
  name: string
  description: string
  exercises: ExerciseEntry[]
  frequency: number
  duration: string
  ageRange: string
  useCount: number
  color: string
}

interface EditTemplateModalProps {
  template: EditableTemplate | null
  open: boolean
  onClose: () => void
  onSave: (updated: EditableTemplate) => void
}

export function EditTemplateModal({ template, open, onClose, onSave }: EditTemplateModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [exercises, setExercises] = useState<ExerciseEntry[]>([{ name: '', videoUrl: '' }])
  const [frequency, setFrequency] = useState(3)
  const [duration, setDuration] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [saved, setSaved] = useState(false)
  const [videoExpanded, setVideoExpanded] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (template && open) {
      setName(template.name)
      setDescription(template.description)
      setExercises(template.exercises.length > 0 ? template.exercises : [{ name: '', videoUrl: '' }])
      setFrequency(template.frequency)
      setDuration(template.duration)
      setAgeRange(template.ageRange)
      setSaved(false)
      const expanded = new Set<number>()
      template.exercises.forEach((ex, i) => { if (ex.videoUrl) expanded.add(i) })
      setVideoExpanded(expanded)
    }
  }, [template, open])

  function updateName(i: number, val: string) {
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, name: val } : ex))
  }

  function updateVideo(i: number, val: string) {
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, videoUrl: val } : ex))
  }

  function removeExercise(i: number) {
    setExercises(prev => prev.filter((_, idx) => idx !== i))
    setVideoExpanded(prev => {
      const next = new Set<number>()
      prev.forEach(n => { if (n < i) next.add(n); else if (n > i) next.add(n - 1) })
      return next
    })
  }

  function toggleVideo(i: number) {
    setVideoExpanded(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function handleSave() {
    if (!template) return
    onSave({
      ...template,
      name: name.trim(),
      description: description.trim(),
      exercises: exercises.filter(e => e.name.trim()),
      frequency,
      duration: duration.trim(),
      ageRange: ageRange.trim(),
    })
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1200)
  }

  const canSave = name.trim() && exercises.some(e => e.name.trim())

  if (!open || !template) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

          <div className="flex items-center justify-between px-6 py-5 border-b">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Edit Template</h2>
              <p className="text-xs text-slate-500 mt-0.5">Update exercises, frequency, and video links</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Template Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Description</label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Exercises</label>
              <div className="space-y-2">
                {exercises.map((ex, i) => (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="w-5 text-xs text-slate-400 font-medium text-right flex-shrink-0">{i + 1}.</span>
                      <Input
                        placeholder={`Exercise ${i + 1}...`}
                        value={ex.name}
                        onChange={e => updateName(i, e.target.value)}
                        className="border-0 shadow-none focus-visible:ring-0 h-8 px-1"
                      />
                      <button
                        onClick={() => toggleVideo(i)}
                        title="Add tutorial video URL"
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors flex-shrink-0 ${
                          videoExpanded.has(i) || ex.videoUrl
                            ? 'text-teal-600 bg-teal-50 hover:bg-teal-100'
                            : 'text-slate-400 hover:text-teal-500 hover:bg-slate-50'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        {ex.videoUrl ? 'Video' : 'Add video'}
                      </button>
                      {exercises.length > 1 && (
                        <button
                          onClick={() => removeExercise(i)}
                          className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {(videoExpanded.has(i) || ex.videoUrl) && (
                      <div className="border-t bg-slate-50 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Video className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <Input
                            placeholder="Paste YouTube or Vimeo URL..."
                            value={ex.videoUrl}
                            onChange={e => updateVideo(i, e.target.value)}
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
              <button
                onClick={() => setExercises(prev => [...prev, { name: '', videoUrl: '' }])}
                className="mt-3 flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add exercise
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Frequency</label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={frequency}
                    onChange={e => setFrequency(Number(e.target.value))}
                    className="text-center"
                  />
                  <span className="text-xs text-slate-500 whitespace-nowrap">x/week</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Duration</label>
                <Input
                  placeholder="e.g. 20 min"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Age Range</label>
                <Input
                  placeholder="e.g. 5–10 yrs"
                  value={ageRange}
                  onChange={e => setAgeRange(e.target.value)}
                />
              </div>
            </div>

          </div>

          <div className="px-6 py-4 border-t flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className={`flex-1 transition-colors ${saved ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-teal-600 hover:bg-teal-700'}`}
              onClick={handleSave}
              disabled={!canSave}
            >
              {saved ? '✓ Changes Saved!' : 'Save Changes'}
            </Button>
          </div>

        </div>
      </div>
    </>
  )
}
