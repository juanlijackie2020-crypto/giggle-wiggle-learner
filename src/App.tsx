import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Status, Controller } from "./game/Scene";
import {
  initialSave,
  parseSave,
  transition,
  SAVE_KEY,
  readyForChest,
  skins,
  shirts,
  type Action,
  type Save,
  type Outfit,
} from "./game/state";
import { collectibles, chestPosition, distance } from "./game/world";
import { input, clearInput } from "./game/input";
import level from "./data/level1.json";
import "./style.css";
const GameCanvas = lazy(() => import("./game/GameCanvas"));
class GameBoundary extends Component<
  { children: ReactNode; onError: (message: string) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: Error) {
    console.error("[Forest WebGL/Physics]", e);
    this.props.onError(e.message);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function Loading({ rendererReady }: { rendererReady: boolean }) {
  return (
    <div className="loading-in-world" role="status">
      <span className="spinner" />
      {rendererReady ? "2 / 2 · 初始化物理世界" : "1 / 2 · 载入图形引擎"}
      <progress
        max={2}
        value={rendererReady ? 1 : 0}
        aria-label="世界初始化进度"
      />
      <small>首次启动需要准备森林与碰撞系统</small>
    </div>
  );
}
function Joystick() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const center = useRef({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);
  const reset = () => {
    pointer.current = null;
    input.x = 0;
    input.z = 0;
    setKnob({ x: 0, y: 0 });
  };
  useEffect(() => {
    window.addEventListener("blur", reset);
    return () => window.removeEventListener("blur", reset);
  }, []);
  return (
    <div
      className="joystick"
      role="group"
      aria-label="移动摇杆"
      data-testid="joystick"
      onPointerDown={(e) => {
        e.preventDefault();
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        const r = e.currentTarget.getBoundingClientRect();
        center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        const x = e.clientX - center.current.x,
          y = e.clientY - center.current.y,
          l = Math.max(1, Math.hypot(x, y) / 37);
        input.x = x / l / 37;
        input.z = y / l / 37;
        setKnob({ x: x / l, y: y / l });
      }}
      onPointerMove={(e) => {
        if (pointer.current !== e.pointerId) return;
        const x = e.clientX - center.current.x,
          y = e.clientY - center.current.y,
          l = Math.max(1, Math.hypot(x, y) / 37);
        input.x = x / l / 37;
        input.z = y / l / 37;
        setKnob({ x: x / l, y: y / l });
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
    >
      <span className="joystick-cross">＋</span>
      <span
        className="knob"
        style={{ transform: `translate(${knob.x}px,${knob.y}px)` }}
      />
      <small>移动</small>
    </div>
  );
}
function Map({ status, save }: { status: Status; save: Save }) {
  return (
    <div className="map">
      <span className="eyebrow">FOREST FIELD NOTES</span>
      <svg
        viewBox="0 0 140 150"
        role="img"
        aria-label="森林地图：沿小路过桥，向北寻找宝箱"
      >
        <rect width="140" height="150" rx="14" fill="#dce4c3" />
        <path d="M70 137V15" stroke="#f8edc3" strokeWidth="10" />
        <path d="M0 65L140 65" stroke="#73b7bf" strokeWidth="16" />
        <path d="M70 55V75" stroke="#bd925a" strokeWidth="9" />
        {Array.from({ length: 14 }, (_, i) => (
          <path
            key={i}
            d={`M${i % 2 ? 111 : 20} ${10 + i * 9}l-5 9h10z`}
            fill="#7aa078"
          />
        ))}
        {collectibles
          .filter((c) => !save[c.kind].includes(c.id))
          .map((c) => (
            <circle
              key={c.id}
              cx={70 + c.position[0] * 2.7}
              cy={(c.position[2] + 28) * 2.7}
              r="3"
              fill={c.kind === "wood" ? "#956641" : "#e8a82f"}
            />
          ))}
        <rect x="65" y="15" width="10" height="8" rx="1" fill="#aa7847" />
        <circle
          cx={70 + status.x * 2.7}
          cy={(status.z + 28) * 2.7}
          r="4.5"
          fill="#fff"
          stroke="#3a6d61"
          strokeWidth="2"
        />
      </svg>
      <small>N ↑ &nbsp; 金色旗帜是安全点</small>
    </div>
  );
}
const initialStatus: Status = {
  x: 0,
  y: 1,
  z: 14,
  near: "",
  grounded: false,
  draws: 0,
};
export default function App() {
  const [save, setSave] = useState<Save>(() => {
    try {
      return parseSave(localStorage.getItem(SAVE_KEY));
    } catch {
      return initialSave();
    }
  });
  const [started, setStarted] = useState(false),
    [ready, setReady] = useState(false),
    [rendererReady, setRendererReady] = useState(false),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [status, setStatus] = useState(initialStatus),
    [panel, setPanel] = useState<"none" | "bag" | "avatar" | "quiz" | "help">(
      "none",
    ),
    [hint, setHint] = useState(""),
    [notice, setNotice] = useState(""),
    [storageError, setStorageError] = useState(false),
    [hidden, setHidden] = useState(document.hidden),
    [taskOpen, setTaskOpen] = useState(false),
    [opening, setOpening] = useState(false);
  const controller = useRef<Controller | null>(null),
    noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    openingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const live = useRef({ save, status, panel, started });
  live.current = { save, status, panel, started };
  const paused = !started || panel !== "none" || hidden || !!error;
  const dispatch = (a: Action) => setSave((s) => transition(s, a));
  function notify(message: string) {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 4000);
  }
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [save]);
  useEffect(
    () => () => {
      clearTimeout(noticeTimer.current);
      clearTimeout(openingTimer.current);
    },
    [],
  );
  useEffect(() => {
    const visible = () => {
      setHidden(document.hidden);
      clearInput();
    };
    const blur = () => clearInput();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("blur", blur);
    };
  }, []);
  function interact(requested?: string) {
    const {
      save: s,
      status: p,
      panel: currentPanel,
      started: playing,
    } = live.current;
    if (!playing || currentPanel !== "none") return;
    const id = requested ?? p.near;
    if (id === "chest") {
      if (distance(p, chestPosition) > 2.8) {
        notify("靠近宝箱，再按互动。");
        return;
      }
      if (s.completed) {
        notify("这个宝箱已经领取过了，10 个木头方块在背包里。");
        return;
      }
      if (!readyForChest(s)) {
        notify(
          `宝箱需要 3 块木头和 5 块琥珀。还差 ${3 - s.wood.length} 块木头、${5 - s.amber.length} 块琥珀。`,
        );
        return;
      }
      setHint("");
      setPanel("quiz");
      clearInput();
      return;
    }
    const item = collectibles.find((c) => c.id === id);
    if (!item) {
      notify("靠近发光琥珀、木头或宝箱，再按互动。");
      return;
    }
    if (distance(p, item.position) > 2.65) {
      notify("再靠近一点，就可以收集了。");
      return;
    }
    if (s[item.kind].includes(item.id)) return;
    dispatch({ type: "collect", kind: item.kind, id: item.id });
    notify(item.kind === "wood" ? "收集到一块木头！" : "收集到一块森林琥珀！");
  }
  const interactRef = useRef(interact);
  interactRef.current = interact;
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        setPanel("none");
        clearInput();
        return;
      }
      if (
        !live.current.started ||
        live.current.panel !== "none" ||
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
        ].includes(e.code)
      ) {
        e.preventDefault();
        input.keys.add(e.code);
        if (e.code === "Space" && !e.repeat) input.jump = true;
        if (e.code === "KeyE" && !e.repeat) interactRef.current();
      }
    };
    const up = (e: KeyboardEvent) => input.keys.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  function fail(message: string) {
    setError(message);
    setReady(false);
    clearInput();
    console.error("[Forest initialization]", message);
  }
  function retry() {
    setError("");
    setReady(false);
    setRendererReady(false);
    setAttempt((a) => a + 1);
  }
  function openChest() {
    dispatch({ type: "open" });
    setPanel("none");
    setOpening(true);
    openingTimer.current = setTimeout(() => {
      setOpening(false);
      notify("第一关完成！10 个木头方块已放入背包。");
    }, 1600);
  }
  const q = level.questions[save.solved.length];
  const nearLabel =
    status.near === "chest"
      ? save.completed
        ? "查看宝箱"
        : "打开宝箱"
      : status.near.startsWith("wood")
        ? "收集木头"
        : status.near.startsWith("amber")
          ? "收集琥珀"
          : "靠近物品互动";
  const all = readyForChest(save);
  return (
    <main className="game-shell">
      <div
        className="viewport"
        data-testid="world"
        data-x={status.x.toFixed(2)}
        data-y={status.y.toFixed(2)}
        data-z={status.z.toFixed(2)}
        data-grounded={status.grounded}
        data-drawcalls={status.draws}
      >
        <GameBoundary key={attempt} onError={fail}>
          <Suspense fallback={null}>
            <GameCanvas
              save={save}
              paused={paused}
              onStatus={setStatus}
              onInteract={(id) => interactRef.current(id)}
              onCheckpoint={(index) => {
                dispatch({ type: "checkpoint", index });
                notify("已到达新的安全点。");
              }}
              onBump={() =>
                notify("没关系！回到安全点，再试一次。收集物还在。")
              }
              controller={controller}
              onReady={() => setReady(true)}
              onRendererReady={() => setRendererReady(true)}
              onError={fail}
            />
          </Suspense>
        </GameBoundary>
      </div>
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (started) setPanel("help");
          }}
        >
          <span className="brand-icon">▦</span>
          <div>
            骞骞的学习方块世界<small>QIANQIAN’S VOXEL ADVENTURE</small>
          </div>
        </a>
        <div className="level-pill">
          <i /> LEVEL 01 <span>森林琥珀保卫战</span>
        </div>
        <div className="header-actions">
          <button
            onClick={() => {
              setPanel("avatar");
              clearInput();
            }}
            aria-label="自定义角色"
          >
            ♙ <span>角色</span>
          </button>
          <button
            onClick={() => {
              setPanel("bag");
              clearInput();
            }}
            aria-label="打开背包"
          >
            ▣ <span>背包</span>
            <b>{save.woodBlocks}</b>
          </button>
          <button
            onClick={() => {
              setPanel("help");
              clearInput();
            }}
            aria-label="操作帮助"
          >
            ?
          </button>
        </div>
      </header>
      {!ready && !error && <Loading rendererReady={rendererReady} />}
      {started && (
        <>
          <aside className={`mission-card ${taskOpen ? "expanded" : ""}`}>
            <button
              className="mission-heading"
              onClick={() => setTaskOpen(!taskOpen)}
            >
              <span className="eyebrow">YOUR FOREST ADVENTURE</span>
              <span className="mobile-expand">{taskOpen ? "−" : "＋"}</span>
            </button>
            <h1>
              森林的秘密<span>等你来发现。</span>
            </h1>
            <div className="mission-body">
              <p>沿着小路，寻找琥珀与藏起来的宝箱。</p>
              <div className={`task ${save.wood.length === 3 ? "done" : ""}`}>
                <span className="task-icon">▰</span>
                <div>
                  寻找木头<small>森林散落的建造材料</small>
                </div>
                <strong data-testid="wood-count">
                  {save.wood.length}
                  <em>/ 3</em>
                </strong>
              </div>
              <div className={`task ${save.amber.length === 5 ? "done" : ""}`}>
                <span className="task-icon amber">◆</span>
                <div>
                  收集琥珀<small>寻找金色的光芒</small>
                </div>
                <strong data-testid="amber-count">
                  {save.amber.length}
                  <em>/ 5</em>
                </strong>
              </div>
              <div className={`task ${save.completed ? "done" : ""}`}>
                <span className="task-icon">▣</span>
                <div>
                  解开数学宝箱
                  <small>
                    {save.completed
                      ? "宝藏已经收入背包"
                      : all
                        ? "宝箱准备好了，前往森林深处"
                        : "过桥后，继续向北探索"}
                  </small>
                </div>
                <strong>
                  {save.completed ? "✓" : `${save.solved.length}/3`}
                </strong>
              </div>
              <div className="reward-line">
                <span>第一关奖励</span>
                <strong>▰ 10 个木头方块</strong>
              </div>
            </div>
            <div className="safe-note">
              <i />
              {save.completed
                ? "森林守护者 · 已通关"
                : `安全点 ${save.checkpoint + 1} · 进度自动保存`}
            </div>
          </aside>
          <Map status={status} save={save} />
          <div className="location-label">
            <span>THE AMBER WOODS</span>
            <strong>
              {status.z > -1
                ? "向阳林地"
                : status.z > -8
                  ? "溪流木桥"
                  : "琥珀秘林"}
            </strong>
          </div>
          <div className="desktop-controls">
            <span>
              <kbd>W A S D</kbd> 移动
            </span>
            <span>
              <kbd>SPACE</kbd> 跳跃
            </span>
            <span>
              <kbd>E</kbd> 互动
            </span>
            <span>拖动鼠标转动视角</span>
          </div>
          <div className="interact-prompt">
            <button onClick={() => interact()} disabled={!status.near}>
              <kbd>E</kbd> {nearLabel}
            </button>
          </div>
          {!paused && (
            <div className="touch-controls">
              <Joystick />
              <div className="touch-actions">
                <button
                  aria-label="跳跃"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    input.jump = true;
                  }}
                >
                  ↑<small>跳跃</small>
                </button>
                <button
                  className="touch-interact"
                  aria-label="互动"
                  onClick={() => interact()}
                >
                  ✦<small>{status.near ? nearLabel : "互动"}</small>
                </button>
              </div>
              <span className="touch-look">滑动场景转动视角</span>
            </div>
          )}
        </>
      )}
      {!started && !error && (
        <section className="welcome">
          <div className="chapter-tag">CHAPTER 01 / THE AMBER WOODS</div>
          <h1>
            一片森林。
            <br />
            一场属于你的<span>方块冒险。</span>
          </h1>
          <p>
            穿过溪流，遇见小动物，寻找闪闪发光的琥珀。
            <br />
            用智慧打开宝箱，让想象力慢慢长大。
          </p>
          <div className="welcome-tags">
            <span>原创 3D 世界</span>
            <span>探索 × 数学</span>
            <span>适合亲子同行</span>
          </div>
          <button
            className="primary start"
            onClick={() => {
              setPanel("avatar");
            }}
            disabled={!ready}
          >
            {ready ? "创建角色，开始冒险 →" : "正在唤醒森林…"}
          </button>
          <small>
            {ready
              ? "电脑键鼠 / 手机触屏 · 无需账号"
              : "首次加载包含本地物理引擎，请稍候"}
          </small>
          <button className="loading-retry" hidden={ready} onClick={retry}>
            加载卡住了？重试
          </button>
        </section>
      )}
      {opening && (
        <div className="celebration" role="status">
          <span>✦</span>
          <h2>你守护了森林！</h2>
          <p>＋10 木头方块 · 已放入背包</p>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          ✦ {notice}
        </div>
      )}
      {storageError && (
        <div className="storage-warning" role="alert">
          浏览器无法保存进度。请允许网站存储；关闭页面后本次进度可能丢失。
        </div>
      )}
      {hidden && started && <div className="paused-label">游戏已暂停</div>}
      {error && (
        <div className="overlay">
          <section className="panel error-panel" role="alert">
            <span className="eyebrow">LET’S TRY AGAIN</span>
            <h2>森林暂时没能打开</h2>
            <p>
              请通过 HTTPS 网站在 Safari / Chrome 中打开游戏。不要在聊天软件或
              HTML 文件预览中运行。
            </p>
            <details>
              <summary>错误详情</summary>
              <pre>{error}</pre>
            </details>
            <button className="primary" onClick={retry}>
              重新加载 3D 世界
            </button>
          </section>
        </div>
      )}
      {panel !== "none" && !error && (
        <div className="overlay">
          <section
            className={`panel ${panel === "quiz" ? "quiz-panel" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              panel === "avatar"
                ? "创建角色"
                : panel === "bag"
                  ? "背包"
                  : panel === "quiz"
                    ? "数学宝箱"
                    : "操作帮助"
            }
          >
            <button
              className="close"
              aria-label="关闭"
              onClick={() => setPanel("none")}
            >
              ×
            </button>
            {panel === "avatar" && (
              <>
                <span className="eyebrow">MAKE IT YOUR ADVENTURE</span>
                <h2>你好，小小探险家。</h2>
                <p>选一个属于你的样子。角色外观会自动保存。</p>
                <fieldset>
                  <legend>肤色</legend>
                  <div className="swatches">
                    {skins.map((c, i) => (
                      <button
                        key={c}
                        style={{ background: c }}
                        aria-label={`肤色 ${i + 1}`}
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
                </fieldset>
                <fieldset>
                  <legend>衣服颜色</legend>
                  <div className="swatches">
                    {shirts.map((c, i) => (
                      <button
                        key={c}
                        style={{ background: c }}
                        aria-label={`衣服颜色 ${i + 1}`}
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
                </fieldset>
                <fieldset>
                  <legend>服装款式 · 角色在森林中实时换装</legend>
                  <div className="outfits">
                    {(["explorer", "hoodie", "ranger"] as Outfit[]).map(
                      (v, i) => (
                        <button
                          key={v}
                          aria-pressed={save.appearance.outfit === v}
                          onClick={() =>
                            dispatch({
                              type: "appearance",
                              value: { ...save.appearance, outfit: v },
                            })
                          }
                        >
                          <span>{["♙", "▥", "♧"][i]}</span>
                          {["小小探险家", "舒适卫衣", "森林游侠"][i]}
                        </button>
                      ),
                    )}
                  </div>
                </fieldset>
                <button
                  className="primary"
                  disabled={!ready}
                  onClick={() => {
                    setStarted(true);
                    setPanel("none");
                    notify("欢迎来到森林！先寻找 3 块木头。");
                  }}
                >
                  {started ? "保存，返回森林 →" : "准备好了，出发 →"}
                </button>
              </>
            )}
            {panel === "bag" && (
              <>
                <span className="eyebrow">
                  LITTLE THINGS, BIG POSSIBILITIES
                </span>
                <h2>我的冒险背包</h2>
                <p>每一次发现，都成为你世界的一部分。</p>
                <div className="inventory">
                  <div>
                    <span>▰</span>
                    <strong>{save.wood.length}</strong>
                    <small>收集的木头 / 3</small>
                  </div>
                  <div>
                    <span>◆</span>
                    <strong>{save.amber.length}</strong>
                    <small>森林琥珀 / 5</small>
                  </div>
                  <div>
                    <span>▦</span>
                    <strong data-testid="reward-count">
                      {save.woodBlocks}
                    </strong>
                    <small>奖励木头方块</small>
                  </div>
                </div>
                <p>
                  {save.completed
                    ? "第一关已通关。奖励只能领取一次，刷新后仍保留。"
                    : "收集齐材料，再解答 3 道数学题，获得 10 个木头方块。"}
                </p>
                <button className="primary" onClick={() => setPanel("none")}>
                  继续探索 →
                </button>
              </>
            )}
            {panel === "quiz" && (
              <>
                <span className="eyebrow">THE FOREST’S LITTLE RIDDLE</span>
                <h2>{q ? "智慧打开宝箱" : "宝箱里的礼物"}</h2>
                <div className="quiz-steps">
                  {level.questions.map((item, i) => (
                    <span
                      className={i < save.solved.length ? "answered" : ""}
                      key={item.id}
                    >
                      {i < save.solved.length ? "✓" : i + 1}
                    </span>
                  ))}
                </div>
                {q ? (
                  <>
                    <p>
                      第 {save.solved.length + 1} / 3 题 · 想一想，点选答案。
                    </p>
                    <div className="equation">{q.text}</div>
                    <div className="math-dots" aria-label="琥珀计数提示">
                      <span>
                        {Array.from({ length: q.dots[0] }, (_, i) => (
                          <i key={i} />
                        ))}
                      </span>
                      <b>{q.operation}</b>
                      <span>
                        {Array.from({ length: q.dots[1] }, (_, i) => (
                          <i key={i} />
                        ))}
                      </span>
                    </div>
                    <div className="answers">
                      {q.options.map((answer) => (
                        <button
                          key={answer}
                          onClick={() => {
                            if (answer !== q.answer) {
                              setHint(q.hint);
                              return;
                            }
                            dispatch({ type: "answer", id: q.id, answer });
                            setHint("");
                          }}
                        >
                          {answer}
                        </button>
                      ))}
                    </div>
                    <p className="hint" role="status">
                      {hint || "答错也没关系，可以慢慢尝试。"}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="big-chest">▣ ✦</div>
                    <p>
                      三道题全部答对了！
                      <br />
                      打开宝箱，领取 10 个木头方块。
                    </p>
                    <button className="primary" onClick={openChest}>
                      开启宝箱 · ＋10 木头方块
                    </button>
                  </>
                )}
              </>
            )}
            {panel === "help" && (
              <>
                <span className="eyebrow">
                  A LITTLE GUIDE FOR BIG ADVENTURES
                </span>
                <h2>一起探索森林</h2>
                <ul className="help-list">
                  <li>
                    <strong>电脑</strong> WASD / 方向键移动，空格跳跃，E
                    互动。拖动场景转动镜头。
                  </li>
                  <li>
                    <strong>手机</strong>{" "}
                    左下摇杆移动；右下按钮跳跃、互动；在场景空白处滑动转镜头。
                  </li>
                  <li>
                    <strong>任务</strong> 找齐 3 块木头和 5
                    块琥珀，沿地图小路过桥，到北面的宝箱解答 3 道数学题。
                  </li>
                  <li>
                    <strong>安全</strong>{" "}
                    碰到怪物或落水，会回到最近的金色旗帜。不会损失收集物。
                  </li>
                  <li>
                    <strong>存档</strong>{" "}
                    外观与进度保存在本浏览器，不会跨设备同步。奖励只领取一次。
                  </li>
                </ul>
                <button className="primary" onClick={() => setPanel("none")}>
                  知道了 →
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
