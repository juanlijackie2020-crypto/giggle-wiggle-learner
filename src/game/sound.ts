// Original local UI tones. No network, microphone or paid speech service.
let context: AudioContext | undefined;
let audioMuted = false,
  generation = 0;
const active = new Set<OscillatorNode>();
export function setAudioMuted(muted: boolean) {
  audioMuted = muted;
  if (!muted) return;
  generation++;
  for (const oscillator of active) {
    try {
      oscillator.stop();
    } catch {
      /* Already ended. */
    }
    oscillator.disconnect();
  }
  active.clear();
}
export function playTone(
  kind: "collect" | "animal" | "reward" | "correct",
  muted: boolean,
) {
  if (muted || audioMuted) return;
  try {
    context ??= new AudioContext();
    const ctx = context,
      request = generation;
    void ctx
      .resume()
      .then(() => {
        if (ctx.state !== "running" || audioMuted || request !== generation)
          return;
        const notes =
          kind === "reward"
            ? [523, 659, 784]
            : kind === "animal"
              ? [660, 880]
              : kind === "correct"
                ? [523, 784]
                : [784, 1046];
        notes.forEach((hz, i) => {
          const oscillator = ctx.createOscillator(),
            gain = ctx.createGain(),
            time = ctx.currentTime + i * 0.11;
          oscillator.type = "sine";
          oscillator.frequency.value = hz;
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.065, time + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
          oscillator.connect(gain);
          gain.connect(ctx.destination);
          active.add(oscillator);
          oscillator.start(time);
          oscillator.stop(time + 0.16);
          oscillator.onended = () => {
            active.delete(oscillator);
            oscillator.disconnect();
            gain.disconnect();
          };
        });
      })
      .catch(() => {});
  } catch {
    /* Audio availability must never block play. */
  }
}
