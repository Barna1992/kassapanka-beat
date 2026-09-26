// Turns the text lines of a setlist PDF into songs.
// Kept free of pdf.js so it can be unit-tested with plain strings.

export const MIN_BPM = 30
export const MAX_BPM = 300
export const DEFAULT_BPM = 120

const SIGNATURE_RE = /\b(\d{1,2})\s*\/\s*(2|4|8|16)\b/
const EXPLICIT_BPM_RE = /(\d{2,3})(?:[.,]\d+)?\s*bpm\b|\bbpm\s*[:=]?\s*(\d{2,3})/i
const LIST_INDEX_RE = /^\s*\d{1,3}\s*[.)\-–:]\s*/
const DURATION_RE = /\b\d{1,2}[:']\d{2}\b/g
const TRAILING_FIELD_RE = /\s[\-–—|•·]\s*(\d{2,3})\s*$/
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
    // No "bpm" label anywhere in the document: accept a bare number only as its
    // own trailing field ("Title – 140"), so band names like "Sum 41" or
    // "blink-182" are not read as tempo.
    const field = text.match(TRAILING_FIELD_RE)
    if (field && inRange(Number(field[1]))) {
      bpm = Number(field[1])
      text = text.slice(0, field.index)
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

  // In a numbered setlist the songs are exactly the numbered lines: this drops
  // the band name, date and other headers without guessing.
  const numbered = nonEmpty.filter((l) => LIST_INDEX_RE.test(l))
  if (numbered.length >= 3 && numbered.length >= nonEmpty.length / 2) {
    return numbered.map((l) => parseLine(l, explicitOnly)).filter((s) => s.title)
  }

  const parsed = nonEmpty.map((l) => parseLine(l, explicitOnly)).filter((s) => s.title)
  const withBpm = parsed.filter((s) => s.bpm !== null)
  // Unnumbered list: lines with a tempo are the songs. If none has one,
  // import every line and let the user fill the BPM in the review step.
  return withBpm.length > 0 ? withBpm : parsed
}
