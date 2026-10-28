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
    viewport: { width: 1000, height: 750 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    (process.env.GAME_URL || "http://127.0.0.1:5173/") + "?test=1",
  );
  await page.click("#play");
  await page.click("#start-run");
  const layouts = await page.evaluate(() => {
    const step = () => window.__HADES_TEST__.step(0.02),
      snapshot = () => window.__HADES__.snapshot();
    const emit = (type, key, code, shiftKey = false) =>
      window.dispatchEvent(
        new KeyboardEvent(type, { key, code, shiftKey, bubbles: true }),
      );
    step();
    const results = [];
    for (const [code, key] of [
      ["KeyW", "ц"],
      ["KeyA", "ф"],
      ["KeyS", "ы"],
      ["KeyD", "в"],
    ]) {
      const before = snapshot().position;
      emit("keydown", key, code);
      for (let i = 0; i < 6; i++) step();
      const moved = snapshot().position;
      // The user changes keyboard language while holding the same physical key.
      emit("keyup", code.slice(-1).toLowerCase(), code);
      for (let i = 0; i < 6; i++) step();
      results.push({ code, before, moved, released: snapshot().position });
    }
    emit("keydown", "Ц", "KeyW", true);
    step();
    emit("keyup", "w", "KeyW");
    const beforeAbilities = [...snapshot().cooldowns];
    for (let i = 1; i <= 4; i++) {
      emit("keydown", ["!", '"', "№", ";"][i - 1], `Digit${i}`, true);
      emit("keyup", String(i), `Digit${i}`);
    }
    return { results, beforeAbilities, afterAbilities: snapshot().cooldowns };
  });
  for (const r of layouts.results) {
    assert.notDeepEqual(
      r.before,
      r.moved,
      `${r.code} should work with Russian key values`,
    );
    assert.deepEqual(
      r.moved,
      r.released,
      `${r.code} should release after a layout switch`,
    );
  }
  assert.ok(
    layouts.beforeAbilities.every((v) => v === 0),
    "Shift+W should move, not cast",
  );
  assert.ok(
    layouts.afterAbilities.every((v) => v > 0),
    "Physical number row should cast even with shifted nonnumeric characters",
  );
  await page.keyboard.press("Escape");
  await page.click("#abandon");
  await page.click("#again");
  await page.click("#start-run");
  await page.evaluate(() => window.__HADES_TEST__.step(0.02));
  const initial = await page.evaluate(() => window.__HADES__.snapshot().camera);
  await page.mouse.move(500, 400);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(720, 450, { steps: 8 });
  await page.mouse.up({ button: "right" });
  const rotated = await page.evaluate(() => window.__HADES__.snapshot().camera);
  assert.notEqual(initial.yaw, rotated.yaw);
  assert.notEqual(initial.pitch, rotated.pitch);
  assert.equal(rotated.dragging, false);
  await page.mouse.wheel(0, -150);
  await page.waitForFunction(
    (d) => window.__HADES__.snapshot().camera.distance < d,
    rotated.distance,
  );
  await page.waitForTimeout(1200);
  const projection = await page.evaluate(() => {
    const api = window.__HADES__,
      p = api.snapshot().position,
      start = api.project(p[0], p[2]);
    dispatchEvent(new KeyboardEvent("keydown", { key: "ц", code: "KeyW" }));
    for (let i = 0; i < 10; i++) window.__HADES_TEST__.step(0.02);
    dispatchEvent(new KeyboardEvent("keyup", { key: "ц", code: "KeyW" }));
    const end = api.snapshot().position;
    return { start, end: api.project(end[0], end[2]) };
  });
  assert.ok(
    projection.end.y < projection.start.y,
    "W should move up the screen after rotating the camera",
  );
  assert.ok(
    Math.abs(projection.end.x - projection.start.x) < 3,
    "Forward movement should stay aligned with the rotated camera",
  );
  await page.mouse.down({ button: "right" });
  await page.keyboard.press("Escape");
  assert.equal(
    (await page.evaluate(() => window.__HADES__.snapshot())).camera.dragging,
    false,
    "Pause releases camera drag",
  );
  await page.click("#abandon");
  await page.click("#again");
  await page.click('[data-champ="jinx"]');
  await page.click("#start-run");
  const numpad = await page.evaluate(() => {
    for (let i = 1; i <= 4; i++) {
      dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", code: `Numpad${i}` }),
      );
      dispatchEvent(
        new KeyboardEvent("keyup", { key: "End", code: `Numpad${i}` }),
      );
    }
    return window.__HADES__.snapshot().cooldowns;
  });
  assert.ok(
    numpad.every((v) => v > 0),
    "Numpad physical keys should cast regardless of NumLock",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Russian WASD, layout-switch release, Shift+W movement, shifted number abilities, numpad, mouse orbit/tilt/zoom, camera-relative movement, pause drag cleanup.",
  );
} finally {
  await browser.close();
}
