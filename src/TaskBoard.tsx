import { useState } from "react";
import { tasks } from "./game/tasks";
import type { Save, Action } from "./game/state";
export function TaskBoard({
  save,
  dispatch,
}: {
  save: Save;
  dispatch: (a: Action) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <span className="eyebrow">CHOOSE YOUR ADVENTURE</span>
      <h2>今天想玩什么？</h2>
      <p>主线一直保留。选一个小冒险，自由探索森林。</p>
      <div className="main-quest">
        <strong>主线 · 森林琥珀保卫战</strong>
        <p>
          木头 {save.wood.length}/3 · 琥珀 {save.amber.length}/5 · 数学{" "}
          {save.solved.length}/3
        </p>
      </div>
      <div className="quest-grid">
        {tasks.map((t) => {
          const steps = save.tasks.steps[t.id] ?? [],
            done = steps.length === t.steps.length;
          return (
            <article
              key={t.id}
              className={save.tasks.active === t.id ? "selected" : ""}
            >
              <span className="quest-icon">{t.icon}</span>
              <small>可选 · {t.type}</small>
              <h3>{t.name}</h3>
              <p>{t.description}</p>
              <ul>
                {t.steps.map((id, i) => (
                  <li key={id}>
                    {steps.includes(id) ? "✓" : "○"} {t.labels[i]}
                  </li>
                ))}
              </ul>
              <p>
                {steps.length}/{t.steps.length} · 徽章：{t.badge}
                {save.tasks.badges.includes(t.id) ? " ✓ 已获得" : ""}
              </p>
              <button
                className="primary"
                onClick={() => {
                  dispatch({ type: "task-select", id: t.id });
                  setConfirm(false);
                }}
              >
                {save.tasks.active === t.id
                  ? "正在追踪"
                  : done
                    ? "查看已完成任务"
                    : steps.length
                      ? "继续这个冒险"
                      : "选择这个冒险"}
              </button>
            </article>
          );
        })}
      </div>
      {save.tasks.active && (
        <div className="abandon">
          <button onClick={() => setConfirm(true)}>放弃当前可选任务</button>
          {confirm && (
            <>
              <p>放弃会重置当前任务本轮步骤；已获得徽章和主线奖励保留。</p>
              <button
                onClick={() => {
                  dispatch({ type: "task-abandon" });
                  setConfirm(false);
                }}
              >
                确认放弃
              </button>
              <button onClick={() => setConfirm(false)}>取消</button>
            </>
          )}
        </div>
      )}
    </>
  );
}
