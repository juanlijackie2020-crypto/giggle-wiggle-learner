import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const level = JSON.parse(
  readFileSync(new URL("../../src/data/level2.json", import.meta.url)),
);
const key = "qianqian-forest-v1";
const cellPosition = (c) => [(c % 7) * 6 - 18, 18 - Math.floor(c / 7) * 6];
function route(a, b) {
  const q = [[a]],
    seen = new Set([a]);
  while (q.length) {
    const path = q.shift(),
      c = path.at(-1);
    if (c === b) return path;
    for (const edge of level.maze.edges) {
      if (!edge.includes(c)) continue;
      const n = edge[0] === c ? edge[1] : edge[0];
      if (!seen.has(n)) {
        seen.add(n);
        q.push([...path, n]);
      }
    }
  }
  throw Error("unreachable");
}
const saved = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
const position = (page) =>
  page.getByTestId("desert-world").evaluate((el) => ({
    x: +el.dataset.x,
    y: +el.dataset.y,
    z: +el.dataset.z,
  }));
async function start(page, url = "/?level=2") {
  await page.goto(url);
  if (
    await page.getByRole("button", { name: "家长 UAT：直接体验第二关" }).count()
  ) {
    await page
      .getByRole("button", { name: "家长 UAT：直接体验第二关" })
      .click();
    await page
      .getByRole("button", { name: "我是家长，进入第二关测试" })
      .click();
  } else if (await page.getByRole("dialog", { name: "选择冒险关卡" }).count())
    await page.getByRole("button", { name: /第二关 · 沙漠神殿/ }).click();
  await page.getByRole("button", { name: "进入沙漠冒险 →" }).click();
  await expect(page.getByTestId("desert-world")).toHaveAttribute(
    "data-grounded",
    "true",
  );
}
async function walk(page, x, z, tolerance = 0.45) {
  for (let i = 0; i < 65; i++) {
    const p = await position(page),
      dx = x - p.x,
      dz = z - p.z;
    if (Math.hypot(dx, dz) < tolerance) return;
    const keys = [];
    if (Math.abs(dx) > Math.min(0.15, tolerance / 3))
      keys.push(dx > 0 ? "d" : "a");
    if (Math.abs(dz) > Math.min(0.15, tolerance / 3))
      keys.push(dz > 0 ? "s" : "w");
    for (const k of keys) await page.keyboard.down(k);
    await page.waitForTimeout(
      Math.min(650, Math.max(75, ((Math.hypot(dx, dz) - 0.15) / 5.5) * 1000)),
    );
    for (const k of keys) await page.keyboard.up(k);
    await page.waitForTimeout(80);
  }
  throw Error(
    `Cannot walk to ${x},${z}; actual ${JSON.stringify(await position(page))}`,
  );
}
async function close(page) {
  await page.getByRole("button", { name: "关闭窗口", exact: true }).click();
}
async function travel(page, from, to) {
  const path = route(from, to);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      p = cellPosition(a),
      q = cellPosition(b);
    if (
      [a, b].sort((a, b) => a - b).join() === level.looseEdge.join() &&
      !(await saved(page)).desert.broken
    ) {
      const dx = (q[0] - p[0]) / 6,
        dz = (q[1] - p[1]) / 6;
      await walk(page, p[0] + dx * 1.5, p[1] + dz * 1.5, 0.2);
      await expect(page.getByTestId("desert-world")).toHaveAttribute(
        "data-near",
        "sandstone",
      );
      await page.keyboard.press("f");
      await expect(page.getByTestId("desert-world")).toHaveAttribute(
        "data-broken",
        "true",
      );
    }
    await walk(page, ...q);
  }
}
test("second level: real maze route, pickaxe, three tablets, retries, chest and independent saves", async ({
  page,
}) => {
  test.setTimeout(600000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  expect((await saved(page)).everCompleted).toBe(false);
  await page.getByRole("button", { name: "自定义角色" }).click();
  await page.getByRole("button", { name: "兔耳连帽装", exact: true }).click();
  await page
    .getByRole("button", { name: "衣服颜色 #f59bc1", exact: true })
    .click();
  await close(page);
  await page.screenshot({ path: "docs/images/desert-v33-oasis.png" });
  await page.getByRole("button", { name: "暂停游戏" }).click();
  await page.getByRole("checkbox", { name: "省电画质" }).check();
  await close(page);
  const y = (await position(page)).y;
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await position(page)).y)
    .toBeGreaterThan(y + 0.2);
  await expect(page.getByTestId("desert-world")).toHaveAttribute(
    "data-grounded",
    "true",
  );
  await walk(page, 0, 24);
  await walk(page, 0, 18);
  let cell = 3;
  for (const t of level.tablets) {
    await travel(page, cell, t.cell);
    cell = t.cell;
    await expect(page.getByTestId("desert-world")).toHaveAttribute(
      "data-near",
      t.id,
    );
    await page.keyboard.press("e");
    await expect
      .poll(async () => (await saved(page)).desert.tablets.includes(t.id))
      .toBe(true);
    console.log("collected", t.id, await position(page));
  }
  await page.screenshot({ path: "docs/images/desert-v33-maze.png" });
  await travel(page, cell, 45);
  await walk(page, 0, -24.3, 0.15);
  await expect(page.getByTestId("desert-world")).toHaveAttribute(
    "data-near",
    "gate",
  );
  await page.keyboard.press("e");
  await expect(page.getByTestId("desert-world")).toHaveAttribute(
    "data-gate",
    "true",
  );
  await walk(page, 0, -34);
  await page.keyboard.press("e");
  await expect(
    page.getByRole("dialog", { name: "神殿的数字机关" }),
  ).toBeVisible();
  let s = await saved(page);
  const first = s.desert.questionSet.questions[0],
    wrong = first.options.find((n) => n !== first.answer);
  await page.getByRole("button", { name: String(wrong), exact: true }).click();
  await page.getByRole("button", { name: String(wrong), exact: true }).click();
  await expect(page.locator(".number-blocks")).toHaveCount(2);
  expect((await saved(page)).desert.stats[first.id].hintCount).toBe(2);
  await page.screenshot({ path: "docs/images/desert-v33-math.png" });
  await page.reload();
  await page
    .getByRole("button", { name: "第二关 · 沙漠神殿大迷宫", exact: false })
    .click();
  await page.getByRole("button", { name: "进入沙漠冒险 →" }).click();
  await expect(page.getByTestId("desert-world")).toHaveAttribute(
    "data-grounded",
    "true",
  );
  s = await saved(page);
  expect(s.desert.questionSet.questions[0]).toEqual(first);
  expect(s.desert.tablets).toHaveLength(3);
  expect(s.appearance.outfit).toBe("bunny");
  await walk(page, 0, -34);
  await page.keyboard.press("e");
  for (const q of s.desert.questionSet.questions) {
    await expect(page.getByTestId("desert-question")).toHaveText(q.text);
    await page
      .getByRole("button", { name: String(q.answer), exact: true })
      .click();
  }
  await page.getByRole("button", { name: "打开神殿宝箱" }).click();
  await expect
    .poll(async () => (await saved(page)).desert.claims)
    .toEqual(["level-2:gold-key:v1"]);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "docs/images/desert-v33-temple.png" });
  await page.keyboard.press("b");
  await expect(page.getByTestId("item-gold-key")).toHaveText("1");
  await close(page);
  const claimed = await saved(page);
  expect(claimed.desert.stats[first.id]).toMatchObject({
    firstTryCorrect: false,
    attemptCount: 3,
  });
  expect(claimed.woodBlocks).toBe(0);
  await page.getByRole("button", { name: "暂停游戏" }).click();
  await page
    .getByRole("button", { name: "重新挑战第二关", exact: true })
    .click();
  await page.getByRole("button", { name: "确认重新挑战第二关" }).click();
  await expect
    .poll(async () => (await saved(page)).desert.tablets.length)
    .toBe(0);
  s = await saved(page);
  expect(s.desert.claims).toEqual(["level-2:gold-key:v1"]);
  expect(s.questionSet).toEqual(claimed.questionSet);
  expect(s.desert.questionSet.setId).not.toBe(claimed.desert.questionSet.setId);
  await page.getByRole("button", { name: "关卡", exact: true }).click();
  await page.getByRole("button", { name: /第一关 · 森林/ }).click();
  await page.getByRole("button", { name: "创建角色，开始冒险 →" }).click();
  await page.getByRole("button", { name: "准备好了，出发 →" }).click();
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-grounded",
    "true",
  );
  expect((await saved(page)).desert.claims).toEqual(["level-2:gold-key:v1"]);
  expect(errors).toEqual([]);
  console.log(
    "desert complete physical route; draws",
    await page.getByTestId("world").getAttribute("data-drawcalls"),
  );
});

