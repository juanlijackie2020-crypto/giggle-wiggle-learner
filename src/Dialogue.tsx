import { useEffect, useRef, useState } from "react";
import lines from "./data/dialogue.json";
import { playVoice, stopVoice, voiceVolume } from "./game/dialogueAudio";
import type { Save } from "./game/state";
import { animals } from "./game/world";
export function Dialogue({
  animal,
  save,
  hidden,
  onResponse,
  onMute,
}: {
  animal: (typeof animals)[number];
  save: Save;
  hidden: boolean;
  onResponse: () => void;
  onMute: () => void;
}) {
  const [ids, setIds] = useState(["hero-hello", `animal-${animal.kind}-hello`]);
  const [index, setIndex] = useState(0),
    [failed, setFailed] = useState(false),
    [playing, setPlaying] = useState(false);
  const line = lines.find((l) => l.id === ids[index])!;
  const current = useRef(save);
  current.current = save;
  const playCurrent = () => {
    setFailed(false);
    setPlaying(false);
    if (save.muted || hidden) {
      stopVoice();
      return;
    }
    setPlaying(true);
    playVoice(
      line.path,
      current.current.voiceVolume,
      () => {
        setPlaying(false);
        if (index < ids.length - 1) setIndex((i) => i + 1);
      },
      () => {
        setPlaying(false);
        setFailed(true);
      },
    );
  };
  useEffect(() => {
    playCurrent();
    return stopVoice;
    // Volume changes must not replay or restart the line.
  }, [line.id, index, ids]);
  useEffect(() => {
    if (save.muted || hidden) {
      stopVoice();
      setPlaying(false);
    }
  }, [save.muted, hidden]);
  useEffect(() => voiceVolume(save.voiceVolume), [save.voiceVolume]);
  useEffect(() => {
    const blur = () => {
      stopVoice();
      setPlaying(false);
    };
    window.addEventListener("blur", blur);
    return () => window.removeEventListener("blur", blur);
  }, []);
  const respond = (choice: "hello" | "clue" | "thanks") => {
    stopVoice();
    onResponse();
    setIndex(0);
    setIds([
      `hero-${choice}`,
      `animal-${animal.kind}-${choice === "clue" ? "clue" : "hello"}`,
    ]);
  };
  return (
    <div className="dialogue-content">
      <span className="eyebrow">FOREST FRIENDS · 森林朋友</span>
      <h2>和{animal.name}聊聊天</h2>
      <div className="speaker-portraits">
        <span className={line.speaker === "主角" ? "speaking" : ""}>
          🧒<small>探险家</small>
        </span>
        <b>✦</b>
        <span className={line.speaker !== "主角" ? "speaking" : ""}>
          {["🐰", "🦌", "🐿️", "🦊", "🐦", "🦔"][animal.kind]}
          <small>{animal.name}</small>
        </span>
      </div>
      <div className="subtitle" aria-live="polite">
        <strong>{line.speaker}</strong>
        <p>{line.text}</p>
      </div>
      <p className="voice-status">
        {save.muted
          ? "已静音 · 仍可选择回应"
          : hidden
            ? "已暂停"
            : failed
              ? "声音没能播放，点此重试声音。"
              : playing
                ? "正在说话…"
                : "选择回应，继续聊天。"}
      </p>
      <div className="dialogue-actions">
        <button onClick={onMute}>
          {save.muted ? "开启对白声音" : "静音所有声音"}
        </button>
        <button onClick={playCurrent} disabled={save.muted || hidden}>
          {failed ? "点此重试声音" : "↻ 重播当前句"}
        </button>
        <button
          onClick={() => {
            stopVoice();
            setPlaying(false);
            if (index < ids.length - 1) setIndex((i) => i + 1);
          }}
        >
          跳过这句
        </button>
      </div>
      <div className="response-options">
        <button onClick={() => respond("hello")}>👋 打个招呼</button>
        <button onClick={() => respond("clue")}>🧭 询问线索</button>
        <button onClick={() => respond("thanks")}>💛 谢谢你</button>
      </div>
      <small>角色配音 · 无需开麦；听不到声音也可以看字幕继续。</small>
    </div>
  );
}
