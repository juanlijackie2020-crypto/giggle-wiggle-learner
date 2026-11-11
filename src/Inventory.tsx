import { desertTasks, GOLD_REWARD } from "./desert/state";
import { useState, lazy, Suspense } from "react";
import type { Save, Action } from "./game/state";
const AvatarPreview = lazy(() => import("./AvatarPreview"));
import { tasks } from "./game/tasks";
export function ItemIcon({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="item-icon">
      {kind === "pickaxe" ? (
        <g transform="rotate(35 32 32)">
          <path d="M28 17h8v42h-8z" fill="#86562d" />
          <path
            d="M13 9h38v8H13zM9 17h10v10H9zM45 17h10v10H45z"
            fill="#42c4bf"
            stroke="#256a70"
            strokeWidth="3"
          />
          <path d="M20 7h24v5H20z" fill="#b0fff0" />
        </g>
      ) : kind === "backpack" ? (
        <g>
          <path
            d="M23 15V8h18v7"
            fill="none"
            stroke="#67462c"
            strokeWidth="5"
          />
          <rect
            x="13"
            y="15"
            width="38"
            height="42"
            rx="5"
            fill="#a2743f"
            stroke="#634528"
            strokeWidth="3"
          />
          <path d="M12 17h40v17H12z" fill="#d1a45c" />
          <path d="M21 26v17M43 26v17" stroke="#67462c" strokeWidth="5" />
          <path d="M18 34h6v5h-6zM40 34h6v5h-6z" fill="#ffe59c" />
          <path d="M21 46h22v8H21z" fill="#c99750" />
        </g>
      ) : kind === "gold-key" ? (
        <g fill="#e5b537" stroke="#a87421" strokeWidth="3">
          <circle cx="23" cy="20" r="12" />
          <circle cx="23" cy="20" r="5" fill="#fff3cb" />
          <path d="M23 32v25h9v-7h9v-8H32V32z" />
        </g>
      ) : kind === "tablets" ? (
        <g>
          <rect x="13" y="7" width="38" height="50" rx="5" fill="#d4aa56" />
          <rect x="20" y="15" width="24" height="33" fill="#378a95" />
          <path d="M32 21v22M25 32h14" stroke="#ffe5a0" strokeWidth="5" />
        </g>
      ) : kind === "amber" || kind === "quartz" ? (
        <g>
          <path
            d="M16 18L34 7l16 16-9 29-19 5L11 35z"
            fill={kind === "amber" ? "#e9a12f" : "#67b9a9"}
          />
          <path
            d="M16 18l18-11 3 27-15 23z"
            fill={kind === "amber" ? "#ffd965" : "#d9fff0"}
          />
          <path
            d="M37 34l13-11-9 29-19 5z"
            fill={kind === "amber" ? "#cf7c1d" : "#96decb"}
          />
        </g>
      ) : kind === "wood" || kind === "blocks" ? (
        <g>
          <path d="M10 17l23-10 22 12-24 11z" fill="#d4a161" />
          <path d="M10 17v30l21 12V30z" fill="#8b5c31" />
          <path d="M31 30l24-11v30L31 59z" fill="#b68143" />
          <path
            d="M15 23v18m6-15v23m17-15 12-6m-12 16 12-6"
            stroke="#64432a"
            strokeWidth="3"
          />
        </g>
      ) : (
        <g>
          <path d="M18 38l-5 22 19-8 18 8-5-22" fill="#4c9dc2" />
          <path
            d="M32 5l8 7 11 1 1 11 6 8-7 9-1 10-11 1-7 7-8-7-11-1-1-10-7-9 7-8 1-11 11-1z"
            fill="#eaba4a"
          />
          <circle cx="32" cy="30" r="13" fill="#fff0b7" />
          <path
            d="M24 30l6 6 11-14"
            fill="none"
            stroke="#528550"
            strokeWidth="5"
          />
        </g>
      )}
    </svg>
  );
}
export default function Inventory({
  save,
  dispatch,
}: {
  save: Save;
  dispatch: (a: Action) => void;
}) {
  const [selected, setSelected] = useState("pickaxe");
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState("all");
  const items = [
    {
      id: "pickaxe",
      name: "青晶工具镐",
      count: 1,
      desc: "靠近琥珀或石英矿，按 F / E 或点「挥镐」采矿。一击收集，不会伤害动物。",
    },
    {
      id: "backpack",
      name: "探险背包",
      count: 1,
      desc: "带扣、侧袋与肩带的立体背包。取下只隐藏外观，物品仍安全保存在背包中。",
    },
    {
      id: "wood",
      name: "任务木头",
      count: save.wood.length,
      desc: "本轮主线收集品：找到 3 块木头。",
    },
    {
      id: "amber",
      name: "森林琥珀",
      count: save.amber.length,
      desc: "本轮主线收集品：用镐采集 5 块琥珀。",
    },
    {
      id: "blocks",
      name: "木头方块",
      count: save.woodBlocks,
      desc: "宝箱永久奖励 ×10。刷新或重新挑战都保留，不重复发放。",
    },
    {
      id: "quartz",
      name: "林间石英",
      count: save.mined.length,
      desc: "散落在扩展森林的四处矿点。每处只能采一次；重玩保留，供收藏展示。",
    },
    ...(save.desertAccess || save.everCompleted || save.activeLevel === 2
      ? [
          {
            id: "tablets",
            name: "神殿石板",
            count: save.desert.tablets.length,
            desc: "第二关本轮收集品。太阳、月亮、星星三块石板打开神殿机关。",
          },
          {
            id: "gold-key",
            name: "黄金钥匙",
            count: save.desert.claims.includes(GOLD_REWARD) ? 1 : 0,
            desc: "第二关宝箱的唯一永久奖励。重复挑战不增加数量。",
          },
          {
            id: "desert-quartz",
            name: "沙漠石英",
            count: save.desert.mined.length,
            desc: "沙漠两处独立矿点，每处永久只能采集一次。",
          },
          ...desertTasks
            .filter((t) => save.desert.badges.includes(t.id))
            .map((t) => ({
              id: `desert-${t.id}`,
              name: t.badge,
              count: 1,
              desc: "沙漠支线永久徽章。",
            })),
        ]
      : []),
    ...tasks
      .filter((t) => save.tasks.badges.includes(t.id))
      .map((t) => ({
        id: t.id,
        name: t.badge,
        count: 1,
        desc: "完成森林支线获得的永久徽章。",
      })),
  ];
  const categoryFor = (id: string) =>
    ["pickaxe", "backpack"].includes(id)
      ? "equipment"
      : ["wood", "amber", "tablets"].includes(id)
        ? "tasks"
        : ["blocks", "quartz", "desert-quartz"].includes(id)
          ? "materials"
          : "collections";
  const filtered = items.filter(
    (i) => category === "all" || categoryFor(i.id) === category,
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 12) - 1),
  );
  const shown = filtered.slice(currentPage * 12, currentPage * 12 + 12);
  const badges = items.filter(
    (i) => categoryFor(i.id) === "collections" && i.id !== "gold-key",
  );
  const item = items.find((i) => i.id === selected) ?? items[0];
  const equippable = item.id === "pickaxe" || item.id === "backpack";
  const equipped =
    equippable && save.equipment[item.id as "pickaxe" | "backpack"];
  return (
    <div className="real-inventory">
      <div className="pack-preview">
        <Suspense fallback={<p>正在准备装备预览…</p>}>
          <AvatarPreview
            appearance={save.appearance}
            equipment={save.equipment}
            desertGear={save.activeLevel === 2 && save.desert.scarf}
          />
        </Suspense>
        <span>拖动人物，查看手中的镐和背部装备</span>
      </div>
      <div className="pack-contents">
        <div className="pack-filters">
          {Object.entries({
            all: "全部",
            tasks: "任务",
            materials: "材料",
            equipment: "装备",
            collections: "收藏",
          }).map(([id, name]) => (
            <button
              key={id}
              aria-pressed={category === id}
              onClick={() => {
                setCategory(id);
                setPage(0);
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="pack-grid" aria-label="背包物品格">
          {shown.map((i) => (
            <button
              key={i.id}
              className={`pack-slot ${selected === i.id ? "selected" : ""}`}
              aria-label={`${i.name} ×${i.count}`}
              aria-pressed={selected === i.id}
              onClick={() => setSelected(i.id)}
            >
              <ItemIcon kind={i.id === "desert-quartz" ? "quartz" : i.id} />
              <span>{i.name}</span>
              <b
                data-testid={
                  i.id === "blocks" ? "reward-count" : `item-${i.id}`
                }
              >
                {i.count}
              </b>
              {(i.id === "pickaxe" || i.id === "backpack") &&
                save.equipment[i.id] && <small>已装备</small>}
            </button>
          ))}
          {Array.from({ length: 12 - shown.length }, (_, i) => (
            <div
              className="pack-slot empty"
              key={`empty-${i}`}
              aria-label="空物品格"
            />
          ))}
        </div>
        {filtered.length > 12 && (
          <div className="pack-pagination">
            <button
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              上一页
            </button>
            <span>
              {currentPage + 1} / {Math.ceil(filtered.length / 12)}
            </span>
            <button
              disabled={(currentPage + 1) * 12 >= filtered.length}
              onClick={() => setPage(currentPage + 1)}
            >
              下一页
            </button>
          </div>
        )}
        {badges.length > 0 && (
          <details className="badge-wall">
            <summary>我的徽章墙 · {badges.length} 枚</summary>
            <ul>
              {badges.map((b) => (
                <li key={b.id}>🏅 {b.name}</li>
              ))}
            </ul>
          </details>
        )}
        <div className="item-detail" aria-live="polite">
          <strong>{item.name}</strong>
          <p>{item.desc}</p>
          {equippable && (
            <button
              className="primary"
              onClick={() =>
                dispatch({
                  type: "equip",
                  item: item.id as "pickaxe" | "backpack",
                })
              }
            >
              {equipped ? "收起" : "装备"}
              {item.id === "pickaxe" ? "工具镐" : "背包"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
