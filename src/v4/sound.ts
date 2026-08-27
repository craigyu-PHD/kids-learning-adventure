export type V4SoundKind = 'click' | 'success' | 'error' | 'fanfare' | 'treasure';

let audioContext: AudioContext | null = null;

function context() {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  audioContext ??= new AudioCtor();
  return audioContext;
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), start + .012);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(start); osc.stop(start + duration + .02);
}

export function playV4Sound(kind: V4SoundKind) {
  if (typeof window !== 'undefined' && window.localStorage.getItem('little-explorers-v4-sound') === 'off') return;
  const ctx = context();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  const now = ctx.currentTime;
  if (kind === 'click') {
    tone(ctx, 520, now, .07, .025, 'sine');
    return;
  }
  if (kind === 'success') {
    tone(ctx, 660, now, .14, .04, 'sine');
    tone(ctx, 880, now + .08, .17, .035, 'sine');
    return;
  }
  if (kind === 'error') {
    tone(ctx, 260, now, .13, .025, 'triangle');
    tone(ctx, 220, now + .07, .15, .018, 'triangle');
    return;
  }
  if (kind === 'fanfare') {
    [523,659,784,1047].forEach((freq,index)=>tone(ctx,freq,now + index*.08,.22,.035,index===3?'triangle':'sine'));
    return;
  }
  [330,494,659,988].forEach((freq,index)=>tone(ctx,freq,now + index*.09,.25,.04,index%2?'triangle':'sine'));
}
