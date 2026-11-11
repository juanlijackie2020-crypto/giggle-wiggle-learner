import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { input } from "./game/input";
export class GameBoundary extends Component<
  { children: ReactNode; onError: (message: string) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: Error) {
    console.error("[Voxel WebGL/Physics]", e);
    this.props.onError(e.message);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function Loading({ rendererReady }: { rendererReady: boolean }) {
  return (
    <div className="loading-in-world" role="status">
      <span className="spinner" />
      {rendererReady ? "2 / 2 · 初始化物理世界" : "1 / 2 · 载入图形引擎"}
      <progress
        max={2}
        value={rendererReady ? 1 : 0}
        aria-label="世界初始化进度"
      />
      <small>首次启动需要准备场景与碰撞系统</small>
    </div>
  );
}
export function Joystick() {
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
