import { useEffect, useMemo, useState } from 'react'
import type { Timing } from '../../types'
import { formatSeconds } from '../../lib/youtube'

type Props = {
  originalLines: string[]
  originalTimings: Timing[]
  versionLines: string[]
  versionLabel: string
  onCancel: () => void
  onApply: (alignedVersionLines: string[]) => void
}

const strokeAttrs = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function PlusIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function MinusIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function LyricAlignModal({
  originalLines,
  originalTimings,
  versionLines,
  versionLabel,
  onCancel,
  onApply,
}: Props) {
  const [rows, setRows] = useState<string[]>(versionLines)

  // Map lineIndex → timestamp seconds for quick lookup
  const timestampByLine = useMemo(() => {
    const m = new Map<number, number>()
    for (const t of originalTimings) m.set(t.lineIndex, t.timestamp)
    return m
  }, [originalTimings])

  const targetCount = originalLines.length
  const matched = rows.length === targetCount
  const maxRows = Math.max(targetCount, rows.length)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  function updateRow(i: number, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? value : r)))
  }

  function insertAbove(i: number) {
    setRows((prev) => [...prev.slice(0, i), '', ...prev.slice(i)])
  }

  function appendRow() {
    setRows((prev) => [...prev, ''])
  }

  function deleteRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleApply() {
    // Strip trailing empty rows so they don't pollute the lyrics
    const cleaned = rows.map((r) => r.trim())
    onApply(cleaned)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden />
      <div
        className="relative z-10 bg-bg rounded-2xl border border-border w-full max-w-5xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex-none px-5 py-4 border-b border-border flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-extrabold text-text">Align {versionLabel.toLowerCase()} with original</h2>
            <p className="text-[12px] text-text-2 mt-0.5">
              Edit, insert (+) or delete (−) rows on the right so each line matches the original.
            </p>
          </div>
          <span
            className="text-[12px] font-bold tabular-nums px-3 py-1 rounded-full"
            style={{
              background: matched ? 'rgba(200, 241, 53, 0.20)' : 'rgba(239, 68, 68, 0.08)',
              color: matched ? 'var(--accent-strong)' : '#B91C1C',
            }}
          >
            {rows.length} / {targetCount} lines
          </span>
          <button
            onClick={onCancel}
            className="text-[12px] font-semibold text-text-2 underline"
            style={{ textUnderlineOffset: 3 }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!matched}
            className="text-[12px] font-bold"
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              background: matched ? 'var(--accent)' : '#E5E7EB',
              color: matched ? '#1C0840' : '#9CA3AF',
              cursor: matched ? 'pointer' : 'not-allowed',
            }}
            title={matched ? 'Copy timings using aligned lyrics' : 'Line counts must match'}
          >
            Copy timings
          </button>
        </div>

        {/* Column headers */}
        <div className="flex-none grid grid-cols-2 px-5 py-2 border-b border-border bg-[#FAFAFE]">
          <div className="text-[11px] font-bold uppercase tracking-wide text-text-2">
            Original (read-only)
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-text-2 pl-3">
            {versionLabel}
          </div>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2">
            {Array.from({ length: maxRows }).map((_, i) => {
              const orig = originalLines[i]
              const ts = timestampByLine.get(i)
              const value = rows[i]
              const hasOrig = orig !== undefined
              const hasVersion = value !== undefined
              return (
                <div key={i} className="contents">
                  {/* Original cell */}
                  <div
                    className="px-5 py-2 border-b border-border flex items-start gap-2"
                    style={{ background: !hasOrig ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}
                  >
                    <span className="text-[11px] text-text-2 tabular-nums flex-none w-12 pt-1.5">
                      {ts !== undefined ? formatSeconds(ts) : hasOrig ? '—' : ''}
                    </span>
                    <span className="text-[13px] text-text pt-1.5 break-words">
                      {hasOrig ? orig : <span className="text-text-2 italic">(no line)</span>}
                    </span>
                  </div>

                  {/* Version cell */}
                  <div
                    className="px-3 py-1.5 border-b border-border flex items-center gap-1.5"
                    style={{ background: !hasVersion ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}
                  >
                    <span className="text-[11px] text-text-2 tabular-nums flex-none w-6">
                      {hasVersion ? `L${i + 1}` : ''}
                    </span>
                    {hasVersion ? (
                      <>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => updateRow(i, e.target.value)}
                          className="flex-1 text-[13px] text-text outline-none px-2 py-1 rounded"
                          style={{
                            background: '#FAFAFE',
                            border: '1px solid rgba(100, 60, 180, 0.13)',
                          }}
                        />
                        <button
                          onClick={() => insertAbove(i)}
                          title="Insert blank line above"
                          aria-label="Insert blank line above"
                          className="flex-none w-6 h-6 rounded flex items-center justify-center text-text-2"
                          style={{ background: '#EBE4FF' }}
                        >
                          <PlusIcon />
                        </button>
                        <button
                          onClick={() => deleteRow(i)}
                          title="Delete this line"
                          aria-label="Delete this line"
                          className="flex-none w-6 h-6 rounded flex items-center justify-center text-text-2"
                          style={{ background: '#EBE4FF' }}
                        >
                          <MinusIcon />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={appendRow}
                        title="Add line"
                        className="flex-none text-[11px] font-semibold text-text-2 underline"
                        style={{ textUnderlineOffset: 3 }}
                      >
                        + add line
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
