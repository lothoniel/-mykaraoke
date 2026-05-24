import { BB } from '../../../lib/bubble'
import { BubbleEyebrow } from '../atoms'
import { Sparkle } from '../atoms/stickers'

type Props = {
  title: string
  eyebrow?: string
  note?: string
}

// Lightweight stub used by the not-yet-built mobile screens (Library, Search,
// Settings). Real implementations land in phases 3–4.
export default function MobileStub({ title, eyebrow = 'coming soon', note }: Props) {
  return (
    <>
      <div style={{ padding: '6px 0 24px' }}>
        <div
          style={{
            fontSize: 18,
            color: BB.ink2,
            fontFamily: 'var(--bb-font-script)',
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: -0.7,
            fontFamily: 'var(--bb-font-display)',
            color: BB.ink,
            marginTop: 4,
          }}
        >
          {title}
        </div>
      </div>

      <BubbleEyebrow decoration={<Sparkle size={20} color={BB.primary} />}>
        placeholder
      </BubbleEyebrow>
      <div
        style={{
          background: BB.surface,
          padding: 20,
          borderRadius: 22,
          boxShadow: '0 4px 0 rgba(58,23,64,0.06)',
          color: BB.ink2,
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {note ?? 'This screen ships in a later phase. Tab navigation works — pick a different tab to test.'}
      </div>
    </>
  )
}
