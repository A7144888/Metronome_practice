/**
 * High-precision Web Audio API metronome engine
 * Uses lookahead scheduling — never setInterval for timing.
 *
 * Supports: dotted notes, ties, thirty-second notes, triplets
 */

import { subdivDurationQNB, beatCapacityQNB, buildPlaybackEntries } from './musicTheory'

const LOOKAHEAD_MS = 25.0
const SCHEDULE_AHEAD_TIME = 0.1

class AudioEngine {
  constructor() {
    this.audioCtx = null
    this.masterGain = null
    this.nextNoteTime = 0
    this.schedulerRunning = false
    this.onBeatCallback = null
    this.flatSchedule = []
    this.scheduleIndex = 0
    this.startTime = 0
    this.bpm = 120
    this.masterVolume = 0.8
    this.accentVolumes = { strong: 1.0, medium: 0.7, normal: 0.45 }
    this.soundSet = 'woodblock'
  }

  init() {
    if (this.audioCtx) return
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    this.masterGain = this.audioCtx.createGain()
    this.masterGain.gain.value = this.masterVolume
    this.masterGain.connect(this.audioCtx.destination)
  }

  resume() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }
  }

  /**
   * Build the flat playback schedule from the measure data.
   *
   * Each entry records:
   *   measureIdx, beatIdx, subdivIdx,
   *   accent, durationSecs, silent (tied)
   */
  buildFlatSchedule(measures, timeSignature) {
    const { noteValue } = timeSignature
    const beatCapQNB = beatCapacityQNB(noteValue)
    this.flatSchedule = []

    measures.forEach((measure, mIdx) => {
      measure.beats.forEach((beat, bIdx) => {
        if (!beat.subdivisions || beat.subdivisions.length === 0) {
          // Fallback: single click per beat
          this.flatSchedule.push({
            measureIdx: mIdx,
            beatIdx: bIdx,
            subdivIdx: 0,
            accent: bIdx === 0 ? 'strong' : 'normal',
            durationQNB: beatCapQNB,
            silent: false,
          })
          return
        }

        // Build playback entries — handles tie silence logic
        const entries = buildPlaybackEntries(beat.subdivisions)

        entries.forEach((entry, sIdx) => {
          this.flatSchedule.push({
            measureIdx: mIdx,
            beatIdx: bIdx,
            subdivIdx: sIdx,
            accent: entry.accent || 'normal',
            durationQNB: entry.durationQNB,
            silent: entry.silent || entry.accent === 'none',
          })
        })
      })
    })
  }

  _secondsPerQNB() {
    // At BPM=120, 1 QNB = 0.5s
    return 60.0 / this.bpm
  }

  _playClick(time, accent) {
    if (!this.audioCtx) return

    const gain = this.audioCtx.createGain()
    const vol = (this.accentVolumes[accent] ?? 0.5) * this.masterVolume
    gain.gain.setValueAtTime(vol, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1)
    gain.connect(this.masterGain)

    switch (this.soundSet) {
      case 'beep':       this._playBeep(time, accent, gain);       break
      case 'electronic': this._playElectronic(time, accent, gain); break
      case 'rimshot':    this._playRimshot(time, accent, gain);    break
      default:           this._playWoodblock(time, accent, gain);  break
    }
  }

  _playWoodblock(time, accent, gainNode) {
    const freq = accent === 'strong' ? 1800 : accent === 'medium' ? 1200 : 900
    const endFreq = accent === 'strong' ? 900 : 600
    const osc = this.audioCtx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, time)
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.06)
    osc.connect(gainNode)
    osc.start(time)
    osc.stop(time + 0.08)
  }

  _playElectronic(time, accent, gainNode) {
    const osc = this.audioCtx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(accent === 'strong' ? 1000 : 700, time)
    const filter = this.audioCtx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 4000
    osc.connect(filter)
    filter.connect(gainNode)
    osc.start(time)
    osc.stop(time + 0.05)
  }

  _playRimshot(time, accent, gainNode) {
    const sr = this.audioCtx.sampleRate
    const bufLen = Math.floor(sr * 0.06)
    const buf = this.audioCtx.createBuffer(1, bufLen, sr)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.25))
    }
    const src = this.audioCtx.createBufferSource()
    src.buffer = buf
    const filter = this.audioCtx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = accent === 'strong' ? 3000 : 2000
    filter.Q.value = 0.5
    src.connect(filter)
    filter.connect(gainNode)
    src.start(time)
  }

  _playBeep(time, accent, gainNode) {
    const osc = this.audioCtx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = accent === 'strong' ? 880 : 660
    osc.connect(gainNode)
    osc.start(time)
    osc.stop(time + 0.06)
  }

  _schedule() {
    if (!this.schedulerRunning || this.flatSchedule.length === 0) return

    const spqnb = this._secondsPerQNB()

    while (this.nextNoteTime < this.audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
      const entry = this.flatSchedule[this.scheduleIndex % this.flatSchedule.length]

      if (!entry.silent) {
        this._playClick(this.nextNoteTime, entry.accent)
      }

      if (this.onBeatCallback) {
        const delay = (this.nextNoteTime - this.audioCtx.currentTime) * 1000
        const { beatIdx, subdivIdx, measureIdx: rawMeasureIdx } = entry
        const loopMeasureIdx = Math.floor(this.scheduleIndex / this.flatSchedule.length)
        setTimeout(() => {
          this.onBeatCallback(beatIdx, subdivIdx, loopMeasureIdx)
        }, Math.max(0, delay))
      }

      this.nextNoteTime += entry.durationQNB * spqnb
      this.scheduleIndex++
    }

    setTimeout(() => this._schedule(), LOOKAHEAD_MS)
  }

  start(measures, timeSignature, bpm, options = {}) {
    this.init()
    this.resume()
    this.bpm = bpm
    this.masterVolume = options.masterVolume ?? this.masterVolume
    this.accentVolumes = options.accentVolumes ?? this.accentVolumes
    this.soundSet = options.soundSet ?? this.soundSet
    this.onBeatCallback = options.onBeat ?? null

    this.buildFlatSchedule(measures, timeSignature)
    this.scheduleIndex = 0
    this.schedulerRunning = true
    this.startTime = this.audioCtx.currentTime
    this.nextNoteTime = this.audioCtx.currentTime + 0.05
    this._schedule()
  }

  stop() {
    this.schedulerRunning = false
    this.scheduleIndex = 0
    this.nextNoteTime = 0
  }

  updateBpm(bpm) {
    this.bpm = bpm
  }

  updateMasterVolume(vol) {
    this.masterVolume = vol
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(vol, this.audioCtx.currentTime, 0.01)
    }
  }

  updateAccentVolumes(av) {
    this.accentVolumes = av
  }

  updateSoundSet(ss) {
    this.soundSet = ss
  }

  updateSchedule(measures, timeSignature) {
    if (!this.schedulerRunning) return
    this.buildFlatSchedule(measures, timeSignature)
  }
}

export const audioEngine = new AudioEngine()
