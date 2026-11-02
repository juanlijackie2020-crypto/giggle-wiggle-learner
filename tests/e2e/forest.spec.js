import { test, expect } from "@playwright/test";
async function start(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "创建角色，开始冒险 →" }).click();
  await page.getByRole("button", { name: "准备好了，出发 →" }).click();
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-grounded",
    "true",
  );
}
const position = async (page) =>
  page
    .getByTestId("world")
    .evaluate((e) => ({ x: +e.dataset.x, y: +e.dataset.y, z: +e.dataset.z }));
async function walk(page, x, z) {
  for (let i = 0; i < 55; i++) {
    const p = await position(page);
    if (i % 15 === 0) console.log("walk", x, z, p);
    if (Math.hypot(p.x - x, p.z - z) < 0.9) return;
    const dx = x - p.x,
      dz = z - p.z;
    const keys = [];
    if (Math.abs(dx) > 0.4) keys.push(dx > 0 ? "d" : "a");
    if (Math.abs(dz) > 0.4) keys.push(dz > 0 ? "s" : "w");
    for (const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(
      Math.min(800, Math.max(110, ((Math.hypot(dx, dz) - 0.4) / 4.2) * 1000)),
    );
    for (const key of keys) await page.keyboard.up(key);
  }
  throw new Error(
    `Cannot reach ${x},${z}; at ${JSON.stringify(await position(page))}`,
  );
}
test("desktop: actual 3D movement, collect, cross bridge, retry maths, reward and reload", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await page.getByRole("button", { name: "自定义角色" }).click();
  await page.getByRole("button", { name: "肤色 3", exact: true }).click();
  await page.getByRole("button", { name: "衣服颜色 2", exact: true }).click();
  await page.getByRole("button", { name: "森林游侠", exact: false }).click();
  await page.getByRole("button", { name: "保存，返回森林 →" }).click();
  await page.waitForTimeout(300);
  const y = (await position(page)).y;
  await page.evaluate(() => {
    window.__jumpPeak = 0;
    new MutationObserver(() => {
      window.__jumpPeak = Math.max(
        window.__jumpPeak,
        +document.querySelector("[data-testid=world]").dataset.y,
      );
    }).observe(document.querySelector("[data-testid=world]"), {
      attributes: true,
      attributeFilter: ["data-y"],
    });
  });
  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => window.__jumpPeak))
    .toBeGreaterThan(y + 0.3);
  await page.waitForTimeout(1000);
  for (const [x, z, count] of [
    [-3, 11, 1],
    [3, 7, 2],
    [-2, 3, 3],
  ]) {
    console.log("collect wood", count);
    await walk(page, x, z);
    await page.keyboard.press("e");
    await expect(page.getByTestId("wood-count")).toContainText(String(count));
  }
  for (const [x, z, count] of [
    [2, 1, 1],
    [-2, -0.2, 2],
  ]) {
    await walk(page, x, z);
    await page.keyboard.press("e");
    await expect(page.getByTestId("amber-count")).toContainText(String(count));
  }
  console.log("crossing bridge");
  await walk(page, 0, 0);
  await walk(page, 0, -8.5);
  for (const [x, z, count] of [
    [1.6, -9, 3],
    [4, -13, 4],
    [-3, -17, 5],
  ]) {
    console.log("collect amber", count);
    await walk(page, x, z);
    await page.keyboard.press("e");
    await expect(page.getByTestId("amber-count")).toContainText(String(count));
  }
  await walk(page, 0, -20);
  await page.keyboard.press("e");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "6", exact: true }).click();
  await expect(page.locator(".hint")).toContainText("一起数一数");
  for (const answer of ["7", "4", "8"])
    await page.getByRole("button", { name: answer, exact: true }).click();
  await page.getByRole("button", { name: "开启宝箱 · ＋10 木头方块" }).click();
  await page.getByRole("button", { name: "打开背包" }).click();
  await expect(page.getByTestId("reward-count")).toHaveText("10");
  await page.reload();
  await start(page);
  await page.getByRole("button", { name: "打开背包" }).click();
  await expect(page.getByTestId("reward-count")).toHaveText("10");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("qianqian-forest-v1")),
  );
  expect(saved.completed).toBe(true);
  expect(saved.appearance.outfit).toBe("ranger");
  expect(saved.wood).toHaveLength(3);
  expect(saved.amber).toHaveLength(5);
  await page.getByRole("button", { name: "继续探索 →" }).click();
  await walk(page, 0, -20);
  await page.keyboard.press("e");
  await expect(page.locator(".toast")).toContainText("已经领取过");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  console.log(
    "desktop draw calls",
    await page.getByTestId("world").getAttribute("data-drawcalls"),
  );
  expect(errors).toEqual([]);
  await page.screenshot({ path: "/tmp/forest-desktop.png", fullPage: true });
});
test("touch viewport: real touch joystick, jump, interact, camera and resize", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await expect(page.getByTestId("joystick")).toBeVisible();
  const p = await position(page);
  const box = await page.getByTestId("joystick").boundingBox();
  const client = await context.newCDPSession(page);
  async function swipe(x, y, dx, dy, hold = 0) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + dx, y: y + dy }],
    });
    if (hold) await page.waitForTimeout(hold);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }
  await swipe(box.x + box.width / 2, box.y + box.height / 2, 0, -37, 650);
  await expect
    .poll(async () => (await position(page)).z)
    .toBeLessThan(p.z - 0.5);
  await page.evaluate(() => {
    window.__jumpPeak = 0;
    new MutationObserver(() => {
      window.__jumpPeak = Math.max(
        window.__jumpPeak,
        +document.querySelector("[data-testid=world]").dataset.y,
      );
    }).observe(document.querySelector("[data-testid=world]"), {
      attributes: true,
      attributeFilter: ["data-y"],
    });
  });
  await page.getByRole("button", { name: "跳跃", exact: true }).tap();
  await expect
    .poll(() => page.evaluate(() => window.__jumpPeak))
    .toBeGreaterThan(p.y + 0.2);
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "互动", exact: true }).tap();
  await expect(page.locator(".toast")).toContainText(/靠近|小兔子/);
  await swipe(290, 370, -120, 0);
  await swipe(290, 370, -120, 0);
  const before = await position(page);
  await swipe(box.x + box.width / 2, box.y + box.height / 2, 0, -37, 650);
  await expect
    .poll(async () => (await position(page)).x)
    .toBeLessThan(before.x - 0.5);
  await page.screenshot({ path: "/tmp/forest-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByTestId("joystick")).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});
test("invalid storage and unavailable WebGL show recoverable UI", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("qianqian-forest-v1", "{broken");
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "重新加载 3D 世界" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("森林暂时没能打开");
});

test("monster contact returns to the safe flag without losing collected wood", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "qianqian-forest-v1",
      JSON.stringify({
        version: 1,
        wood: ["wood-0"],
        amber: [],
        solved: [],
        checkpoint: 0,
      }),
    ),
  );
  await start(page);
  await page.keyboard.down("d");
  await expect(page.locator(".toast")).toContainText("回到安全点");
  await page.keyboard.up("d");
  await expect
    .poll(async () => Math.abs((await position(page)).x))
    .toBeLessThan(1.3);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("qianqian-forest-v1")).wood,
    ),
  ).toEqual(["wood-0"]);
});
test("falling in the river returns to the latest checkpoint and retains materials", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "qianqian-forest-v1",
      JSON.stringify({
        version: 1,
        wood: ["wood-0"],
        amber: [],
        solved: [],
        checkpoint: 1,
      }),
    ),
  );
  await start(page);
  await walk(page, -3.5, 0);
  await page.evaluate(() => {
    window.__minY = 10;
    new MutationObserver(() => {
      window.__minY = Math.min(
        window.__minY,
        +document.querySelector("[data-testid=world]").dataset.y,
      );
    }).observe(document.querySelector("[data-testid=world]"), {
      attributes: true,
      attributeFilter: ["data-y"],
    });
  });
  await page.keyboard.down("w");
  await expect
    .poll(() => page.evaluate(() => window.__minY))
    .toBeLessThan(-0.8);
  await expect(page.locator(".toast")).toContainText("回到安全点");
  await page.keyboard.up("w");
  await expect
    .poll(async () =>
      Math.hypot((await position(page)).x, (await position(page)).z),
    )
    .toBeLessThan(1.3);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("qianqian-forest-v1")).wood,
    ),
  ).toEqual(["wood-0"]);
});
test("production build loads under a GitHub Pages subpath and chest stays locked without materials", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "qianqian-forest-v1",
      JSON.stringify({
        version: 1,
        wood: [],
        amber: [],
        solved: [],
        checkpoint: 2,
      }),
    ),
  );
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4174/giggle-wiggle-learner/");
  await page.getByRole("button", { name: "创建角色，开始冒险 →" }).click();
  await page.getByRole("button", { name: "准备好了，出发 →" }).click();
  await walk(page, 0, -20);
  await page.keyboard.press("e");
  await expect(page.locator(".toast")).toContainText("还差 3 块木头、5 块琥珀");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("a lost WebGL context presents retry and rebuilds the world", async ({
  page,
}) => {
  await start(page);
  await page
    .locator("canvas")
    .evaluate((c) =>
      c.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(page.getByRole("alert")).toContainText("图形上下文已丢失");
  await page.getByRole("button", { name: "重新加载 3D 世界" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-grounded",
    "true",
  );
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".loading-in-world")).toHaveCount(0);
  await page.keyboard.down("w");
  await page.waitForTimeout(600);
  await page.keyboard.up("w");
  await expect.poll(async () => (await position(page)).z).toBeLessThan(13.5);
});

