// Remembers the BPM the drummer set for each song, keyed by title, so a new
// setlist PDF with the same songs gets its tempos without retyping them.
import { DEFAULT_BPM } from './setlistParser.js'

export const MEMORY_KEY = 'kp-beat-bpm-memory'

/** Same song written slightly differently in two PDFs must map to one key. */
export function titleKey(title) {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function remember(memory, { title, bpm, timeSignature }) {
  const key = titleKey(title)
  if (!key) return memory
  return { ...memory, [key]: { bpm, timeSignature } }
}

/**
 * Review rows for parsed songs. BPM priority: written in the PDF, then
 * remembered for that title, then the default (flagged for the user to check).
 */
export function buildReviewRows(parsed, memory) {
  return parsed.map((p) => {
    const saved = memory[titleKey(p.title)]
    const source = p.bpm !== null ? 'pdf' : saved ? 'memoria' : 'default'
    return {
      include: true,
      title: p.title,
      bpm: p.bpm ?? saved?.bpm ?? DEFAULT_BPM,
      timeSignature: p.timeSignature ?? saved?.timeSignature ?? '4/4',
      source,
    }
  })
}
