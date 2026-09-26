import { describe, expect, it } from 'vitest'
import { parseSetlistLines, clampBpm } from './setlistParser.js'

describe('parseSetlistLines', () => {
  it('reads a numbered setlist with labelled bpm and ignores the header', () => {
    const songs = parseSetlistLines([
      'SETLIST KASSAPANKA - 12/10/2026',
      '1. Ace of Spades - 140 bpm',
      '2) Seven Nation Army 124BPM',
      '3 - Highway to Hell bpm: 116',
    ])
    expect(songs).toEqual([
      { title: 'Ace of Spades', bpm: 140, timeSignature: null },
      { title: 'Seven Nation Army', bpm: 124, timeSignature: null },
      { title: 'Highway to Hell', bpm: 116, timeSignature: null },
    ])
  })

  it('does not take numbers inside titles as tempo when the pdf labels bpm', () => {
    // "Blink 182" must stay in the title: tempo comes only from "bpm" labels.
    const songs = parseSetlistLines(['All the Small Things (Blink 182) 148 bpm', 'Song 2 - 130 bpm'])
    expect(songs.map((s) => [s.title, s.bpm])).toEqual([
      ['All the Small Things (Blink 182)', 148],
      ['Song 2', 130],
    ])
  })

  it('reads an unlabelled tempo only when it is its own trailing field', () => {
    const songs = parseSetlistLines(['Scaletta', 'Paranoid - 164', 'Smoke on the Water | 3:45 | 112', 'Iron Man 76'])
    // Durations like 3:45 are not tempos; "Iron Man 76" has no separator, so 76
    // may be part of the title and is left alone.
    expect(songs).toEqual([
      { title: 'Paranoid', bpm: 164, timeSignature: null },
      { title: 'Smoke on the Water', bpm: 112, timeSignature: null },
    ])
  })

  it('extracts the time signature without mistaking it for a date or tempo', () => {
    const [song] = parseSetlistLines(['Money - 7/4 - 120 bpm'])
    expect(song).toEqual({ title: 'Money', bpm: 120, timeSignature: '7/4' })
  })

  it('rejects out-of-range numbers as bpm', () => {
    // 2026 is a year, 12 is too slow to be a tempo: no line has a usable bpm,
    // so every line is kept for the user to fill in.
    const songs = parseSetlistLines(['Intro 12', 'Tour 2026'])
    expect(songs.every((s) => s.bpm === null)).toBe(true)
    expect(songs).toHaveLength(2)
  })

  it('keeps all lines when the pdf is a plain list of titles', () => {
    const songs = parseSetlistLines(['Enter Sandman', '', 'Back in Black'])
    expect(songs).toEqual([
      { title: 'Enter Sandman', bpm: null, timeSignature: null },
      { title: 'Back in Black', bpm: null, timeSignature: null },
    ])
  })
})

// Real setlist (Sossai, 19/09/2026) as pdf.js returns it: bold title and
// regular artist are separate text items joined on one line. No BPM inside.
const SOSSAI = [
  'KASSAPANKA',
  'Scaletta Sossai – 19 settembre 2026',
  '1. God Save the Queen  – Sex Pistols',
  '4. In Too Deep  – Sum 41',
  '8. Jenny  – Tommy Tutone',
  '19. Motivation  – Sum 41',
  '21. All the Small Things  – blink-182',
  '24. What\'s My Age Again?  – blink-182',
]

describe('real setlist without tempos', () => {
  it('imports every numbered song and never reads band names as bpm', () => {
    // Regression: "Sum 41" and "blink-182" were taken as 41/182 bpm and the
    // songs without a number were dropped (4 of 28 imported).
    const songs = parseSetlistLines(SOSSAI)
    expect(songs.map((s) => s.title)).toEqual([
      'God Save the Queen – Sex Pistols',
      'In Too Deep – Sum 41',
      'Jenny – Tommy Tutone',
      'Motivation – Sum 41',
      'All the Small Things – blink-182',
      "What's My Age Again? – blink-182",
    ])
    expect(songs.every((s) => s.bpm === null)).toBe(true)
  })
})

describe('clampBpm', () => {
  it('keeps manual edits inside a playable range', () => {
    expect(clampBpm('5')).toBe(30)
    expect(clampBpm(999)).toBe(300)
    expect(clampBpm('abc')).toBe(120)
    expect(clampBpm(120.6)).toBe(121)
  })
})
