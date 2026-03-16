import { useRef, useCallback } from 'react'

const MAX_TAPS = 8
const TAP_TIMEOUT_MS = 2000

export function useTapTempo(onBpm) {
  const tapsRef = useRef([])
  const lastTapRef = useRef(0)

  const tap = useCallback(() => {
    const now = performance.now()
    const timeSinceLast = now - lastTapRef.current
    lastTapRef.current = now

    if (timeSinceLast > TAP_TIMEOUT_MS) {
      tapsRef.current = [now]
      return
    }

    tapsRef.current = [...tapsRef.current, now].slice(-MAX_TAPS)

    if (tapsRef.current.length < 2) return

    const intervals = []
    for (let i = 1; i < tapsRef.current.length; i++) {
      intervals.push(tapsRef.current[i] - tapsRef.current[i - 1])
    }
    const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length
    const bpm = Math.round(60000 / avgInterval)
    onBpm(Math.min(300, Math.max(20, bpm)))
  }, [onBpm])

  return tap
}
