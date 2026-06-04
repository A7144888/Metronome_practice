import { useEffect, useRef, useCallback } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'
import { audioEngine } from '../engine/audioEngine'
import { isMeasureFull } from '../engine/musicTheory'

/**
 * Transport state machine (skill: transport-state-machine)
 *
 *  idle ──play──► playing ──pause──► paused
 *   ▲                │                  │
 *   └────stop────────┘◄─────play────────┘
 *
 * State is encoded in two store booleans:
 *   isPlaying=true,  isPaused=false  →  playing
 *   isPlaying=false, isPaused=true   →  paused
 *   isPlaying=false, isPaused=false  →  idle
 */
export function useMetronome() {
  const {
    bpm,
    timeSignature,
    measures,
    isPlaying,
    isPaused,
    soundSet,
    masterVolume,
    accentVolumes,
    setIsPlaying,
    setIsPaused,
    setCurrentBeat,
    setCurrentSubdivision,
    setCurrentMeasure,
    incrementMeasureCount,
    setElapsedTime,
    resetPlayback,
  } = useMetronomeStore()

  const prevMeasureRef    = useRef(-1)
  const timerRef          = useRef(null)
  const startTimeRef      = useRef(null)   // wall-clock anchor for elapsed display
  const pausedElapsedRef  = useRef(0)      // seconds elapsed at last pause

  const handleBeat = useCallback(
    (beatIdx, subdivIdx, measureIdx) => {
      setCurrentBeat(beatIdx)
      setCurrentSubdivision(subdivIdx)
      setCurrentMeasure(measureIdx % measures.length)
      if (measureIdx !== prevMeasureRef.current) {
        prevMeasureRef.current = measureIdx
        if (measureIdx > 0) incrementMeasureCount()
      }
    },
    [measures.length, setCurrentBeat, setCurrentSubdivision, setCurrentMeasure, incrementMeasureCount]
  )

  // ── play ──────────────────────────────────────────────────────────────────

  const play = useCallback(() => {
    if (isPlaying) return  // guard: already playing

    if (isPaused) {
      // Resume from saved position (paused → playing)
      audioEngine.resume()
      setIsPlaying(true)
      setIsPaused(false)
      // Re-anchor elapsed timer from saved elapsed time
      startTimeRef.current = Date.now() - pausedElapsedRef.current * 1000
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
      return
    }

    const allFull = measures.every((m) =>
      isMeasureFull(m, timeSignature.beats, timeSignature.noteValue)
    )
    if (!allFull) return

    resetPlayback()
    prevMeasureRef.current   = -1
    pausedElapsedRef.current = 0
    startTimeRef.current     = Date.now()

    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    audioEngine.start(measures, timeSignature, bpm, {
      masterVolume,
      accentVolumes,
      soundSet,
      onBeat: handleBeat,
    })
    setIsPlaying(true)
  }, [
    isPlaying,
    isPaused,
    measures,
    timeSignature,
    bpm,
    masterVolume,
    accentVolumes,
    soundSet,
    handleBeat,
    resetPlayback,
    setIsPlaying,
    setIsPaused,
    setElapsedTime,
  ])

  // ── pause ─────────────────────────────────────────────────────────────────

  const pause = useCallback(() => {
    if (!isPlaying) return  // guard: can only pause when playing

    // Save elapsed time before clearing the interval
    if (startTimeRef.current) {
      pausedElapsedRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000)
    }

    audioEngine.pause()
    setIsPlaying(false)
    setIsPaused(true)
    clearInterval(timerRef.current)
  }, [isPlaying, setIsPlaying, setIsPaused])

  // ── stop ──────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    audioEngine.stop()
    setIsPlaying(false)
    setIsPaused(false)
    resetPlayback()
    clearInterval(timerRef.current)
    pausedElapsedRef.current = 0
    startTimeRef.current     = null
  }, [setIsPlaying, setIsPaused, resetPlayback])

  // ── Live parameter updates ─────────────────────────────────────────────────

  // BPM change while playing: update engine without stopping
  useEffect(() => {
    if (isPlaying) audioEngine.updateBpm(bpm)
  }, [bpm, isPlaying])

  useEffect(() => { audioEngine.updateMasterVolume(masterVolume) }, [masterVolume])
  useEffect(() => { audioEngine.updateAccentVolumes(accentVolumes) }, [accentVolumes])
  useEffect(() => { audioEngine.updateSoundSet(soundSet) }, [soundSet])

  useEffect(() => {
    if (!isPlaying) return
    const allFull = measures.every((m) =>
      isMeasureFull(m, timeSignature.beats, timeSignature.noteValue)
    )
    if (!allFull) {
      stop()
      return
    }
    audioEngine.updateSchedule(measures, timeSignature)
  }, [measures, timeSignature, isPlaying, stop])

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  /**
   * When this hook unmounts (e.g. navigating between Presets/Editor/Performance),
   * fully stop the engine AND reset the store's transport flags. Without this
   * reset the store keeps `isPlaying=true` while the singleton engine has been
   * stopped — next click on "play" hits the `if (isPlaying) return` guard and
   * nothing happens (this is the "first play after navigation makes no sound"
   * bug). Forcing the store back to idle guarantees the next click takes the
   * `start()` branch and schedules fresh clicks.
   */
  useEffect(() => {
    return () => {
      audioEngine.stop()
      if (timerRef.current) clearInterval(timerRef.current)
      useMetronomeStore.setState({
        isPlaying:          false,
        isPaused:           false,
        currentBeat:        -1,
        currentSubdivision: -1,
        currentMeasure:     0,
      })
    }
  }, [])

  return { play, pause, stop }
}