test("gate collision, animal speech, guide, optional steps, map and cross-tab pause", async ({
  page,
  context,
}) => {
  test.setTimeout(300000);
  await page.addInitScript(() => {
    window.__voices = [];
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      this.addEventListener(
        "playing",
        () => window.__voices.push(this.currentSrc),
        { once: true },
      );
      return original.call(this);
    };
  });
  await start(page);
  await page.getByRole("button", { name: "暂停游戏" }).click();
  await page.getByRole("checkbox", { name: "省电画质" }).check();
  await close(page);
  await page.getByRole("button", { name: "选择任务" }).click();
  await page
    .locator(".desert-task-list article")
    .filter({ hasText: "沙漠交朋友" })
    .getByRole("button")
    .click();
  await close(page);
  await walk(page, -3, 29);
  await page.keyboard.press("e");
  await expect(
    page.getByRole("dialog", { name: "和骆驼阿沙聊天" }),
  ).toBeVisible();
  const played = [];
  await page.evaluate(() => {
    window.__voices = [];
  });
  await page.getByRole("button", { name: "你好！交个朋友" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__voices.length), { timeout: 25000 })
    .toBeGreaterThanOrEqual(2);
  played.push(...(await page.evaluate(() => window.__voices)));
  expect(played.some((s) => s.includes("hero-hello.mp3"))).toBe(true);
  expect(played.some((s) => s.includes("camel-hello.mp3"))).toBe(true);
  expect((await saved(page)).desert.steps.friends).toEqual(["camel"]);
  await page.getByRole("button", { name: "请阿沙带路" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 30000 });
  await expect
    .poll(() => page.getByTestId("desert-world").getAttribute("data-paused"))
    .toBe("false");
  await expect
    .poll(
      async () =>
        +(await page.getByTestId("desert-world").getAttribute("data-camel-z")),
    )
    .toBeLessThan(28);
  await walk(page, 4, 24);
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "你好！交个朋友" }).click();
  await close(page);
  expect((await saved(page)).desert.badges).toEqual(["friends"]);
  await walk(page, 25, 24);
  await walk(page, 25, -24);
  await walk(page, 0, -24);
  await page.keyboard.press("e");
  await expect(page.locator(".desert-toast")).toContainText("还差 3");
  await page.keyboard.down("w");
  await page.waitForTimeout(1500);
  await page.keyboard.up("w");
  expect((await position(page)).z).toBeGreaterThan(-26);
  expect((await saved(page)).desert.gate).toBe(false);
  await page.getByRole("button", { name: "打开探索地图" }).click();
  await expect(
    page.getByRole("dialog", { name: "我的迷宫探险图" }),
  ).toBeVisible();
  await close(page);
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "进入沙漠冒险 →" }).click();
  await other.getByRole("button", { name: "自定义角色" }).click();
  await other.getByRole("button", { name: "工匠背带装", exact: true }).click();
  await expect(
    page.getByRole("alertdialog", { name: "其他标签页更新了存档" }),
  ).toBeVisible();
  await other.close();
});

