let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (noise) return noise;
  const len = Math.floor(ac.sampleRate * 0.08);
  noise = ac.createBuffer(1, len, ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  return noise;
}

/** One die striking porcelain: a short filtered click plus a faint ring. */
function hit(ac: AudioContext, at: number, gain: number) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  src.playbackRate.value = 0.8 + Math.random() * 0.5;
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2400 + Math.random() * 2600;
  band.Q.value = 4;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
  src.connect(band).connect(g).connect(ac.destination);
  src.start(at);

  const ring = ac.createOscillator();
  ring.type = "sine";
  ring.frequency.value = 3100 + Math.random() * 900;
  const rg = ac.createGain();
  rg.gain.setValueAtTime(gain * 0.12, at);
  rg.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
  ring.connect(rg).connect(ac.destination);
  ring.start(at);
  ring.stop(at + 0.26);
}

/** Dice clattering into a porcelain bowl, about 0.9 s long. */
export function playClatter(duration = 0.9) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + 0.02;
  const hits = 22;
  for (let i = 0; i < hits; i++) {
    // Front-load the hits so the sound thins out as the dice settle.
    const x = Math.pow(Math.random(), 1.6);
    hit(ac, t0 + x * duration, 0.35 * (1 - x * 0.7));
  }
}

/** Unlocks audio on iOS; call from a user gesture. */
export function primeAudio() {
  audio();
}
