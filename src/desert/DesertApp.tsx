import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GameBoundary, Loading, Joystick } from "../GameUI";
import Inventory from "../Inventory";
import { input, clearInput } from "../game/input";
import { stopVoice, playVoice } from "../game/dialogueAudio";
import { playTone } from "../game/sound";
import {
  skins,
  shirts,
  outfits,
  outfitNames,
  palettes,
  type Save,
  type Action,
} from "../game/state";
import type { Difficulty } from "../game/questions";
import { level, cellPosition, cellAt, route } from "./maze";
import { rules, desertTasks, GOLD_REWARD, type DesertAction } from "./state";
import type { DesertStatus, DesertController } from "./World";
import lines from "../data/desert-dialogue.json";
import "./desert.css";
const Canvas = lazy(() => import("./Canvas"));
const AvatarPreview = lazy(() => import("../AvatarPreview"));
type Panel =
  | "none"
  | "bag"
  | "avatar"
  | "tasks"
  | "quiz"
  | "dialogue"
  | "pause"
  | "parent"
  | "map"
  | "help";
const startStatus: DesertStatus = {
  x: 0,
  y: 1,
  z: 33,
  near: "",
  grounded: false,
  draws: 0,
  guide: false,
  camelX: -4,
  camelZ: 29,
};
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  return (
    <div className="overlay desert-overlay">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="panel desert-panel"
      >
        <div className="desert-dialog-heading">
          <h2>{title}</h2>
          <button aria-label="关闭窗口" onClick={close}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function MazeMap({
  save,
  status,
  large = false,
}: {
  save: Save;
  status: DesertStatus;
  large?: boolean;
}) {
  const d = save.desert;
  const point = (x: number, z: number) => [(x + 24) * 3, (z + 24) * 3];
  return (
    <div className={large ? "desert-map large" : "desert-map"}>
      <svg
        viewBox="0 0 144 144"
        role="img"
        aria-label="已探索迷宫地图：深色区域尚未探索"
      >
        <rect width="144" height="144" rx="8" fill="#203c51" />
        {d.explored.map((c) => {
          const [x, , z] = cellPosition(c),
            p = point(x, z);
          return (
            <rect
              key={c}
              x={p[0] - 8.5}
              y={p[1] - 8.5}
              width="17"
              height="17"
              fill="#e4c787"
            />
          );
        })}
        {level.maze.edges
          .filter(([a, b]) => d.explored.includes(a) && d.explored.includes(b))
          .map(([a, b]) => {
            const p = cellPosition(a),
              q = cellPosition(b);
            return (
              <path
                key={`${a}-${b}`}
                d={`M${point(p[0], p[2]).join(" ")}L${point(q[0], q[2]).join(" ")}`}
                stroke="#fff0bc"
                strokeWidth="5"
              />
            );
          })}
        {level.tablets
          .filter((t) => d.explored.includes(t.cell))
          .map((t) => {
            const p = cellPosition(t.cell),
              pt = point(p[0], p[2]);
            return (
              <circle
                key={t.id}
                cx={pt[0]}
                cy={pt[1]}
                r="3"
                fill={d.tablets.includes(t.id) ? "#2eaa92" : "#e58138"}
              />
            );
          })}
        <text x="65" y="10" fill="white" fontSize="7">
          神殿 ↑
        </text>
        <text x="60" y="141" fill="white" fontSize="7">
          ↓ 绿洲
        </text>
        <circle
          cx={Math.max(3, Math.min(141, point(status.x, status.z)[0]))}
          cy={Math.max(3, Math.min(141, point(status.x, status.z)[1]))}
          r="3.8"
          fill="#fff"
          stroke="#187f9b"
          strokeWidth="1.5"
        />
      </svg>
      <small>白点是你 · 北方 ↑ · 已走 {d.explored.length}/49</small>
    </div>
  );
}
function NumberBlocks({ n, remove = false }: { n: number; remove?: boolean }) {
  return (
    <div
      className={`number-blocks ${remove ? "remove" : ""}`}
      aria-label={`${n}：${Math.floor(n / 10)} 个十和 ${n % 10} 个一`}
    >
      {Array.from({ length: Math.floor(n / 10) }, (_, i) => (
        <b key={`t${i}`}>10</b>
      ))}
      {Array.from({ length: n % 10 }, (_, i) => (
        <i key={i} />
      ))}
      {n === 0 && <span>0</span>}
    </div>
  );
}
export default function DesertApp({
  save,
  dispatch,
  onLevels,
  externalPaused,
  storageError,
}: {
  save: Save;
  dispatch: (a: Action) => void;
  onLevels: () => void;
  externalPaused: boolean;
  storageError: boolean;
}) {
  const d = save.desert;
  const [started, setStarted] = useState(false),
    [ready, setReady] = useState(false),
    [renderer, setRenderer] = useState(false),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [panel, setPanel] = useState<Panel>("none"),
    [status, setStatus] = useState(startStatus),
    [hidden, setHidden] = useState(document.hidden),
    [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState<"restart" | "abandon" | null>(null),
    [animal, setAnimal] = useState("camel"),
    [caption, setCaption] = useState(""),
    [audioError, setAudioError] = useState(false),
    [opening, setOpening] = useState(false);
  const controller = useRef<DesertController | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    rewardTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const paused =
    !started || panel !== "none" || hidden || externalPaused || !!error;
  const latest = useRef({ save, status, panel, paused });
  latest.current = { save, status, panel, paused };
  const send = (action: DesertAction) => dispatch({ type: "desert", action });
  const notify = (text: string) => {
    setNotice(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 6500);
  };
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(rewardTimer.current);
      stopVoice();
      clearInput();
    },
    [],
  );
  useEffect(() => {
    const visibility = () => {
      setHidden(document.hidden);
      clearInput();
      if (document.hidden) stopVoice();
    };
    const blur = () => {
      clearInput();
      stopVoice();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
    };
  }, []);
  useEffect(() => {
    clearInput();
    if (panel !== "dialogue" || externalPaused || hidden) stopVoice();
  }, [panel, externalPaused, hidden]);
  const say = (ids: string[], done?: () => void) => {
    setAudioError(false);
    const line = lines.find((l) => l.id === ids[0]);
    if (!line) {
      done?.();
      return;
    }
    setCaption(`${line.speaker}：${line.text}`);
    if (save.muted) {
      setCaption(
        ids
          .map((id) => {
            const l = lines.find((l) => l.id === id);
            return l ? `${l.speaker}：${l.text}` : "";
          })
          .join("\n"),
      );
      done?.();
      return;
    }
    playVoice(
      line.path,
      save.voiceVolume,
      () => (ids.length > 1 ? say(ids.slice(1), done) : done?.()),
      () => setAudioError(true),
    );
  };
  function interact(tool = false) {
    const current = latest.current;
    if (current.paused) return;
    const id = current.status.near,
      s = current.save.desert;
    if (tool && !current.save.equipment.pickaxe) {
      notify("先打开背包，装备工具镐。");
      return;
    }
    if (tool && id !== "sandstone" && !id.startsWith("desert-quartz")) {
      controller.current?.swing();
      notify("找带青色矿石标记的松动砂岩。普通迷宫墙不能挖。");
      return;
    }
    if (id === "sandstone" || id.startsWith("desert-quartz")) {
      if (!current.save.equipment.pickaxe) {
        notify("需要工具镐。按 B 打开背包装备它。");
        return;
      }
      controller.current?.swing();
      send(id === "sandstone" ? { type: "break" } : { type: "mine", id });
      playTone("collect", save.muted);
      notify(
        id === "sandstone"
          ? "砂岩清理好了，进去找月亮石板吧！"
          : "沙漠石英 ×1 已放进背包。",
      );
      return;
    }
    const sign = level.deadEndClues.find((c) => c.id === id);
    if (sign) {
      notify(sign.text);
      return;
    }
    if (id.startsWith("tablet")) {
      send({ type: "tablet", id });
      playTone("collect", save.muted);
      notify(`找到${level.tablets.find((t) => t.id === id)?.name}！`);
      return;
    }
    if (id === "gate") {
      if (s.tablets.length < 3) {
        notify(`机关还差 ${3 - s.tablets.length} 块石板。`);
        return;
      }
      send({ type: "gate" });
      playTone("correct", save.muted);
      notify("三块石板归位！神殿大门打开了。");
      return;
    }
    if (id === "chest") {
      if (s.completed) {
        notify("黄金钥匙已经放进背包，重新挑战也不会丢失。");
        return;
      }
      if (!s.gate) {
        notify("先把三块石板放进神殿机关。");
        return;
      }
      setPanel("quiz");
      return;
    }
    if (level.animals.some((a) => a.id === id)) {
      setAnimal(id);
      setCaption("");
      setPanel("dialogue");
      say([`${id}-hello`]);
      return;
    }
    const m = level.markers.find((m) => m.id === id && m.task === s.task);
    if (m) {
      const task = desertTasks.find((t) => t.id === s.task)!;
      if (
        task.id === "tracks" &&
        task.steps[(s.steps.tracks ?? []).length] !== id
      ) {
        notify("先从东南角的第一组脚印出发，沿东侧向北走。");
        return;
      }
      send({ type: "step", id });
      playTone("collect", save.muted);
      notify(
        `${m.name}记录好了！${id === "track-3" ? "下一步向西走，回到蓝旗中庭。" : ""}`,
      );
      return;
    }
    notify("靠近石板、小动物、砂岩或门口，再按互动。");
  }
  const interactRef = useRef(interact);
  interactRef.current = interact;
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (externalPaused) return;
      if (e.code === "Escape") {
        setPanel((p) => (p === "none" ? "pause" : "none"));
        clearInput();
        return;
      }
      if (
        latest.current.paused ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Space",
          "KeyE",
          "KeyF",
          "KeyB",
          "KeyM",
        ].includes(e.code)
      ) {
        e.preventDefault();
        input.keys.add(e.code);
        if (e.repeat) return;
        if (e.code === "Space") input.jump = true;
        if (e.code === "KeyE") interactRef.current();
        if (e.code === "KeyF") interactRef.current(true);
        if (e.code === "KeyB") setPanel("bag");
        if (e.code === "KeyM") setPanel("map");
      }
    };
    const up = (e: KeyboardEvent) => input.keys.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [externalPaused]);
  function retry() {
    setError("");
    setReady(false);
    setRenderer(false);
    setAttempt((n) => n + 1);
  }
  function restart() {
    send({ type: "restart" });
    setConfirm(null);
    setPanel("none");
    setOpening(false);
    clearTimeout(rewardTimer.current);
    input.yaw = 0;
    input.pitch = 0.4;
    retry();
    notify("开始新的沙漠挑战，已领取的钥匙、矿石和徽章保留。");
  }
  function claim() {
    send({ type: "claim" });
    setPanel("none");
    setOpening(true);
    playTone("reward", save.muted);
    rewardTimer.current = setTimeout(() => {
      setOpening(false);
      notify(
        d.claims.includes(GOLD_REWARD)
          ? "再次通关！你的黄金钥匙仍在背包。"
          : "第二关完成！黄金钥匙 ×1 已存入背包。",
      );
    }, 1800);
  }
  const question = d.questionSet.questions[d.solved.length],
    record = question ? d.stats[question.id] : undefined;
  const nextTablet = level.tablets.find((t) => !d.tablets.includes(t.id));
  const nearName =
    level.tablets.find((t) => t.id === status.near)?.name ??
    level.animals.find((a) => a.id === status.near)?.name ??
    level.markers.find((m) => m.id === status.near)?.name ??
    level.deadEndClues.find((c) => c.id === status.near)?.name ??
    { gate: "放入三块石板", sandstone: "挥镐清理砂岩", chest: "神殿宝箱" }[
      status.near
    ] ??
    (status.near.startsWith("desert-quartz") ? "采集沙漠石英" : "靠近物品互动");
  const task = desertTasks.find((t) => t.id === d.task);
  const clue = () => {
    say(["hero-clue", nextTablet ? `${nextTablet.id}-clue` : "all-clue"]);
  };
  return (
    <main className="game-shell desert-shell">
      <div
        className="viewport"
        data-testid="desert-world"
        data-x={status.x.toFixed(2)}
        data-y={status.y.toFixed(2)}
        data-z={status.z.toFixed(2)}
        data-grounded={status.grounded}
        data-drawcalls={status.draws}
        data-near={status.near}
        data-gate={d.gate}
        data-broken={d.broken}
        data-paused={paused}
        data-camera-yaw={input.yaw.toFixed(3)}
        data-camel-x={status.camelX.toFixed(2)}
        data-camel-z={status.camelZ.toFixed(2)}
        data-guide={status.guide}
      >
        <GameBoundary
          key={attempt}
          onError={(m) => {
            console.error("[Desert initialization]", m);
            setError(m);
          }}
        >
          <Suspense fallback={null}>
            <Canvas
              save={save}
              paused={paused}
              onStatus={setStatus}
              dispatch={send}
              onReady={() => setReady(true)}
              onRendererReady={() => setRenderer(true)}
              onError={setError}
              onNotice={notify}
              controller={controller}
            />
          </Suspense>
        </GameBoundary>
      </div>
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">☀</span>
          <div>
            沙漠神殿大迷宫<small>LEVEL 02 · THE SUNLIT TEMPLE</small>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={onLevels}>关卡</button>
          <button aria-label="选择任务" onClick={() => setPanel("tasks")}>
            任务
          </button>
          <button aria-label="自定义角色" onClick={() => setPanel("avatar")}>
            角色
          </button>
          <button aria-label="打开背包" onClick={() => setPanel("bag")}>
            背包
          </button>
          <button aria-label="暂停游戏" onClick={() => setPanel("pause")}>
            Ⅱ
          </button>
        </div>
      </header>
      {started && (
        <>
          <aside className="desert-objective">
            <span className="eyebrow">THE THREE TABLETS</span>
            <h2>
              {d.completed
                ? "神殿探险完成！"
                : d.gate
                  ? "打开神殿宝箱"
                  : "寻找三块神殿石板"}
            </h2>
            <div className="tablet-counter" data-testid="tablet-count">
              {level.tablets.map((t) => (
                <span
                  className={d.tablets.includes(t.id) ? "found" : ""}
                  key={t.id}
                >
                  {d.tablets.includes(t.id) ? "✓" : "◇"} {t.name}
                </span>
              ))}
              <strong>{d.tablets.length} / 3</strong>
            </div>
            <p>
              {d.completed
                ? "黄金钥匙已存入跨关背包。"
                : d.gate
                  ? `进入北边神殿，完成 ${d.solved.length}/3 道计算题。`
                  : d.tablets.length === 3
                    ? "去北方中庭，把石板放入门口机关。"
                    : "沿通道探索，蓝旗是安全点。月亮石板前的砂岩可以用镐清理。"}
            </p>
            {task && (
              <button onClick={() => setPanel("tasks")}>
                {task.name} · {(d.steps[task.id] ?? []).length}/
                {task.steps.length}
              </button>
            )}
          </aside>
          <button
            className="desert-map-button"
            aria-label="打开探索地图"
            onClick={() => setPanel("map")}
          >
            <MazeMap save={save} status={status} />
          </button>
          <div className="desert-shortcuts">
            <button onClick={() => setPanel("help")}>操作说明</button>
            <button
              onClick={() => {
                controller.current?.returnSafe();
              }}
            >
              回安全点
            </button>
          </div>
          {!paused && (
            <div className="desert-controls">
              <Joystick />
              <div className="desert-action-buttons">
                <span>{nearName}</span>
                <button
                  aria-label="跳跃"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    input.jump = true;
                  }}
                >
                  跳跃 ↑
                </button>
                <button aria-label="使用工具镐" onClick={() => interact(true)}>
                  挥镐 F
                </button>
                <button
                  className="primary"
                  aria-label="互动"
                  onClick={() => interact()}
                >
                  互动 E
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {notice && (
        <div className="desert-toast" role="status">
          {notice}
        </div>
      )}
      {storageError && (
        <div className="desert-storage" role="alert">
          无法保存进度。请检查浏览器存储空间；关闭页面可能丢失本次进度。
        </div>
      )}
      {!ready && !error && <Loading rendererReady={renderer} />}
      {error && (
        <Modal title="场景启动遇到问题" close={() => setPanel("pause")}>
          <p role="alert">{error}</p>
          <p>
            请使用 HTTPS 地址在 Safari / Chrome 打开，启用 WebGL。不要在手机
            HTML 文件预览中运行。
          </p>
          <button className="primary" onClick={retry}>
            重新加载第二关
          </button>
          <button onClick={onLevels}>选择关卡</button>
        </Modal>
      )}
      {!started && !error && ready && panel === "none" && (
        <Modal title="下一站，沙漠神殿！" close={onLevels}>
          <div className="desert-welcome-art">
            ☀ <span>◇ ◇ ◇</span> 🐪
          </div>
          <p>在阳光下的迷宫寻找三块石板，和沙漠伙伴聊天，再打开神殿宝箱。</p>
          <ol>
            <li>沿通道探索，地图会记住走过的地方。</li>
            <li>拿出工具镐，清理带矿石标记的松动砂岩。</li>
            <li>石板齐了就去神殿，完成三道计算题，获得黄金钥匙！</li>
          </ol>
          <button
            className="primary"
            onClick={() => {
              setStarted(true);
              clearInput();
              input.yaw = 0;
              input.pitch = 0.4;
            }}
          >
            进入沙漠冒险 →
          </button>
          <button onClick={() => setPanel("avatar")}>先换上沙漠装扮</button>
        </Modal>
      )}
      {panel === "bag" && (
        <Modal title="跨关探险背包" close={() => setPanel("none")}>
          <Inventory save={save} dispatch={dispatch} />
        </Modal>
      )}
      {panel === "avatar" && (
        <Modal title="沙漠装扮室" close={() => setPanel("none")}>
          <div className="desert-avatar-layout">
            <Suspense fallback={<p>准备换装镜…</p>}>
              <AvatarPreview
                appearance={save.appearance}
                equipment={save.equipment}
                desertGear={d.scarf}
              />
            </Suspense>
            <div>
              <h3>肤色</h3>
              <div className="desert-swatches">
                {skins.map((c) => (
                  <button
                    key={c}
                    style={{ background: c }}
                    aria-label={`肤色 ${c}`}
                    aria-pressed={save.appearance.skin === c}
                    onClick={() =>
                      dispatch({
                        type: "appearance",
                        value: { ...save.appearance, skin: c },
                      })
                    }
                  />
                ))}
              </div>
              <h3>衣服颜色</h3>
              <div className="desert-swatches">
                {shirts.map((c) => (
                  <button
                    key={c}
                    style={{ background: c }}
                    aria-label={`衣服颜色 ${c}`}
                    aria-pressed={save.appearance.shirt === c}
                    onClick={() =>
                      dispatch({
                        type: "appearance",
                        value: { ...save.appearance, shirt: c },
                      })
                    }
                  />
                ))}
              </div>
              <h3>服饰款式</h3>
              <div className="desert-choice-grid">
                {outfits.map((o, i) => (
                  <button
                    key={o}
                    aria-pressed={save.appearance.outfit === o}
                    onClick={() =>
                      dispatch({
                        type: "appearance",
                        value: { ...save.appearance, outfit: o },
                      })
                    }
                  >
                    {outfitNames[i]}
                  </button>
                ))}
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={d.scarf}
                  onChange={() => send({ type: "scarf" })}
                />{" "}
                沙漠护目镜与金色围巾（免费）
              </label>
              <div className="desert-choice-grid">
                {palettes.map((p) => (
                  <button
                    key={p.name}
                    onClick={() =>
                      dispatch({
                        type: "appearance",
                        value: {
                          ...save.appearance,
                          shirt: p.shirt,
                          pants: p.pants,
                          accent: p.accent,
                        },
                      })
                    }
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button className="primary" onClick={() => setPanel("none")}>
            保存装扮，继续 →
          </button>
        </Modal>
      )}
      {panel === "map" && (
        <Modal title="我的迷宫探险图" close={() => setPanel("none")}>
          <MazeMap save={save} status={status} large />
          <p>
            深蓝区域还没有走过；橙点是发现但尚未拿到的石板，绿点已经收集。往北去神殿，往南回绿洲。
          </p>
          <p>
            沙漠外圈也可以探索：东侧有日晷与三组脚印，绿洲在南方。未知迷宫不会提前显示。
          </p>
          <button
            onClick={() => {
              setPanel("none");
              controller.current?.returnSafe();
            }}
          >
            带我回安全点
          </button>
        </Modal>
      )}
      {panel === "dialogue" && (
        <Modal
          title={`和${level.animals.find((a) => a.id === animal)?.name}聊天`}
          close={() => setPanel("none")}
        >
          <div className="desert-conversation" aria-live="polite">
            {caption || "你好，小探险家！"}
          </div>
          {audioError && (
            <p role="alert">
              声音暂时没有播放，文字仍可阅读。请点重听，或检查静音和音量。
            </p>
          )}
          <div className="desert-choice-grid">
            <button
              onClick={() => {
                send({ type: "step", id: animal });
                say(["hero-hello", `${animal}-hello`]);
              }}
            >
              你好！交个朋友
            </button>
            <button onClick={clue}>问下一块石板的线索</button>
            <button onClick={() => say([`${animal}-hello`])}>
              重听伙伴的声音
            </button>
            {animal === "camel" && (
              <button
                onClick={() =>
                  say(["hero-guide", "camel-guide"], () => {
                    setPanel("none");
                    controller.current?.guide();
                  })
                }
              >
                请阿沙带路
              </button>
            )}
            <button
              onClick={() => say(["hero-thanks"], () => setPanel("none"))}
            >
              谢谢，再见！
            </button>
          </div>
          <button
            onClick={() => {
              stopVoice();
            }}
          >
            停止语音
          </button>
          <button
            onClick={() => {
              dispatch({ type: "mute" });
              stopVoice();
            }}
          >
            {save.muted ? "开启声音" : "静音声音"}
          </button>
          <small>双方都有普通话语音与字幕。静音时也能完成任务。</small>
        </Modal>
      )}
      {panel === "tasks" && (
        <Modal title="沙漠任务板" close={() => setPanel("none")}>
          <p>选一种喜欢的支线。换任务会保留步骤，主线宝箱不要求完成支线。</p>
          <div className="desert-task-list">
            {desertTasks.map((t) => (
              <article key={t.id}>
                <h3>
                  {t.name} {d.badges.includes(t.id) && "🏅"}
                </h3>
                <p>{t.hint}</p>
                <p>
                  {(d.steps[t.id] ?? []).length} / {t.steps.length} · 奖励：
                  {t.badge}
                </p>
                <button
                  className={d.task === t.id ? "primary" : ""}
                  onClick={() => send({ type: "task", id: t.id })}
                >
                  {d.task === t.id ? "正在进行" : "选择任务"}
                </button>
              </article>
            ))}
          </div>
          {d.task && (
            <button onClick={() => setConfirm("abandon")}>放弃当前支线</button>
          )}
          {confirm === "abandon" && (
            <div className="desert-confirm">
              <p>放弃会清除这条支线本轮的步骤，已获徽章保留。</p>
              <button
                onClick={() => {
                  send({ type: "abandon" });
                  setConfirm(null);
                }}
              >
                确认放弃
              </button>
              <button onClick={() => setConfirm(null)}>继续保留</button>
            </div>
          )}
        </Modal>
      )}
      {panel === "quiz" && (
        <Modal title="神殿的数字机关" close={() => setPanel("none")}>
          {question ? (
            <>
              <p>第 {d.solved.length + 1} / 3 题 · 慢慢想，可以重试</p>
              <div className="desert-equation" data-testid="desert-question">
                {question.text}
              </div>
              <div className="desert-answers">
                {question.options.map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      send({ type: "answer", id: question.id, answer: n });
                      if (n === question.answer)
                        playTone("correct", save.muted);
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {(record?.runErrors ?? 0) > 0 && (
                <div className="desert-hint" role="status">
                  <p>{question.hint}</p>
                  {record!.runErrors > 1 && (
                    <>
                      <NumberBlocks n={question.dots[0]} />
                      <strong>{question.operation}</strong>
                      <NumberBlocks
                        n={question.dots[1]}
                        remove={question.operation === "−"}
                      />
                      <p>{question.visualHint}</p>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="desert-welcome-art">◇ ✓ ◇</div>
              <h3>三道题都解开了！</h3>
              <p>
                {d.claims.includes(GOLD_REWARD)
                  ? "你已拥有黄金钥匙，这次重玩不会重复发放。"
                  : "打开宝箱，领取黄金钥匙 ×1。"}
              </p>
              <button className="primary" onClick={claim}>
                打开神殿宝箱
              </button>
            </>
          )}
        </Modal>
      )}
      {opening && (
        <div className="desert-celebration" role="status">
          ✨ 神殿机关解开了！ ✨
        </div>
      )}
      {panel === "pause" && (
        <Modal title="在绿洲歇一会儿" close={() => setPanel("none")}>
          <p>当前石板、题目和永久收藏自动保存。</p>
          <div className="desert-choice-grid">
            <button className="primary" onClick={() => setPanel("none")}>
              继续冒险
            </button>
            <button onClick={onLevels}>选择关卡</button>
            <button onClick={() => setPanel("parent")}>
              家长学习报告与设置
            </button>
            <button onClick={() => setConfirm("restart")}>
              重新挑战第二关
            </button>
          </div>
          <label>
            <input
              type="checkbox"
              checked={save.muted}
              onChange={() => {
                dispatch({ type: "mute" });
                stopVoice();
              }}
            />{" "}
            静音
          </label>
          <label>
            <input
              type="checkbox"
              checked={save.lowQuality}
              onChange={() => dispatch({ type: "quality" })}
            />{" "}
            省电画质
          </label>
          {confirm === "restart" && (
            <div className="desert-confirm">
              <p>
                重置第二关的石板、机关、地图、题目和支线步骤。第一关进度、永久钥匙、矿石、徽章保留。
              </p>
              <button onClick={restart}>确认重新挑战第二关</button>
              <button onClick={() => setConfirm(null)}>保留当前进度</button>
            </div>
          )}
        </Modal>
      )}
      {panel === "parent" && (
        <Modal title="家长学习报告与设置" close={() => setPanel("pause")}>
          <label>
            下次挑战的计算难度{" "}
            <select
              value={d.difficulty}
              onChange={(e) =>
                send({
                  type: "difficulty",
                  value: e.target.value as Difficulty,
                })
              }
            >
              {Object.entries(rules.difficulties).map(([id, r]) => (
                <option key={id} value={id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <p>更换难度只在重新挑战第二关后生效。本轮题目和选项保持不变。</p>
          <label>
            对话音量{" "}
            <input
              type="range"
              min="0"
              max="1"
              step=".05"
              value={save.voiceVolume}
              onChange={(e) =>
                dispatch({
                  type: "volume",
                  channel: "voiceVolume",
                  value: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            音效音量{" "}
            <input
              type="range"
              min="0"
              max="1"
              step=".05"
              value={save.effectsVolume}
              onChange={(e) =>
                dispatch({
                  type: "volume",
                  channel: "effectsVolume",
                  value: Number(e.target.value),
                })
              }
            />
          </label>
          <h3>本轮记录（答案仅在家长视图显示）</h3>
          <div className="desert-report">
            <table>
              <thead>
                <tr>
                  <th>题目与答案</th>
                  <th>尝试</th>
                  <th>提示</th>
                  <th>掌握情况</th>
                </tr>
              </thead>
              <tbody>
                {d.questionSet.questions.map((q) => {
                  const r = d.stats[q.id];
                  return (
                    <tr key={q.id}>
                      <td>{q.text.replace("?", String(q.answer))}</td>
                      <td>{r?.attemptCount ?? 0}</td>
                      <td>{r?.hintCount ?? 0}</td>
                      <td>
                        {r?.completedAt
                          ? r.firstTryCorrect
                            ? "独立答对"
                            : "提示后完成"
                          : "尚未完成"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p>
            本轮正确率：
            {(() => {
              const r = Object.values(d.stats),
                total = r.reduce((a, b) => a + b.attemptCount, 0);
              return total
                ? `${Math.round((r.reduce((a, b) => a + b.correctCount, 0) / total) * 100)}%`
                : "尚无作答";
            })()}{" "}
            · 历史挑战 {d.questionSet.runId} 轮
          </p>
          <details>
            <summary>查看最近历史记录</summary>
            {d.history.map((h) => (
              <article key={h.set.setId}>
                <h4>第 {h.set.runId + 1} 轮</h4>
                {h.set.questions.map((q) => (
                  <p key={q.id}>
                    {q.text.replace("?", String(q.answer))} · 尝试{" "}
                    {h.stats[q.id]?.attemptCount ?? 0} · 提示{" "}
                    {h.stats[q.id]?.hintCount ?? 0} ·{" "}
                    {h.stats[q.id]?.completedAt ?? "未完成"}
                  </p>
                ))}
              </article>
            ))}
          </details>
        </Modal>
      )}
      {panel === "help" && (
        <Modal title="小探险家的操作指南" close={() => setPanel("none")}>
          <p>
            电脑：WASD / 方向键移动，空格跳跃，拖动画面转镜头，E 互动，F 挥镐，B
            背包，M 地图。
          </p>
          <p>
            手机：左侧摇杆移动，右侧按钮跳跃、互动、挥镐。拖动画面空白处转镜头。
          </p>
          <p>
            沙漠共 96 × 96 格；迷宫内有 49
            个区域、真实岔路和回环。到蓝旗旁会记录新的安全点，收集品不会因返回安全点而丢失。
          </p>
          <p>
            向骆驼问路或请它带路。护目镜和围巾只改变外观，不影响难度。石头守卫只在外围巡逻，可以绕开。
          </p>
          <button className="primary" onClick={() => setPanel("none")}>
            我知道了，出发！
          </button>
        </Modal>
      )}
    </main>
  );
}