test("touch movement, jump, camera, responsive bag, and GitHub Pages subpath assets", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page, "http://127.0.0.1:4174/giggle-wiggle-learner/?level=2");
  const before = await position(page),
    stick = page.getByTestId("joystick"),
    box = await stick.boundingBox();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: box.x + box.width / 2, y: box.y + box.height / 2 - 30, id: 1 },
    ],
  });
  await page.waitForTimeout(1000);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => (await position(page)).z)
    .toBeLessThan(before.z - 0.5);
  await page.getByRole("button", { name: "跳跃", exact: true }).tap();
  await expect.poll(async () => (await position(page)).y).toBeGreaterThan(0.9);
  await page.screenshot({ path: "docs/images/desert-v33-mobile.png" });
  await page.getByRole("button", { name: "打开背包" }).tap();
  await expect(page.getByRole("button", { name: "神殿石板 ×0" })).toBeVisible();
  await page.getByRole("button", { name: "收藏", exact: true }).tap();
  await expect(page.getByRole("button", { name: "黄金钥匙 ×0" })).toBeVisible();
  await close(page);
  const yaw = await page
    .getByTestId("desert-world")
    .getAttribute("data-camera-yaw");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 220, y: 430, id: 2 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 290, y: 440, id: 2 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.getByTestId("desert-world")).not.toHaveAttribute(
    "data-camera-yaw",
    yaw,
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    page.getByRole("button", { name: "互动", exact: true }),
  ).toBeInViewport();
  await expect(page.getByTestId("joystick")).toBeInViewport();
  await page.screenshot({ path: "docs/images/desert-v33-landscape.png" });
  const response = await page.request.get(
    "http://127.0.0.1:4174/giggle-wiggle-learner/audio/desert/camel-hello.mp3",
  );
  expect(response.ok()).toBe(true);
  expect((await response.body()).length).toBeGreaterThan(2000);
  expect(errors).toEqual([]);
  await context.close();
});

