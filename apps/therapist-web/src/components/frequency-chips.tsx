'use client'

import { Minus, Plus } from 'lucide-react'

interface FrequencyChipsProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'md'
}

export function FrequencyChips({ value, onChange, min = 1, max = 7, size = 'md' }: FrequencyChipsProps) {
  const dim = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
  const btnDim = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'
  const iconDim = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`${btnDim} rounded-full border flex items-center justify-center hover:bg-slate-50 transition-colors flex-shrink-0`}
      >
        <Minus className={`${iconDim} text-slate-500`} />
      </button>
      <div className="flex gap-1 flex-wrap">
        {numbers.map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`${dim} rounded-full font-medium transition-colors ${
              n <= value ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`${btnDim} rounded-full border flex items-center justify-center hover:bg-slate-50 transition-colors flex-shrink-0`}
      >
        <Plus className={`${iconDim} text-slate-500`} />
      </button>
    </div>
  )
}
