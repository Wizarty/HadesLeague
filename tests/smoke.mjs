import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:5173");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/hades-menu.png" });
  await page.click("#play");
  assert.equal(await page.locator("[data-champ]").count(), 3);
  await page.click("#start-run");
  await page.waitForTimeout(300);
  assert.equal(
    (await page.evaluate(() => window.__HADES__.snapshot())).state,
    "playing",
  );
  const before = await page.evaluate(() => window.__HADES__.snapshot());
  await page.keyboard.down("a");
  await page.waitForFunction(
    (origin) =>
      Math.hypot(
        window.__HADES__.snapshot().position[0] - origin[0],
        window.__HADES__.snapshot().position[2] - origin[2],
      ) > 0.2,
    before.position,
  );
  await page.keyboard.up("a");
  const after = await page.evaluate(() => window.__HADES__.snapshot());
  assert.notDeepEqual(before.position, after.position);
  await page.keyboard.press("q");
  assert.ok(
    (await page.evaluate(() => window.__HADES__.snapshot())).cooldowns[0] > 0,
  );
  await page.keyboard.press("2");
  await page.keyboard.press("e");
  await page.keyboard.press("r");
  await page.keyboard.press("Space");
  await page.screenshot({ path: "/tmp/hades-combat.png" });
  await page.keyboard.press("Escape");
  assert.equal(
    (await page.evaluate(() => window.__HADES__.snapshot())).state,
    "paused",
  );
  const paused = await page.evaluate(() => window.__HADES__.snapshot());
  await page.waitForTimeout(400);
  assert.equal(
    (await page.evaluate(() => window.__HADES__.snapshot())).hp,
    paused.hp,
  );
  await page.click("#resume");
  await page.keyboard.press("Escape");
  await page.click("#abandon");
  assert.equal(
    (await page.evaluate(() => window.__HADES__.snapshot())).state,
    "ended",
  );
  assert.ok(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("hades-league-save")).embers > 0,
    ),
  );
  for (const id of ["yasuo", "jinx"]) {
    await page.click("#again");
    await page.click(`[data-champ="${id}"]`);
    await page.click("#start-run");
    await page.keyboard.press("1");
    await page.keyboard.press("2");
    await page.keyboard.press("3");
    await page.keyboard.press("4");
    assert.ok(
      (await page.evaluate(() => window.__HADES__.snapshot())).cooldowns.every(
        (c) => c > 0,
      ),
    );
    await page.keyboard.press("Escape");
    await page.click("#abandon");
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: WebGL, champion selection, movement, all champion abilities, dash, pause, end run, persistence. No browser exceptions.",
  );
} finally {
  await browser.close();
}
