import { useEffect, useRef, useState } from 'react'
import { useMetronome } from './useMetronome.js'
import { parseSetlistLines, clampBpm, DEFAULT_BPM } from './setlistParser.js'
import { MEMORY_KEY, remember, buildReviewRows } from './bpmMemory.js'

const STORAGE_KEY = 'kp-beat-setlist'
const SIGNATURES = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '12/8']
const newId = () => Math.random().toString(36).slice(2, 10)

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved && Array.isArray(saved.songs)) return saved
  } catch {}
  return { songs: [], selectedId: null }
}

function loadMemory() {
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY)) || {}
  } catch {
    return {}
  }
}

const SOURCE_LABEL = { pdf: 'dal PDF', memoria: 'ricordato', manuale: 'modificato', default: 'da impostare' }

function SignatureSelect({ value, onChange, className }) {
  const options = SIGNATURES.includes(value) ? SIGNATURES : [...SIGNATURES, value]
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}

function BpmInput({ value, onCommit, className }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  return (
    <input
      className={className}
      type="number"
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(clampBpm(draft))}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      onClick={(e) => e.stopPropagation()}
    />
  )
}

function ImportReview({ fileName, rows, setRows, onConfirm, onCancel }) {
  const update = (i, patch) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)))
  const included = rows.filter((r) => r.include)
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Controlla i brani</h2>
        <p className="muted">
          Da <b>{fileName}</b>: {rows.length} righe riconosciute. Correggi titoli e BPM, togli la spunta a quello che non è una canzone.
        </p>
        <div className="review-list">
          {rows.map((row, i) => (
            <div key={i} className={`review-row ${row.include ? '' : 'excluded'}`}>
              <input type="checkbox" checked={row.include} onChange={(e) => update(i, { include: e.target.checked })} />
              <input className="field grow" value={row.title} onChange={(e) => update(i, { title: e.target.value })} />
              <BpmInput
                className={`field bpm-field ${row.source === 'default' ? 'warn' : ''}`}
                value={row.bpm}
                onCommit={(bpm) => bpm !== row.bpm && update(i, { bpm, source: 'manuale' })}
              />
              <span className={`bpm-source ${row.source}`}>{SOURCE_LABEL[row.source]}</span>
              <SignatureSelect className="field" value={row.timeSignature} onChange={(timeSignature) => update(i, { timeSignature })} />
            </div>
          ))}
        </div>
        {rows.some((r) => r.include && r.source === 'default') && (
          <p className="warn-text">
            I BPM evidenziati non sono né nel PDF né ricordati: impostati a {DEFAULT_BPM}. Quando li correggi l'app se li ricorda per le prossime scalette.
          </p>
        )}
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>Annulla</button>
          <button className="btn" disabled={!included.length} onClick={() => onConfirm(included, 'append')}>Aggiungi in coda</button>
          <button className="btn primary" disabled={!included.length} onClick={() => onConfirm(included, 'replace')}>
            Sostituisci setlist ({included.length})
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [{ songs, selectedId }, setState] = useState(loadSaved)
  const [free, setFree] = useState({ bpm: DEFAULT_BPM, timeSignature: '4/4' })
  const [soundOn, setSoundOn] = useState(false)
  const [review, setReview] = useState(null)
  const [message, setMessage] = useState(null)
  const [memory, setMemory] = useState(loadMemory)
  const taps = useRef([])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ songs, selectedId }))
  }, [songs, selectedId])

  useEffect(() => {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory))
  }, [memory])

  const setSongs = (fn) => setState((s) => ({ ...s, songs: fn(s.songs) }))
  const select = (id) => setState((s) => ({ ...s, selectedId: id }))
  const updateSong = (id, patch) => {
    setSongs((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    // Only tempo edits are remembered: remembering on title edits would store
    // every half-typed title as its own song.
    if ('bpm' in patch || 'timeSignature' in patch) {
      const song = songs.find((s) => s.id === id)
      if (song) setMemory((m) => remember(m, { ...song, ...patch }))
    }
  }

  const index = songs.findIndex((s) => s.id === selectedId)
  const current = index >= 0 ? songs[index] : free
  const updateCurrent = (patch) => (index >= 0 ? updateSong(current.id, patch) : setFree((f) => ({ ...f, ...patch })))

  const beatsPerBar = parseInt(current.timeSignature, 10) || 4
  const { playing, beat, start, stop, restart } = useMetronome({ bpm: current.bpm, beatsPerBar, soundOn })

  const goTo = (i) => {
    if (i < 0 || i >= songs.length) return
    select(songs[i].id)
    if (playing) restart()
  }

  const tapTempo = () => {
    const now = performance.now()
    const t = taps.current
    if (t.length && now - t[t.length - 1] > 2000) t.length = 0
    t.push(now)
    if (t.length > 6) t.shift()
    if (t.length >= 2) updateCurrent({ bpm: clampBpm(60000 / ((t[t.length - 1] - t[0]) / (t.length - 1))) })
  }

  const flash = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const onPdf = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      // pdf.js is heavy: load it only when a PDF is actually uploaded.
      const { extractPdfLines } = await import('./pdfText.js')
      const parsed = parseSetlistLines(await extractPdfLines(file))
      if (!parsed.length) {
        flash('error', 'Nessun testo trovato nel PDF (è una scansione? serve un PDF con testo selezionabile).')
        return
      }
      setReview({ fileName: file.name, rows: buildReviewRows(parsed, memory) })
    } catch {
      flash('error', 'Impossibile leggere il PDF.')
    }
  }

  const confirmImport = (rows, mode) => {
    const imported = rows.map(({ title, bpm, timeSignature }) => ({ id: newId(), title: title.trim() || 'Senza titolo', bpm, timeSignature }))
    // Placeholder tempos are not remembered, or they would later look like real ones.
    setMemory((m) => rows.filter((r) => r.source !== 'default').reduce(remember, m))
    setState((s) => {
      const list = mode === 'replace' ? imported : [...s.songs, ...imported]
      return { songs: list, selectedId: mode === 'replace' ? imported[0].id : s.selectedId ?? imported[0].id }
    })
    setReview(null)
    flash('ok', `${imported.length} brani importati.`)
  }

  const addSong = () => {
    const song = { id: newId(), title: 'Nuovo brano', bpm: current.bpm, timeSignature: current.timeSignature }
    setState((s) => ({ songs: [...s.songs, song], selectedId: song.id }))
  }

  const removeSong = (id) =>
    setState((s) => ({ songs: s.songs.filter((x) => x.id !== id), selectedId: s.selectedId === id ? null : s.selectedId }))

  const move = (i, delta) =>
    setSongs((list) => {
      const j = i + delta
      if (j < 0 || j >= list.length) return list
      const copy = [...list]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })

  const next = songs[index + 1]

  return (
    <div className="app">
      <header className="header">
        <img src={`${import.meta.env.BASE_URL}kp-logo.jpeg`} alt="Kassapanka" className="logo" />
        <h1>Kassapanka <span>Beat</span></h1>
        {message && <span className={`toast ${message.type}`}>{message.text}</span>}
      </header>

      <section className="panel stage">
        <div className="song-line">
          <span className="song-pos">{index >= 0 ? `${index + 1}/${songs.length}` : 'Libero'}</span>
          <h2 className="song-title">{index >= 0 ? current.title : 'Nessun brano selezionato'}</h2>
        </div>

        <div className="beats" onClick={playing ? stop : start}>
          {Array.from({ length: beatsPerBar }, (_, i) => (
            <div key={i} className={`beat ${i === 0 ? 'accent' : ''} ${i === beat ? 'lit' : ''}`}>
              {i + 1}
            </div>
          ))}
        </div>

        <div className="tempo-row">
          <button className="btn round" onClick={() => updateCurrent({ bpm: clampBpm(current.bpm - 1) })}>−</button>
          <div className="bpm-big">
            <BpmInput className="bpm-big-input" value={current.bpm} onCommit={(bpm) => updateCurrent({ bpm })} />
            <span>BPM</span>
          </div>
          <button className="btn round" onClick={() => updateCurrent({ bpm: clampBpm(current.bpm + 1) })}>+</button>
        </div>
        <input
          type="range"
          className="range"
          min="30"
          max="300"
          value={current.bpm}
          onChange={(e) => updateCurrent({ bpm: Number(e.target.value) })}
        />

        <div className="controls">
          <SignatureSelect className="field" value={current.timeSignature} onChange={(timeSignature) => updateCurrent({ timeSignature })} />
          <button className="btn" onClick={tapTempo}>Tap tempo</button>
          <button className={`btn ${soundOn ? 'active' : ''}`} onClick={() => setSoundOn((v) => !v)}>
            {soundOn ? '🔊 Click on' : '🔇 Click off'}
          </button>
        </div>

        <div className="transport">
          <button className="btn big" disabled={index <= 0} onClick={() => goTo(index - 1)}>◀</button>
          <button className={`btn big play ${playing ? 'stop' : ''}`} onClick={playing ? stop : start}>
            {playing ? '■ Stop' : '▶ Start'}
          </button>
          <button className="btn big" disabled={index < 0 || index >= songs.length - 1} onClick={() => goTo(index + 1)}>▶</button>
        </div>
        {next && <p className="next">Prossimo: <b>{next.title}</b> · {next.bpm} BPM</p>}
      </section>

      <section className="panel">
        <div className="setlist-head">
          <h3>Setlist</h3>
          <div className="setlist-actions">
            <label className="btn primary">
              Carica PDF
              <input type="file" accept="application/pdf,.pdf" hidden onChange={onPdf} />
            </label>
            <button className="btn" onClick={addSong}>+ Brano</button>
          </div>
        </div>

        {songs.length === 0 && (
          <p className="muted">Nessun brano. Carica il PDF della scaletta (una riga per canzone, con i BPM) oppure aggiungili a mano.</p>
        )}

        <ol className="setlist">
          {songs.map((song, i) => (
            <li key={song.id} className={song.id === selectedId ? 'selected' : ''} onClick={() => goTo(i)}>
              <span className="num">{i + 1}</span>
              <input
                className="field grow title-input"
                value={song.title}
                onChange={(e) => updateSong(song.id, { title: e.target.value })}
                onClick={(e) => e.stopPropagation()}
              />
              <BpmInput className="field bpm-field" value={song.bpm} onCommit={(bpm) => updateSong(song.id, { bpm })} />
              <span onClick={(e) => e.stopPropagation()}>
                <SignatureSelect className="field" value={song.timeSignature} onChange={(timeSignature) => updateSong(song.id, { timeSignature })} />
              </span>
              <span className="row-actions" onClick={(e) => e.stopPropagation()}>
                <button className="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Sposta su">↑</button>
                <button className="icon" disabled={i === songs.length - 1} onClick={() => move(i, 1)} aria-label="Sposta giù">↓</button>
                <button className="icon danger" onClick={() => removeSong(song.id)} aria-label="Elimina">✕</button>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {review && (
        <ImportReview
          fileName={review.fileName}
          rows={review.rows}
          setRows={(fn) => setReview((r) => ({ ...r, rows: fn(r.rows) }))}
          onConfirm={confirmImport}
          onCancel={() => setReview(null)}
        />
      )}
    </div>
  )
}
