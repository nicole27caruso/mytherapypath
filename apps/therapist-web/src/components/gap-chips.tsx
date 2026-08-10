'use client'

interface GapChipsProps {
  value: number // 0 = no spacing requirement
  onChange: (value: number) => void
  size?: 'sm' | 'md'
}

const OPTIONS = [0, 1, 2, 3, 5, 7]

// Unlike FrequencyChips (a cumulative "how many this week" fill bar), spacing
// is a single choice, not a count -- so this renders as plain single-select
// pills rather than a filled range.
export function GapChips({ value, onChange, size = 'md' }: GapChipsProps) {
  const dim = size === 'sm' ? 'h-6 px-2 text-xs' : 'h-8 px-3 text-sm'

  return (
    <div className="flex gap-1 flex-wrap">
      {OPTIONS.map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`${dim} rounded-full font-medium transition-colors ${
            n === value ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'
          }`}
        >
          {n === 0 ? 'Off' : `${n}d`}
        </button>
      ))}
    </div>
  )
}
