import { useEffect, useRef, useCallback } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'
import { audioEngine } from '../engine/audioEngine'

export function useMetronome() {
  const {
    bpm,
    timeSignature,
    measures,
    isPlaying,
    soundSet,
    masterVolume,
    accentVolumes,
    setIsPlaying,
    setCurrentBeat,
    setCurrentSubdivision,
    setCurrentMeasure,
    incrementMeasureCount,
    setElapsedTime,
    resetPlayback,
  } = useMetronomeStore()

  const prevMeasureRef = useRef(-1)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

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

  const play = useCallback(() => {
    resetPlayback()
    prevMeasureRef.current = -1
    startTimeRef.current = Date.now()

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
  }, [measures, timeSignature, bpm, masterVolume, accentVolumes, soundSet, handleBeat, resetPlayback, setIsPlaying, setElapsedTime])

  const stop = useCallback(() => {
    audioEngine.stop()
    setIsPlaying(false)
    resetPlayback()
    clearInterval(timerRef.current)
    startTimeRef.current = null
  }, [setIsPlaying, resetPlayback])

  const pause = useCallback(() => {
    audioEngine.stop()
    setIsPlaying(false)
    clearInterval(timerRef.current)
  }, [setIsPlaying])

  // Live BPM update without stopping
  useEffect(() => {
    if (isPlaying) {
      audioEngine.updateBpm(bpm)
    }
  }, [bpm, isPlaying])

  useEffect(() => {
    audioEngine.updateMasterVolume(masterVolume)
  }, [masterVolume])

  useEffect(() => {
    audioEngine.updateAccentVolumes(accentVolumes)
  }, [accentVolumes])

  useEffect(() => {
    audioEngine.updateSoundSet(soundSet)
  }, [soundSet])

  useEffect(() => {
    if (isPlaying) {
      audioEngine.updateSchedule(measures, timeSignature)
    }
  }, [measures, timeSignature, isPlaying])

  useEffect(() => {
    return () => {
      audioEngine.stop()
      clearInterval(timerRef.current)
    }
  }, [])

  return { play, stop, pause }
}
