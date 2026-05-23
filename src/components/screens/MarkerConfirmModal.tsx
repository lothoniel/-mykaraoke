import { useState } from 'react'

type Marker = { index: number; text: string }

type Props = {
  markers: Marker[]
  versionLabel: string
  onCancel: () => void
  onConfirm: (selectedIndices: number[]) => void
}

export default function MarkerConfirmModal({ markers, versionLabel, onCancel, onConfirm }: Props) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(markers.map((m) => m.index)))

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const allChecked = selected.size === markers.length
  const noneChecked = selected.size === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} aria-hidden />
      <div
        className="relative z-10 bg-bg rounded-2xl border border-border w-full max-w-md flex flex-col"
        style={{ maxHeight: '80vh' }}
      >
        <div className="flex-none px-5 pt-5 pb-3 border-b border-border">
          <h2 className="text-[16px] font-extrabold text-text">Strip section markers?</h2>
          <p className="text-[12px] text-text-2 mt-1">
            Found {markers.length} bracketed line{markers.length === 1 ? '' : 's'} in {versionLabel}. Uncheck any you want to keep.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() =>
                setSelected(allChecked ? new Set() : new Set(markers.map((m) => m.index)))
              }
              className="text-[11px] font-semibold text-text-2 underline"
              style={{ textUnderlineOffset: 3 }}
            >
              {allChecked ? 'Uncheck all' : 'Check all'}
            </button>
            <span className="text-[11px] text-text-2">
              {selected.size} of {markers.length} selected
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {markers.map((m) => {
              const checked = selected.has(m.index)
              return (
                <li key={m.index}>
                  <label
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] cursor-pointer transition-colors"
                    style={{
                      background: checked ? 'rgba(200, 241, 53, 0.12)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!checked) e.currentTarget.style.background = 'rgba(100, 60, 180, 0.04)'
                    }}
                    onMouseLeave={(e) => {
                      if (!checked) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(m.index)}
                      className="flex-none"
                    />
                    <span className="text-[12px] text-text-2 flex-none w-7 tabular-nums">
                      L{m.index + 1}
                    </span>
                    <span className="text-[13px] font-mono text-text truncate">{m.text}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex-none flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <button
            onClick={onCancel}
            className="text-[12px] font-semibold text-text-2 underline"
            style={{ textUnderlineOffset: 3 }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={noneChecked}
            className="text-[12px] font-bold"
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              background: noneChecked ? '#E5E7EB' : 'var(--accent)',
              color: noneChecked ? '#9CA3AF' : '#1C0840',
              cursor: noneChecked ? 'not-allowed' : 'pointer',
            }}
          >
            Strip selected & copy
          </button>
        </div>
      </div>
    </div>
  )
}
