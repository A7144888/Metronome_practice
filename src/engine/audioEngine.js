/**
 * High-precision Web Audio API metronome engine.
 *
 * Uses lookahead scheduling — setTimeout for the loop, never setInterval.
 * All note durations are integer ticks converted to seconds via secondsPerTick.
 *
 * Transport states: idle → playing → paused → playing (resume) → idle (stop)
 */

import {
  TICKS_PER_QUARTER,
  beatCapacityTicks,
  buildPlaybackEntries,
} from './musicTheory'

const LOOKAHEAD_MS          = 25      // scheduler fires every 25 ms
const SCHEDULE_AHEAD_SECS   = 0.1    // schedule up to 100 ms ahead

/** Scales UI master (0–1) to output; clicks are short and need headroom boost. */
const MASTER_OUTPUT_BOOST = 2.5

// Per-click peak gain (master is applied only on masterGain, not here)
const DEFAULT_ACCENT_GAIN = {
  strong: 1.0,
  medium: 0.85,
  normal: 0.7,
}

class AudioEngine {
  constructor() {
    this.audioCtx        = null
    this.masterGain      = null
    this.nextNoteTime    = 0
    this.schedulerRunning = false
    this.onBeatCallback  = null
    this.flatSchedule    = []
    this.scheduleIndex   = 0
    this.pausedAtIndex   = null    // non-null when paused
    this.bpm             = 120
    this.masterVolume    = 1.0
    this.accentVolumes   = { ...DEFAULT_ACCENT_GAIN }
    this.soundSet        = 'woodblock'
  }

  // ── Context lifecycle ──────────────────────────────────────────────────────

  init() {
    if (this.audioCtx) return
    this.audioCtx  = new (window.AudioContext || window.webkitAudioContext)()
    this.masterGain = this.audioCtx.createGain()
    this._applyMasterGain(this.masterVolume)
    this.masterGain.connect(this.audioCtx.destination)
  }

  _applyMasterGain(vol) {
    if (!this.masterGain || !this.audioCtx) return
    const out = Math.min(4, Math.max(0, vol * MASTER_OUTPUT_BOOST))
    this.masterGain.gain.setTargetAtTime(out, this.audioCtx.currentTime, 0.01)
  }

