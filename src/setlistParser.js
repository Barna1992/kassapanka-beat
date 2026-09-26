// Turns the text lines of a setlist PDF into songs.
// Kept free of pdf.js so it can be unit-tested with plain strings.

export const MIN_BPM = 30
export const MAX_BPM = 300
export const DEFAULT_BPM = 120

const SIGNATURE_RE = /\b(\d{1,2})\s*\/\s*(2|4|8|16)\b/
const EXPLICIT_BPM_RE = /(\d{2,3})(?:[.,]\d+)?\s*bpm\b|\bbpm\s*[:=]?\s*(\d{2,3})/i
const LIST_INDEX_RE = /^\s*\d{1,3}\s*[.)\-–:]\s*/
const DURATION_RE = /\b\d{1,2}[:']\d{2}\b/g
const EDGE_SEPARATORS_RE = /^[\s\-–—|•·:,;]+|[\s\-–—|•·:,;(\[]+$/g

export function clampBpm(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return DEFAULT_BPM
  return Math.min(MAX_BPM, Math.max(MIN_BPM, n))
}

const inRange = (n) => n >= MIN_BPM && n <= MAX_BPM

function cleanTitle(text) {
  return text.replace(/\s{2,}/g, ' ').replace(EDGE_SEPARATORS_RE, '').replace(/\(\s*\)|\[\s*\]/g, '').trim()
}

function parseLine(raw, explicitOnly) {
  // Durations like 3:45 are neither tempo nor title.
  let text = raw.replace(LIST_INDEX_RE, '').replace(DURATION_RE, ' ')

  let timeSignature = null
  const sig = text.match(SIGNATURE_RE)
  if (sig) {
    timeSignature = `${sig[1]}/${sig[2]}`
    text = text.replace(sig[0], ' ')
  }

  let bpm = null
  const explicit = text.match(EXPLICIT_BPM_RE)
  if (explicit) {
    const n = Number(explicit[1] ?? explicit[2])
    if (inRange(n)) bpm = n
    text = text.replace(explicit[0], ' ')
  } else if (!explicitOnly) {
    // No "bpm" label anywhere in the document: take the last plausible number.
    const numbers = [...text.matchAll(/\b(\d{2,3})\b/g)]
    const last = numbers.reverse().find((m) => inRange(Number(m[1])))
    if (last) {
      bpm = Number(last[1])
      text = text.slice(0, last.index) + ' ' + text.slice(last.index + last[0].length)
    }
  }

  return { title: cleanTitle(text), bpm, timeSignature }
}

/**
 * @param {string[]} lines text lines in reading order
 * @returns {{title: string, bpm: number|null, timeSignature: string|null}[]}
 */
export function parseSetlistLines(lines) {
  const nonEmpty = lines.map((l) => l.trim()).filter(Boolean)
  // If the PDF labels tempos with "bpm", trust only those: stray numbers
  // (dates, "Blink 182") would otherwise be taken as tempo.
  const explicitOnly = nonEmpty.some((l) => EXPLICIT_BPM_RE.test(l))
  const parsed = nonEmpty.map((l) => parseLine(l, explicitOnly)).filter((s) => s.title)

  const withBpm = parsed.filter((s) => s.bpm !== null)
  // A setlist where no line carries a tempo is still useful: import every line
  // and let the user fill the BPM in the review step.
  return withBpm.length > 0 ? withBpm : parsed
}
