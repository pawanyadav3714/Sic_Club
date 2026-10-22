// High-fidelity mechanical/scissor-switch typing audio synthesizer using Web Audio API
// Synthesizes the exact crisp tactile clicks of MacBook keyboard typing with zero network latency.

let audioContext: AudioContext | null = null;
let isAudioMuted = false;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
};

export const setMuted = (muted: boolean) => {
  isAudioMuted = muted;
};

export const getMuted = () => isAudioMuted;

export type KeySoundType = 'default' | 'space' | 'enter' | 'backspace';

/**
 * Plays the exact tactile mechanical scissor-switch typing sound
 * exactly matching the MacBook terminal typing sound from the reference video.
 */
export const playKeyClickSound = (type: KeySoundType = 'default') => {
  if (isAudioMuted) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Transient High-Frequency Click (Mechanical switch contact snap)
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 0.022)); // ~22ms burst
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Shaped noise with rapid decay
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004));
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';

    // Frequencies tailored to key size & type
    let centerFreq = 3400 + (Math.random() * 500 - 250);
    if (type === 'space') centerFreq = 2100 + (Math.random() * 200 - 100);
    if (type === 'enter') centerFreq = 2500 + (Math.random() * 200 - 100);
    if (type === 'backspace') centerFreq = 3800 + (Math.random() * 300 - 150);

    noiseFilter.frequency.setValueAtTime(centerFreq, now);
    noiseFilter.Q.setValueAtTime(3.2, now);

    const noiseGain = ctx.createGain();
    const noiseVol = type === 'enter' ? 0.32 : type === 'space' ? 0.28 : 0.25;
    noiseGain.gain.setValueAtTime(noiseVol, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + (type === 'enter' ? 0.024 : 0.018));

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(now);

    // 2. Body Resonance Thump / "Thock" (Keycap bottoming out on chassis)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    let oscFreq = 420 + (Math.random() * 40 - 20);
    if (type === 'space') oscFreq = 260 + (Math.random() * 30 - 15);
    if (type === 'enter') oscFreq = 320 + (Math.random() * 30 - 15);
    if (type === 'backspace') oscFreq = 480 + (Math.random() * 40 - 20);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(oscFreq, now);
    osc.frequency.exponentialRampToValueAtTime(oscFreq * 0.42, now + 0.038);

    const oscVol = type === 'enter' ? 0.38 : type === 'space' ? 0.32 : 0.28;
    oscGain.gain.setValueAtTime(oscVol, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + (type === 'enter' ? 0.048 : 0.032));

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.052);

    // 3. Chassis Micro-Snap (Subtle chiclet tactile rebound)
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'sine';
    const snapFreq = type === 'enter' ? 1400 : 1850 + (Math.random() * 200 - 100);
    snapOsc.frequency.setValueAtTime(snapFreq, now);

    snapGain.gain.setValueAtTime(0.12, now);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.016);
  } catch {
    // Graceful fallback if audio is blocked by browser policies
  }
};