  /**
   * Resume the AudioContext if suspended, and wait for it to reach the
   * 'running' state. Browsers start new AudioContexts in 'suspended' mode
   * until a user gesture unblocks them; resume() returns a Promise and
   * scheduling clicks before it settles silently drops the first clicks.
   */
  async _ensureResumed() {
    if (!this.audioCtx) return
    if (this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume() } catch { /* ignore */ }
    }
  }

  // ── Timing math ────────────────────────────────────────────────────────────

  /** Seconds per MIDI tick at current BPM. */
  _secondsPerTick() {
    return 60 / (this.bpm * TICKS_PER_QUARTER)
  }

  // ── Accent engine (skill: audio-accent-engine) ─────────────────────────────

  /**
   * Apply accent gain to a GainNode using a short linear ramp (avoids clicks).
   * Must be called before the sound source starts.
   *
   * @param {GainNode} gainNode
   * @param {'strong'|'medium'|'normal'} accent
   * @param {number} atTime  - AudioContext scheduled time in seconds
   */
  _applyAccent(gainNode, accent, atTime) {
    const baseGain = this.accentVolumes[accent] ?? this.accentVolumes.normal
    // Accent only here — masterVolume is on masterGain (avoids double attenuation)
    const vol     = Math.min(1.5, baseGain)
    const RAMP_IN  = 0.003
    const RAMP_OUT = 0.12

    gainNode.gain.setValueAtTime(0.01, atTime)
    gainNode.gain.linearRampToValueAtTime(vol, atTime + RAMP_IN)
    gainNode.gain.exponentialRampToValueAtTime(0.01, atTime + RAMP_OUT)
  }

  // ── Sound synthesis ────────────────────────────────────────────────────────

  _playClick(time, accent) {
    if (!this.audioCtx) return
    const gain = this.audioCtx.createGain()
    gain.connect(this.masterGain)
    this._applyAccent(gain, accent, time)

    switch (this.soundSet) {
      case 'beep':       this._playBeep(time, accent, gain);       break
      case 'electronic': this._playElectronic(time, accent, gain); break
      case 'rimshot':    this._playRimshot(time, accent, gain);    break
      default:           this._playWoodblock(time, accent, gain);  break
    }
  }

  _playWoodblock(time, accent, gainNode) {
    const freq    = accent === 'strong' ? 1800 : accent === 'medium' ? 1200 : 900
    const endFreq = accent === 'strong' ? 900  : 600
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
    const sr     = this.audioCtx.sampleRate
    const bufLen = Math.floor(sr * 0.06)
    const buf    = this.audioCtx.createBuffer(1, bufLen, sr)
    const data   = buf.getChannelData(0)
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

  // ── Scheduler loop ─────────────────────────────────────────────────────────

  /**
   * Build the flat playback schedule from measure data.
   * Subdivisions are stored flat at the measure level; beat indices are
   * computed from tick positions so that cross-beat notes work correctly.
   */
  /**
   * Build the flat playback schedule from measure data.
   * Subdivisions are stored flat at the measure level; beat indices are
   * computed from tick positions so that cross-beat notes work correctly.
   *
   * When a note's duration spans one or more beat boundaries, it is split
   * into chunks at each boundary. Only the first chunk produces sound;
   * subsequent chunks are silent "ghost" entries whose sole purpose is to
   * fire onBeatCallback so that the beat indicator flashes on every
   * integer beat — even when no new note attack occurs on that beat.
   */
  buildFlatSchedule(measures, timeSignature) {
    const { noteValue, beats } = timeSignature
    const beatCapTicks = beatCapacityTicks(noteValue)
    this.flatSchedule  = []

    measures.forEach((measure, mIdx) => {
      const subs = measure.subdivisions ?? []
      if (subs.length === 0) {
        for (let b = 0; b < beats; b++) {
          this.flatSchedule.push({
            measureIdx:    mIdx,
            beatIdx:       b,
            subdivIdx:     0,
            accent:        b === 0 ? 'strong' : 'normal',
            durationTicks: beatCapTicks,
            silent:        false,
          })
        }
        return
      }

      const entries = buildPlaybackEntries(subs, noteValue)
      let tickPos = 0
      entries.forEach((entry, sIdx) => {
        const dur       = entry.durationTicks
        const startBeat = Math.floor(tickPos / beatCapTicks)
        const lastBeat  = dur > 0
          ? Math.floor((tickPos + dur - 1) / beatCapTicks)
          : startBeat

        if (lastBeat <= startBeat) {
          this.flatSchedule.push({
            measureIdx:    mIdx,
            beatIdx:       startBeat,
            subdivIdx:     sIdx,
            accent:        entry.accent || 'normal',
            durationTicks: dur,
            silent:        entry.silent || entry.accent === 'none',
          })
        } else {
          let remaining = dur
          let curTick   = tickPos
          let isFirst   = true

          while (remaining > 0) {
            const curBeat      = Math.floor(curTick / beatCapTicks)
            const nextBeatTick = (curBeat + 1) * beatCapTicks
            const chunkDur     = Math.min(nextBeatTick - curTick, remaining)

            this.flatSchedule.push({
              measureIdx:    mIdx,
              beatIdx:       curBeat,
              subdivIdx:     sIdx,
              accent:        isFirst ? (entry.accent || 'normal') : 'none',
              durationTicks: chunkDur,
              silent:        isFirst ? (entry.silent || entry.accent === 'none') : true,
            })

            remaining -= chunkDur
            curTick   += chunkDur
            isFirst    = false
          }
        }

        tickPos += dur
      })
    })
  }

  _schedule() {
    if (!this.schedulerRunning || this.flatSchedule.length === 0) return

    const spt = this._secondsPerTick()

    while (this.nextNoteTime < this.audioCtx.currentTime + SCHEDULE_AHEAD_SECS) {
      const entry = this.flatSchedule[this.scheduleIndex % this.flatSchedule.length]

      if (!entry.silent) {
        this._playClick(this.nextNoteTime, entry.accent)
      }

      if (this.onBeatCallback) {
        const delay = (this.nextNoteTime - this.audioCtx.currentTime) * 1000
        const { beatIdx, subdivIdx } = entry
        const loopMeasureIdx = Math.floor(this.scheduleIndex / this.flatSchedule.length)
        setTimeout(() => {
          this.onBeatCallback(beatIdx, subdivIdx, loopMeasureIdx)
        }, Math.max(0, delay))
      }

      this.nextNoteTime += entry.durationTicks * spt
      this.scheduleIndex++
    }

    setTimeout(() => this._schedule(), LOOKAHEAD_MS)
  }

  // ── Transport ──────────────────────────────────────────────────────────────

  /**
   * Start playback from the beginning (idle → playing).
   * Always call stop() or this resets position to zero.
   */
  async start(measures, timeSignature, bpm, options = {}) {
    this.init()
    this.bpm           = bpm
    this.masterVolume  = options.masterVolume  ?? this.masterVolume
    this.accentVolumes = options.accentVolumes ?? this.accentVolumes
    this.soundSet      = options.soundSet      ?? this.soundSet
    this.onBeatCallback = options.onBeat       ?? null

    // Must await resume before anchoring nextNoteTime — otherwise the first
    // clicks may be scheduled for a currentTime that's still frozen at 0.
    await this._ensureResumed()
    this._applyMasterGain(this.masterVolume)

    this.buildFlatSchedule(measures, timeSignature)
    this.scheduleIndex    = 0
    this.pausedAtIndex    = null
    this.schedulerRunning = true
    this.nextNoteTime     = this.audioCtx.currentTime + 0.05
    this._schedule()
  }

  /**
   * Pause playback (playing → paused). Saves schedule position.
   * Already-buffered clicks (up to 100 ms) will still sound — this is expected.
   */
  pause() {
    if (!this.schedulerRunning) return
    this.schedulerRunning = false
    this.pausedAtIndex    = this.scheduleIndex
  }

  /**
   * Resume from the saved pause position (paused → playing).
   * Re-anchors audio time so the next click fires ~50 ms from now.
   */
  async resume() {
    if (this.pausedAtIndex === null) return
    await this._ensureResumed()
    this.scheduleIndex    = this.pausedAtIndex
    this.pausedAtIndex    = null
    this.schedulerRunning = true
    this.nextNoteTime     = this.audioCtx.currentTime + 0.05
    this._schedule()
  }

  /**
   * Stop playback and reset to tick 0 (any state → idle).
   */
  stop() {
    this.schedulerRunning = false
    this.scheduleIndex    = 0
    this.pausedAtIndex    = null
    this.nextNoteTime     = 0
  }

  // ── Live parameter updates ─────────────────────────────────────────────────

  updateBpm(bpm) {
    this.bpm = bpm
  }

  updateMasterVolume(vol) {
    this.masterVolume = vol
    this._applyMasterGain(vol)
  }

  updateAccentVolumes(av) {
    this.accentVolumes = av
  }

  updateSoundSet(ss) {
    this.soundSet = ss
  }

  updateSchedule(measures, timeSignature) {
    if (!this.schedulerRunning) return
    const prevIndex = this.scheduleIndex % (this.flatSchedule.length || 1)
    this.buildFlatSchedule(measures, timeSignature)
    // Keep relative position within the (possibly resized) schedule
    if (this.flatSchedule.length > 0) {
      this.scheduleIndex = Math.min(prevIndex, this.flatSchedule.length - 1)
    }
  }
}

export const audioEngine = new AudioEngine()
