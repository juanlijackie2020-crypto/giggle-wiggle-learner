import definitions from "../data/tasks.json";
import type { Vec3 } from "./world";
export const tasks = definitions;
export const taskMarkers: {
  id: string;
  task: string;
  name: string;
  position: Vec3;
}[] = [
  { id: "bridge", task: "explore", name: "桥边安全点", position: [2.8, 0, 0] },
  {
    id: "treehouse",
    task: "explore",
    name: "树屋入口",
    position: [-5, 0, -8.5],
  },
  { id: "amber-grove", task: "explore", name: "琥珀林", position: [0, 0, -16] },
  { id: "finish", task: "parkour", name: "跑酷终点", position: [3.8, 0, 16] },
];
export const stumps: Vec3[] = [
  [3.8, 0.2, 20.5],
  [3.8, 0.35, 19],
  [3.8, 0.5, 17.5],
];
export type TaskProgress = {
  active: string | null;
  steps: Record<string, string[]>;
  badges: string[];
};
export const emptyTasks = (): TaskProgress => ({
  active: null,
  steps: {},
  badges: [],
});
export function progressTask(
  p: TaskProgress,
  taskId: string,
  step: string,
): TaskProgress {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || p.active !== taskId || !task.steps.includes(step)) return p;
  const done = p.steps[taskId] ?? [];
  if (
    done.includes(step) ||
    (taskId === "parkour" && task.steps[done.length] !== step)
  )
    return p;
  const next = [...done, step],
    complete = task.steps.every((s) => next.includes(s));
  return {
    ...p,
    steps: { ...p.steps, [taskId]: next },
    badges:
      complete && !p.badges.includes(taskId) ? [...p.badges, taskId] : p.badges,
  };
}