test("desert WebGL context loss retries without discarding progress", async ({
  page,
}) => {
  await start(page);
  const original = await saved(page);
  console.log(
    "desert oasis draw calls",
    await page.getByTestId("desert-world").getAttribute("data-drawcalls"),
  );
  const lost = await page
    .getByTestId("desert-world")
    .locator("canvas")
    .evaluate((canvas) => {
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      const ext = gl?.getExtension("WEBGL_lose_context");
      if (!ext) return false;
      ext.loseContext();
      return true;
    });
  expect(lost).toBe(true);
  await expect(
    page.getByRole("dialog", { name: "场景启动遇到问题" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "重新加载第二关" }).click();
  await expect(page.getByTestId("desert-world")).toHaveAttribute(
    "data-grounded",
    "true",
  );
  await expect(
    page.getByRole("dialog", { name: "场景启动遇到问题" }),
  ).toHaveCount(0);
  await expect(page.locator(".loading-in-world")).toHaveCount(0);
  const before = await position(page);
  await page.keyboard.down("w");
  await page.waitForTimeout(1200);
  await page.keyboard.up("w");
  await expect
    .poll(async () => (await position(page)).z)
    .toBeLessThan(before.z - 0.1);
  expect((await saved(page)).desert.questionSet).toEqual(
    original.desert.questionSet,
  );
});

test("cross-level inventory paginates every earned item without overflow", async ({
  page,
}) => {
  const forestTasks = JSON.parse(
    readFileSync(new URL("../../src/data/tasks.json", import.meta.url)),
  );
  await page.addInitScript(
    ({ ids, key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          rewardClaims: ["forest-amber:wood-blocks:v1"],
          tasks: { badges: ids },
          activeLevel: 2,
          desert: {
            claims: ["level-2:gold-key:v1"],
            badges: ["friends", "discover", "tracks"],
          },
        }),
      );
    },
    { ids: forestTasks.map((t) => t.id), key },
  );
  await start(page);
  await page.getByRole("button", { name: "打开背包" }).click();
  await expect(page.locator(".pack-grid button")).toHaveCount(12);
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(page.locator(".pack-grid button")).toHaveCount(3);
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await expect(page.locator(".pack-grid button")).toHaveCount(7);
  await expect(page.getByTestId("item-gold-key")).toHaveText("1");
  await page.getByText("我的徽章墙 · 6 枚", { exact: true }).click();
  await expect(page.locator(".badge-wall li")).toHaveCount(6);
});
