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
async function walk(page, x, z, tolerance = 0.9) {
  for (let i = 0; i < 55; i++) {
    const p = await position(page);
    if (i % 15 === 0) console.log("walk", x, z, p);
    if (Math.hypot(p.x - x, p.z - z) < tolerance) return;
    const dx = x - p.x,
      dz = z - p.z;
    const keys = [];
    if (Math.abs(dx) > Math.min(0.4, tolerance / 2))
      keys.push(dx > 0 ? "d" : "a");
    if (Math.abs(dz) > Math.min(0.4, tolerance / 2))
      keys.push(dz > 0 ? "s" : "w");
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
  // Exercise the real low-quality control for deterministic software-WebGL traversal.
  // Default rendering is still covered by initial load, outfit preview and touch tests.
  await page.getByRole("button", { name: "暂停游戏", exact: true }).click();
  await page
    .getByRole("button", { name: "开启低画质（更流畅）", exact: true })
    .click();
  await page.getByRole("button", { name: "继续游戏 →", exact: true }).click();
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
  const questions = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("qianqian-forest-v1")).questionSet
        .questions,
  );
  const wrong = questions[0].options.find((n) => n !== questions[0].answer);
  await page.getByRole("button", { name: String(wrong), exact: true }).click();
  await expect(page.locator(".hint")).toContainText(questions[0].hint);
  for (const q of questions)
    await page
      .getByRole("button", { name: String(q.answer), exact: true })
      .click();
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
  if (await page.getByRole("dialog").count())
    await page.getByRole("button", { name: "关闭", exact: true }).click();
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

test("V3.1 real bundled dialogue playback, captions, mute, pause and saved controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__voices = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      window.__voices.push(this);
      return play.apply(this, args);
    };
  });
  await start(page);
  await page.keyboard.press("e");
  await expect(page.getByRole("dialog")).toHaveAccessibleName("动物对话");
  await expect(page.locator(".subtitle")).toContainText("主角");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__voices.some((a) => a.currentTime > 0.15 && !a.paused),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "询问线索", exact: false }).click();
  await expect(page.locator(".subtitle")).toContainText("探险的提示");
  await page.getByRole("button", { name: "跳过这句" }).click();
  await expect(page.locator(".subtitle")).toContainText("小兔子");
  await expect(page.locator(".subtitle")).toContainText("木头");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__voices.some(
          (a) => a.currentSrc.includes("animal-0-clue") && a.currentTime > 0.15,
        ),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "静音所有声音" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__voices.every((a) => a.paused)))
    .toBe(true);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "暂停游戏", exact: true }).click();
  const pauseDialog = page.getByRole("dialog");
  await pauseDialog
    .getByRole("button", { name: "开启音效", exact: true })
    .click();
  const slider = page.getByRole("slider", { name: "对白音量" });
  await slider.focus();
  await slider.press("Home");
  for (let i = 0; i < 6; i++) await slider.press("ArrowRight");
  await expect(slider).toHaveValue("0.3");
  await page.getByRole("button", { name: "试听对白", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__voices.some(
          (a) =>
            !a.paused &&
            a.currentTime > 0.1 &&
            Math.abs(a.volume - 0.3) < 0.001,
        ),
      ),
    )
    .toBe(true);
  await pauseDialog
    .getByRole("button", { name: "静音音效", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.__voices.every((a) => a.paused)))
    .toBe(true);
  const before = await position(page);
  await page.keyboard.down("w");
  await page.waitForTimeout(400);
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

test("V3.1 eight colors, six outfits, palette preview and refresh", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "自定义角色" }).click();
  await expect(page.locator(".outfits button")).toHaveCount(6);
  await expect(page.getByRole("button", { name: /衣服颜色/ })).toHaveCount(8);
  await page.getByRole("button", { name: "兔耳连帽装", exact: false }).click();
  await page.getByRole("button", { name: "星光梦境", exact: false }).click();
  await expect(page.locator(".avatar-preview canvas")).toBeVisible();
  await page.screenshot({ path: "/tmp/forest-v31-avatar.png", fullPage: true });
  await page.getByRole("button", { name: "保存，返回森林 →" }).click();
  await page.reload();
  await start(page);
  const s = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("qianqian-forest-v1")),
  );
  expect(s.appearance).toMatchObject({
    outfit: "bunny",
    shirt: "#9857ce",
    pants: "#453b6a",
  });
});

test("V3.1 animal side quest is playable, persists and earns one badge", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "选择任务", exact: true }).click();
  await page
    .locator(".quest-grid article")
    .filter({ hasText: "森林好朋友" })
    .getByRole("button")
    .click();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "打个招呼", exact: false }).click();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await walk(page, -2.5, 8, 0.3);
  await page.keyboard.press("e");
  await expect(page.getByRole("dialog")).toContainText("和松鼠聊聊天");
  await page.getByRole("button", { name: "询问线索", exact: false }).click();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "打开背包" }).click();
  await expect(page.locator(".badge-shelf")).toContainText("森林知己");
  await page.reload();
  await start(page);
  const s = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("qianqian-forest-v1")),
  );
  expect(s.tasks.badges).toEqual(["friends"]);
  expect(s.tasks.steps.friends).toHaveLength(2);
  expect(s.woodBlocks).toBe(0);
});

