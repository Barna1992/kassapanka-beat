import { useCallback, useEffect, useRef, useState } from 'react'

// Same scheduling approach as Ironbeat: clicks are queued on the AudioContext
// clock slightly ahead of time, and the visuals follow that clock. The audio
// clock is used even with sound off, so the flashes stay steady.
const LOOKAHEAD_S = 0.1
const TICK_MS = 25

export function useMetronome({ bpm, beatsPerBar, soundOn }) {
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState(-1)

  const ctxRef = useRef(null)
  const gainRef = useRef(null)
  const nextTimeRef = useRef(0)
  const nextBeatRef = useRef(0)
  const queueRef = useRef([])
  const settings = useRef({ bpm, beatsPerBar, soundOn })
  settings.current = { bpm, beatsPerBar, soundOn }

  const ensureContext = () => {
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const gain = ctx.createGain()
      gain.connect(ctx.destination)
      ctxRef.current = ctx
      gainRef.current = gain
    }
    return ctxRef.current
  }

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = soundOn ? 0.9 : 0
  }, [soundOn])

  const scheduleClick = (beatIdx, time) => {
    const ctx = ctxRef.current
    const accent = beatIdx === 0
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = accent ? 1760 : 1320
    env.gain.setValueAtTime(0, time)
    env.gain.linearRampToValueAtTime(1, time + 0.001)
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
    osc.connect(env).connect(gainRef.current)
    osc.start(time)
    osc.stop(time + 0.07)
    queueRef.current.push({ time, beatIdx })
  }

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      const ctx = ctxRef.current
      while (nextTimeRef.current < ctx.currentTime + LOOKAHEAD_S) {
        const { bpm: b, beatsPerBar: n } = settings.current
        const beatIdx = nextBeatRef.current % n
        scheduleClick(beatIdx, nextTimeRef.current)
        nextTimeRef.current += 60 / b
        nextBeatRef.current = beatIdx + 1
      }
    }, TICK_MS)
    return () => clearInterval(id)
  }, [playing])

  useEffect(() => {
    if (!playing) return
    let raf
    const loop = () => {
      const ctx = ctxRef.current
      const q = queueRef.current
      while (q.length && q[0].time <= ctx.currentTime) setBeat(q.shift().beatIdx)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  // Keep the screen on while playing: the phone sits on the drum riser.
  useEffect(() => {
    if (!playing || !('wakeLock' in navigator)) return
    let lock
    const acquire = () => navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {})
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [playing])

  const start = useCallback(() => {
    const ctx = ensureContext()
    if (ctx.state === 'suspended') ctx.resume()
    gainRef.current.gain.value = settings.current.soundOn ? 0.9 : 0
    nextBeatRef.current = 0
    nextTimeRef.current = ctx.currentTime + 0.05
    queueRef.current = []
    setPlaying(true)
  }, [])

  const stop = useCallback(() => {
    setPlaying(false)
    queueRef.current = []
    setBeat(-1)
  }, [])

  // Restart from beat 1 (used when switching song while playing).
  const restart = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    nextBeatRef.current = 0
    nextTimeRef.current = ctx.currentTime + 0.05
    queueRef.current = []
  }, [])

  return { playing, beat, start, stop, restart }
}
