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

  it('falls back to the last plausible number when there is no bpm label', () => {
    const songs = parseSetlistLines(['Scaletta', 'Paranoid 164', 'Smoke on the Water | 3:45 | 112'])
    // Durations like 3:45 are not tempos; the header has no number and is dropped.
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

describe('clampBpm', () => {
  it('keeps manual edits inside a playable range', () => {
    expect(clampBpm('5')).toBe(30)
    expect(clampBpm(999)).toBe(300)
    expect(clampBpm('abc')).toBe(120)
    expect(clampBpm(120.6)).toBe(121)
  })
})