test("V3.1 audio failure has retry and subtitles without blocking play", async ({
  page,
}) => {
  await page.route("**/audio/forest/*.mp3", (route) => route.abort());
  await start(page);
  await page.keyboard.press("e");
  await expect(
    page.getByRole("button", { name: "点此重试声音", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".subtitle")).toContainText("你好");
  await page.getByRole("button", { name: "询问线索", exact: false }).click();
  await page.getByRole("button", { name: "跳过这句" }).click();
  await expect(page.locator(".subtitle")).toContainText("木头");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await walk(page, 0, 11);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("V3.1 Pages subpath serves all bundled voices and permits real playback", async ({
  page,
}) => {
  const base = "http://127.0.0.1:4174/giggle-wiggle-learner/";
  await page.goto(base);
  await page.getByRole("button", { name: "创建角色，开始冒险 →" }).click();
  await page.getByRole("button", { name: "准备好了，出发 →" }).click();
  for (const id of [
    "hero-hello",
    "hero-clue",
    "hero-thanks",
    ...Array.from({ length: 6 }, (_, i) => `animal-${i}-hello`),
    ...Array.from({ length: 6 }, (_, i) => `animal-${i}-clue`),
  ]) {
    const response = await page.request.get(
      base + "audio/forest/" + id + ".mp3",
    );
    expect(response.ok()).toBe(true);
    expect((await response.body()).length).toBeGreaterThan(1000);
  }
  await page.keyboard.press("e");
  await expect(page.getByRole("dialog")).toHaveAccessibleName("动物对话");
  await expect(page.locator(".voice-status")).toHaveText("正在说话…");
});

test("V3.1 exploration flags are real spatial interactions and persist", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "选择任务", exact: true }).click();
  await page
    .locator(".quest-grid article")
    .filter({ hasText: "森林发现家" })
    .getByRole("button")
    .click();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  // Complete the locations out of list order: the tracker must suggest the
  // first unfinished step, not use the number of completed steps as an index.
  await walk(page, 0, 0, 0.4);
  await walk(page, 0, -9, 0.4);
  await walk(page, 0, -16, 0.4);
  await page.keyboard.press("e");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("qianqian-forest-v1")).tasks.steps
            .explore ?? [],
      ),
    )
    .toContain("amber-grove");
  await expect(page.locator(".tracked-task small")).toContainText("桥边安全点");
  await walk(page, 0, -9, 0.4);
  await walk(page, -4.8, -8.5, 0.4);
  await page.keyboard.press("e");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("qianqian-forest-v1")).tasks.steps
            .explore ?? [],
      ),
    )
    .toContain("treehouse");
  await expect(page.locator(".tracked-task small")).toContainText("桥边安全点");
  await walk(page, 0, -9, 0.4);
  await walk(page, 0, 0, 0.4);
  await walk(page, 2, 0, 0.4);
  await page.keyboard.press("e");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("qianqian-forest-v1")).tasks.badges,
      ),
    )
    .toContain("explore");

  await page.getByRole("button", { name: "选择任务", exact: true }).click();
  await expect(
    page.locator(".quest-grid article").filter({ hasText: "森林发现家" }),
  ).toContainText("3/3");
});

test("V3.1 parkour physically jumps onto three stumps before the finish flag", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "选择任务", exact: true }).click();
  await page
    .locator(".quest-grid article")
    .filter({ hasText: "木桩小勇士" })
    .getByRole("button")
    .click();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await walk(page, 0, 22);
  await walk(page, 3.8, 22, 0.18);
  console.log("course start", await position(page));
  for (const [i, z, retry] of [
    [0, 20.5, true],
    [0, 20.5, false],
    [1, 19, false],
    [2, 17.5, false],
  ]) {
    await expect(page.getByTestId("world")).toHaveAttribute(
      "data-grounded",
      "true",
    );
    // Release the real movement input in the same browser event loop as the position
    // update, avoiding CDP round-trip overshoot on software-rendered CI GPUs.
    // This observes rendered position only; it never changes physics or save state.
    await page.evaluate((target) => {
      const world = document.querySelector("[data-testid=world]");
      const observer = new MutationObserver(() => {
        if (Number(world.dataset.z) <= target + 0.15) {
          window.dispatchEvent(
            new KeyboardEvent("keyup", {
              code: "KeyW",
              key: "w",
              bubbles: true,
            }),
          );
          observer.disconnect();
        }
      });
      observer.observe(world, {
        attributes: true,
        attributeFilter: ["data-z"],
      });
      setTimeout(() => observer.disconnect(), 5000);
    }, z);
    await page.keyboard.down("w");
    await page.keyboard.press("Space");
    await expect
      .poll(async () => (await position(page)).z, {
        intervals: [40],
        timeout: 5000,
      })
      .toBeLessThan(z + 0.15);
    await page.keyboard.up("w");
    console.log("jump landing", i, await position(page));
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              JSON.parse(localStorage.getItem("qianqian-forest-v1")).tasks.steps
                .parkour ?? [],
          ),
        { timeout: 6000 },
      )
      .toContain(`stump-${i + 1}`);
    if (retry) {
      await page.keyboard.down("a");
      await expect
        .poll(
          () =>
            page.evaluate(
              () =>
                JSON.parse(localStorage.getItem("qianqian-forest-v1")).tasks
                  .steps.parkour ?? [],
            ),
          { timeout: 6000 },
        )
        .toHaveLength(0);
      await page.keyboard.up("a");
      await expect(page.locator(".toast")).toContainText("回到木桩起点");
      await walk(page, 3.8, 22, 0.18);
    }
  }
  await walk(page, 3.8, 16);
  await page.keyboard.press("e");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("qianqian-forest-v1")).tasks.badges,
      ),
    )
    .toContain("parkour");
});
