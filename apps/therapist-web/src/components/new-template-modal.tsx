'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus } from 'lucide-react'
import type { EditableTemplate } from '@/components/edit-template-modal'

interface NewTemplateModalProps {
  open: boolean
  onClose: () => void
  onCreate: (template: EditableTemplate) => Promise<void>
}

export function NewTemplateModal({ open, onClose, onCreate }: NewTemplateModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [bodyRegion, setBodyRegion] = useState('')
  const [injuryType, setInjuryType] = useState('')
  const [phase, setPhase] = useState('')
  const [focus, setFocus] = useState('')
  const [ergonomics, setErgonomics] = useState('')
  const [equipment, setEquipment] = useState('')
  const [precautions, setPrecautions] = useState('')
  const [exercises, setExercises] = useState<string[]>([''])
  const [frequency, setFrequency] = useState(3)
  const [duration, setDuration] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [saved, setSaved] = useState(false)

  function updateExercise(i: number, val: string) {
    setExercises(prev => prev.map((ex, idx) => (idx === i ? val : ex)))
  }

  function removeExercise(i: number) {
    setExercises(prev => prev.filter((_, idx) => idx !== i))
  }

  function handleClose() {
    setName('')
    setDescription('')
    setBodyRegion('')
    setInjuryType('')
    setPhase('')
    setFocus('')
    setErgonomics('')
    setEquipment('')
    setPrecautions('')
    setExercises([''])
    setFrequency(3)
    setDuration('')
    setAgeRange('')
    setSaved(false)
    onClose()
  }

  async function handleSave() {
    const template: EditableTemplate = {
      id: `new-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      bodyRegion: bodyRegion.trim(),
      injuryType: injuryType.trim(),
      phase: phase.trim(),
      focus: focus.trim(),
      ergonomics: ergonomics.trim(),
      equipment: equipment.trim(),
      precautions: precautions.trim(),
      exercises: exercises.filter(e => e.trim()).map(ex => ({ name: ex.trim(), videoUrl: '' })),
      frequency,
      duration: duration.trim(),
      ageRange: ageRange.trim(),
      useCount: 0,
      color: 'bg-slate-100',
    }

    await onCreate(template)
    setSaved(true)
    setTimeout(() => handleClose(), 1500)
  }

  const canSave = name.trim() && exercises.some(e => e.trim())

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

          <div className="flex items-center justify-between px-6 py-5 border-b">
            <div>
              <h2 className="text-base font-semibold text-slate-900">New Program Template</h2>
              <p className="text-xs text-slate-500 mt-0.5">Save a reusable exercise program</p>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Template Name</label>
              <Input
                placeholder="e.g. Pediatric Fine Motor Starter"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Description</label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                rows={2}
                placeholder="Brief description of this program's goals..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Body Region</label>
                <Input value={bodyRegion} onChange={e => setBodyRegion(e.target.value)} placeholder="e.g. Wrist / Hand" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Injury Type</label>
                <Input value={injuryType} onChange={e => setInjuryType(e.target.value)} placeholder="e.g. Carpal Tunnel" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Phase</label>
                <Input value={phase} onChange={e => setPhase(e.target.value)} placeholder="e.g. Subacute" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Focus</label>
                <Input value={focus} onChange={e => setFocus(e.target.value)} placeholder="e.g. Strength" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Ergonomics</label>
                <Input value={ergonomics} onChange={e => setErgonomics(e.target.value)} placeholder="e.g. Neutral setup" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Equipment</label>
                <Input value={equipment} onChange={e => setEquipment(e.target.value)} placeholder="e.g. Therapy ball" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Precautions</label>
              <Input value={precautions} onChange={e => setPrecautions(e.target.value)} placeholder="e.g. Avoid flare-ups" />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Exercises</label>
              <div className="space-y-2">
                {exercises.map((ex, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 text-xs text-slate-400 font-medium text-right flex-shrink-0">{i + 1}.</span>
                    <Input
                      placeholder={`Exercise ${i + 1}...`}
                      value={ex}
                      onChange={e => updateExercise(i, e.target.value)}
                    />
                    {exercises.length > 1 && (
                      <button
                        onClick={() => removeExercise(i)}
                        className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setExercises(prev => [...prev, ''])}
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
            <Button variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button
              className={`flex-1 transition-colors ${saved ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-teal-600 hover:bg-teal-700'}`}
              onClick={handleSave}
              disabled={!canSave}
            >
              {saved ? '✓ Saved!' : 'Save Template'}
            </Button>
          </div>

        </div>
      </div>
    </>
  )
}