test("blocked browser storage warns without preventing play", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Storage disabled", "SecurityError");
    };
  });
  await start(page);
  await expect(page.getByRole("alert")).toContainText("浏览器无法保存进度");
  await page.keyboard.down("w");
  await page.waitForTimeout(500);
  await page.keyboard.up("w");
  await expect.poll(async () => (await position(page)).z).toBeLessThan(13.5);
});

test("V3 animal clues, sound mute, pause and saved volume controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__tones = 0;
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) {
      window.__tones++;
      return start.apply(this, args);
    };
  });
  await start(page);
  await page.keyboard.press("e");
  await expect(page.locator(".toast")).toContainText("小兔子：");
  await expect
    .poll(() => page.evaluate(() => window.__tones))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "静音音效", exact: true }).click();
  const tones = await page.evaluate(() => window.__tones);
  await page.keyboard.press("e");
  await expect(page.locator(".toast")).toContainText("小兔子：");
  expect(await page.evaluate(() => window.__tones)).toBe(tones);
  await page.getByRole("button", { name: "暂停游戏", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName("暂停游戏");
  const before = await position(page);
  await page.keyboard.down("w");
  await page.waitForTimeout(500);
  await page.keyboard.up("w");
  expect(Math.abs((await position(page)).z - before.z)).toBeLessThan(0.1);
  await page.getByRole("button", { name: "继续游戏 →" }).click();
  await page.reload();
  await start(page);
  await expect(
    page.getByRole("button", { name: "开启音效", exact: true }),
  ).toBeVisible();
});
test("V3 progressive hints, parent-only answers, learning records and reward-preserving restart", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("qianqian-forest-v1"))
      localStorage.setItem(
        "qianqian-forest-v1",
        JSON.stringify({
          version: 1,
          wood: ["wood-0", "wood-1", "wood-2"],
          amber: ["amber-0", "amber-1", "amber-2", "amber-3", "amber-4"],
          solved: [],
          checkpoint: 2,
        }),
      );
  });
  await start(page);
  await walk(page, 0, -20);
  await page.keyboard.press("e");
  await expect(page.locator(".math-dots")).toHaveCount(0);
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByRole("button", { name: "6", exact: true }).click();
  await expect(page.locator(".hint")).toContainText("一起数一数");
  await expect(page.locator(".math-dots")).toHaveCount(0);
  await page.getByRole("button", { name: "5", exact: true }).click();
  await expect(page.locator(".math-dots")).toBeVisible();
  for (const answer of ["7", "4", "8"])
    await page.getByRole("button", { name: answer, exact: true }).click();
  await page.getByRole("button", { name: "开启宝箱 · ＋10 木头方块" }).click();
  await page.getByRole("button", { name: "暂停游戏", exact: true }).click();
  await page.getByRole("button", { name: "家长视图与学习记录" }).click();
  await expect(page.getByRole("table")).toHaveCount(0);
  await page
    .getByRole("button", { name: "我是家长，查看学习记录与参考答案" })
    .click();
  await expect(page.getByRole("table")).toContainText("3 + 4 = 7");
  await expect(page.getByRole("table")).toContainText("重试后完成");
  let data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("qianqian-forest-v1")),
  );
  expect(data.questionStats["add-3-4"]).toMatchObject({
    attemptCount: 3,
    hintCount: 2,
    firstTryCorrect: false,
    correctCount: 1,
  });
  expect(data.questionStats["subtract-9-5"].firstTryCorrect).toBe(true);
  expect(Date.parse(data.questionStats["add-3-4"].completedAt)).toBeGreaterThan(
    0,
  );
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "暂停游戏", exact: true }).click();
  await page
    .getByRole("button", { name: "重新开始第一关", exact: true })
    .click();
  await page.getByRole("button", { name: "确认重新开始" }).click();
  await expect(page.locator(".loading-in-world")).toHaveCount(0);
  await page.getByRole("button", { name: "打开背包" }).click();
  await expect(page.getByTestId("reward-count")).toHaveText("10");
  await page.reload();
  await start(page);
  data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("qianqian-forest-v1")),
  );
  expect(data).toMatchObject({
    completed: false,
    everCompleted: true,
    woodBlocks: 10,
    wood: [],
    amber: [],
    solved: [],
    checkpoint: 0,
  });
  expect(data.rewardClaims).toEqual(["forest-amber:wood-blocks:v1"]);
  expect(data.questionStats["add-3-4"].attemptCount).toBe(3);
  expect(data.questionStats["add-3-4"].runErrors).toBe(0);
});
