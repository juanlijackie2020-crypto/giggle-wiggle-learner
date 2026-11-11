let audio: HTMLAudioElement | undefined;
let request = 0;
let timeout: ReturnType<typeof setTimeout> | undefined;
export function stopVoice() {
  request++;
  clearTimeout(timeout);
  if (audio) {
    audio.pause();
    audio.onended = null;
    audio.onerror = null;
    audio.onplaying = null;
    audio.removeAttribute("src");
    audio.load();
  }
}
export function playVoice(
  path: string,
  volume: number,
  onEnd: () => void,
  onError: () => void,
) {
  stopVoice();
  const token = request;
  audio ??= new Audio();
  const player = audio;
  player.volume = Math.max(0, Math.min(1, volume));
  player.preload = "auto";
  let failed = false;
  const fail = () => {
    if (request === token && !failed) {
      failed = true;
      clearTimeout(timeout);
      player.pause();
      console.warn("[Forest audio] Playback unavailable:", path);
      onError();
    }
  };
  player.onended = () => {
    clearTimeout(timeout);
    if (request === token && !failed) onEnd();
  };
  player.onerror = fail;
  player.onplaying = () => {
    if (request === token) clearTimeout(timeout);
  };
  player.src = new URL(import.meta.env.BASE_URL + path, document.baseURI).href;
  timeout = setTimeout(fail, 10000);
  void player.play().catch(fail);
}
export function voiceVolume(volume: number) {
  if (audio) audio.volume = volume;
}
