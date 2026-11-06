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

test("expanded forest: real pickaxe equipment, permanent ore, second bridge and cottage", async ({
  page,
}) => {
  test.setTimeout(420000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-map-width",
    "80",
  );
  await page.keyboard.press("b");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "青晶工具镐 ×1" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "收起工具镐", exact: true }).click();
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-pickaxe",
    "false",
  );
  await page.getByRole("button", { name: "探险背包 ×1" }).click();
  await page.getByRole("button", { name: "收起背包", exact: true }).click();
  await page.getByRole("button", { name: "继续探索 →" }).click();
  await page.keyboard.press("f");
  await expect(page.locator(".toast")).toContainText("先打开背包");
  await page.reload();
  await start(page);
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-pickaxe",
    "false",
  );
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-backpack",
    "false",
  );
  await page.keyboard.press("b");
  await page.getByRole("button", { name: "装备工具镐", exact: true }).click();
  await page.getByRole("button", { name: "探险背包 ×1" }).click();
  await page.getByRole("button", { name: "装备背包", exact: true }).click();
  await expect(page.locator(".avatar-preview")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page
    .getByRole("heading", { name: "我的冒险背包" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "docs/images/forest-v32-inventory.png" });
  await page.getByRole("button", { name: "继续探索 →" }).click();
  await page.getByRole("button", { name: "暂停游戏", exact: true }).click();
  await page
    .getByRole("button", { name: "开启低画质（更流畅）", exact: true })
    .click();
  await page.getByRole("button", { name: "继续游戏 →", exact: true }).click();
  await walk(page, 0, 26);
  await walk(page, 24, 26);
  await walk(page, 24, 25);
  await page.keyboard.press("f");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("qianqian-forest-v1")).mined.length,
      ),
    )
    .toBe(1);
  await page.keyboard.press("f");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("qianqian-forest-v1")).mined.length,
      ),
    )
    .toBe(1);
  console.log("mined expansion ore at", await position(page));
  await page.screenshot({ path: "docs/images/forest-v32-meadow.png" });
  await walk(page, 24, 1);
  await walk(page, 24, -9);
  await page.screenshot({ path: "docs/images/forest-v32-riverside.png" });
  await walk(page, 27, -12);
  await walk(page, 27, -17);
  await expect.poll(async () => (await position(page)).z).toBeLessThan(-15);
  console.log("entered cottage", await position(page));
  await page.reload();
  await start(page);
  await page.keyboard.press("b");
  await expect(page.getByTestId("item-quartz")).toHaveText("1");
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-pickaxe",
    "true",
  );
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-backpack",
    "true",
  );
  expect(errors).toEqual([]);
});
test("touch equipment buttons and inventory remain usable in portrait and landscape", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await start(page);
  await page.getByRole("button", { name: "挥动工具镐", exact: true }).tap();
  await expect(page.locator(".toast")).toContainText("靠近金色琥珀");
  await page.getByRole("button", { name: "快捷背包", exact: true }).tap();
  await page.getByRole("button", { name: "收起工具镐", exact: true }).tap();
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-pickaxe",
    "false",
  );
  await page.getByRole("button", { name: "装备工具镐", exact: true }).tap();
  await page.getByRole("button", { name: "继续探索 →" }).tap();
  await page.screenshot({ path: "docs/images/forest-v32-mobile.png" });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "快捷背包", exact: true }).tap();
  await page.getByRole("button", { name: "探险背包 ×1" }).tap();
  await page.getByRole("button", { name: "收起背包", exact: true }).tap();
  await expect(page.getByTestId("world")).toHaveAttribute(
    "data-backpack",
    "false",
  );
  await page.getByRole("button", { name: "继续探索 →" }).tap();
  await expect(page.getByTestId("joystick")).toBeVisible();
  await context.close();
});
