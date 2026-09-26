import { describe, expect, it } from 'vitest'
import { titleKey, remember, buildReviewRows } from './bpmMemory.js'

const parsed = (title, bpm = null, timeSignature = null) => ({ title, bpm, timeSignature })

describe('titleKey', () => {
  it('matches the same song written differently in two setlists', () => {
    // Different PDFs use different dashes, apostrophes and capitalisation.
    expect(titleKey("What's My Age Again? – blink-182")).toBe(titleKey('What’s my age again - Blink 182'))
    expect(titleKey('Perché – Artista')).toBe(titleKey('perche - artista'))
  })

  it('keeps different songs apart', () => {
    expect(titleKey('Warning – Green Day')).not.toBe(titleKey('Holiday – Green Day'))
  })
})

describe('buildReviewRows', () => {
  it('fills a song missing from the PDF with the tempo remembered from last time', () => {
    const memory = remember({}, { title: 'Jenny – Tommy Tutone', bpm: 138, timeSignature: '4/4' })
    const [row] = buildReviewRows([parsed('Jenny - Tommy Tutone')], memory)
    expect(row).toMatchObject({ bpm: 138, source: 'memoria' })
  })

  it('lets a tempo written in the PDF win over the remembered one', () => {
    // The PDF is the band's latest decision for this gig.
    const memory = remember({}, { title: 'Iris', bpm: 90, timeSignature: '4/4' })
    const [row] = buildReviewRows([parsed('Iris', 96, '6/8')], memory)
    expect(row).toMatchObject({ bpm: 96, timeSignature: '6/8', source: 'pdf' })
  })

  it('flags unknown songs so the drummer knows the tempo is a placeholder', () => {
    const [row] = buildReviewRows([parsed('Canzone nuova')], {})
    expect(row).toMatchObject({ bpm: 120, timeSignature: '4/4', source: 'default' })
  })
})
