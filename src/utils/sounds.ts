let audioCtx: AudioContext | null = null
let soundEnabled = true

function ctx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled
}

export function isSoundEnabled(): boolean {
  return soundEnabled
}

function playNoise(duration: number, frequency: number, Q: number) {
  if (!soundEnabled || prefersReduced()) return
  const c = ctx()
  const bufferSize = c.sampleRate * duration
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const source = c.createBufferSource()
  source.buffer = buffer

  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(frequency, c.currentTime)
  filter.Q.setValueAtTime(Q, c.currentTime)

  const gain = c.createGain()
  gain.gain.setValueAtTime(0.2, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(c.destination)

  source.start(c.currentTime)
  source.stop(c.currentTime + duration)
  source.onended = () => {
    source.disconnect()
    filter.disconnect()
    gain.disconnect()
  }
}

function playTone(frequency: number, duration: number, gainVal: number = 0.25, type: OscillatorType = 'sine') {
  if (!soundEnabled || prefersReduced()) return
  const c = ctx()
  const osc = c.createOscillator()
  const gain = c.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, c.currentTime)
  osc.connect(gain)
  gain.connect(c.destination)

  gain.gain.setValueAtTime(gainVal, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)

  osc.start(c.currentTime)
  osc.stop(c.currentTime + duration)
  osc.onended = () => {
    osc.disconnect()
    gain.disconnect()
  }
}

function playSweep(from: number, to: number, duration: number, gainVal: number = 0.25, type: OscillatorType = 'sine') {
  if (!soundEnabled || prefersReduced()) return
  const c = ctx()
  const osc = c.createOscillator()
  const gain = c.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(from, c.currentTime)
  osc.frequency.linearRampToValueAtTime(to, c.currentTime + duration)
  osc.connect(gain)
  gain.connect(c.destination)

  gain.gain.setValueAtTime(gainVal, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)

  osc.start(c.currentTime)
  osc.stop(c.currentTime + duration)
  osc.onended = () => {
    osc.disconnect()
    gain.disconnect()
  }
}

export function playLogSound() {
  playSweep(400, 700, 0.12, 0.25, 'sine')
}

export function playDeleteSound() {
  playNoise(0.08, 4000, 3)
}

export function playErrorSound() {
  playTone(180, 0.2, 0.2, 'sawtooth')
}
