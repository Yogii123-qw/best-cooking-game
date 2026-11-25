// Synthesised sound, WebAudio only: no audio files, nothing fetched. Every effect is
// a short oscillator or filtered-noise burst, built fresh on each call. The context is
// created on the first user gesture; before that every call is a silent no-op, so the
// screenshot scenes never need sound.

export function createAudio() {
  let context = null;
  let sizzleNodes = null;

  function ensure() {
    if (context) return context;
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      return null;
    }
    return context;
  }

  /** Call from a user gesture so the browser lets sound start. */
  function unlock() {
    const ctx = ensure();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  function tone(freq, seconds, type, gainValue, when = 0, slideTo = 0) {
    const ctx = ensure();
    if (!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainValue, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  function noise(seconds, gainValue, filterFreq, when = 0) {
    const ctx = ensure();
    if (!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + when;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(t0);
    source.stop(t0 + seconds);
  }

  return {
    unlock,
    /** A soft pickup blip when an ingredient lands on the tray. */
    pickup() {
      tone(520, 0.09, 'sine', 0.12);
      tone(780, 0.1, 'sine', 0.1, 0.05);
    },
    /** The knife: three quick thocks. */
    chop() {
      noise(0.05, 0.22, 1800);
      noise(0.05, 0.22, 1800, 0.16);
      noise(0.05, 0.22, 1800, 0.32);
    },
    /** A chopped item is ready. */
    chopped() {
      tone(660, 0.08, 'triangle', 0.12);
      tone(880, 0.12, 'triangle', 0.12, 0.07);
    },
    /** Food hits the wok. */
    sizzleStart() {
      noise(0.35, 0.16, 5200);
    },
    /** A looped wok hiss while something cooks; call sizzleStop when it leaves. */
    sizzleLoop(on) {
      const ctx = ensure();
      if (!ctx || ctx.state !== 'running') return;
      if (on && !sizzleNodes) {
        const length = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 4800;
        filter.Q.value = 0.6;
        const gain = ctx.createGain();
        gain.gain.value = 0.045;
        source.connect(filter).connect(gain).connect(ctx.destination);
        source.start();
        sizzleNodes = { source, gain };
      } else if (!on && sizzleNodes) {
        try {
          sizzleNodes.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
          sizzleNodes.source.stop(ctx.currentTime + 0.2);
        } catch {
          // Already stopped: nothing to silence.
        }
        sizzleNodes = null;
      }
    },
    sizzleStop() {
      this.sizzleLoop(false);
    },
    /** The wok is done: a bright ding. */
    ding() {
      tone(1046, 0.35, 'sine', 0.14);
      tone(1568, 0.4, 'sine', 0.09, 0.02);
    },
    /** Coins: a little arpeggio on a served dish. */
    serve() {
      tone(880, 0.1, 'triangle', 0.14);
      tone(1108, 0.1, 'triangle', 0.14, 0.08);
      tone(1318, 0.18, 'triangle', 0.14, 0.16);
    },
    /** A ticket expired or a wrong dish: a low buzz. */
    error() {
      tone(180, 0.28, 'sawtooth', 0.1, 0, 120);
    },
    /** A ticket is about to expire. */
    alarm() {
      tone(980, 0.12, 'square', 0.06);
      tone(980, 0.12, 'square', 0.06, 0.18);
    },
    /** The rush hour starts. */
    rush() {
      tone(392, 0.12, 'triangle', 0.14);
      tone(523, 0.12, 'triangle', 0.14, 0.1);
      tone(659, 0.2, 'triangle', 0.14, 0.2);
    },
  };
}
