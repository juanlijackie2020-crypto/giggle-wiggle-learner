import { useState } from "react";
import type { Save } from "./game/state";
import { emptyProgress } from "./game/state";
import level from "./data/level1.json";
export function LearningReport({ save }: { save: Save }) {
  const [confirmed, setConfirmed] = useState(false);
  if (!confirmed)
    return (
      <>
        <span className="eyebrow">FOR PARENTS</span>
        <h2>家长入口</h2>
        <p>
          这里包含参考答案和学习记录，请由陪同的家长查看。儿童答题界面不会提前显示答案。
        </p>
        <button className="primary" onClick={() => setConfirmed(true)}>
          我是家长，查看学习记录与参考答案
        </button>
        <p>此入口用于避免误触，不是密码保护。</p>
      </>
    );
  const rows = level.questions.map((q) => ({
    q,
    r: save.questionStats[q.id] ?? emptyProgress(),
  }));
  const attempts = rows.reduce((n, { r }) => n + r.attemptCount, 0),
    correct = rows.reduce((n, { r }) => n + r.correctCount, 0),
    hints = rows.reduce((n, { r }) => n + r.hintCount, 0);
  return (
    <>
      <span className="eyebrow">LEARNING TOGETHER</span>
      <h2>家长学习记录</h2>
      <p>
        本浏览器累计记录 · 作答 {attempts} 次 · 正确率{" "}
        {attempts ? `${Math.round((correct / attempts) * 100)}%` : "暂无"} ·
        提示 {hints} 次
      </p>
      <div className="report-table">
        <table>
          <thead>
            <tr>
              <th>题目 / 参考答案</th>
              <th>作答</th>
              <th>提示</th>
              <th>首次作答</th>
              <th>首次完成时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ q, r }) => (
              <tr key={q.id}>
                <td>{q.text.replace("?", String(q.answer))}</td>
                <td>{r.attemptCount}</td>
                <td>{r.hintCount}</td>
                <td>
                  {r.firstTryCorrect === null
                    ? "未记录"
                    : r.firstTryCorrect
                      ? "独立答对"
                      : r.completedAt
                        ? "重试后完成"
                        : "练习中"}
                </td>
                <td>
                  {r.completedAt
                    ? new Date(r.completedAt).toLocaleString("zh-CN")
                    : "未记录"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        首次作答指从开始记录后的首次尝试。旧存档没有的历史数据标为未记录，不推测既往正确率。重新开始保留累计记录。
      </p>
      <p>
        {save.everCompleted
          ? "第一关已通关，永久奖励已保留。"
          : "第一关正在探索中。"}{" "}
        琥珀目前只作本关收集展示，不自动兑换或跨关使用。
      </p>
    </>
  );
}
