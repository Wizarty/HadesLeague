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
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173/?test=1");
await page.click("#play");
await page.click("#start-run");
const result = await page.evaluate(() => {
  const api = window.__HADES_TEST__,
    inspect = window.__HADES__.snapshot;
  let frames = 0,
    rooms = [],
    lastRoom = 0;
  for (; frames < 90000; frames++) {
    const s = inspect();
    if (s.state === "ended") break;
    if (s.room !== lastRoom) {
      rooms.push({ room: s.room, hp: s.hp });
      lastRoom = s.room;
    }
    if (s.state === "reward") {
      const cards = [...document.querySelectorAll("[data-upgrade]")];
      const priority = [
        "Crimson Pact",
        "Cruel Intent",
        "Stormbound",
        "Ashes to Ashes",
        "Undying Heart",
        "Borrowed Time",
      ];
      cards.sort((a, b) => {
        const rank = (e) => {
          const i = priority.findIndex((x) => e.textContent.includes(x));
          return i < 0 ? 99 : i;
        };
        return rank(a) - rank(b);
      });
      cards[0].click();
      continue;
    }
    const [x, , z] = s.position;
    let mx = 0,
      mz = 0,
      target = s.targets.sort(
        (a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z),
      )[0];
    if (s.portal) {
      mx = -x;
      mz = -12 - z;
    } else if (target) {
      const d = Math.hypot(target.x - x, target.z - z),
        a = Math.atan2(z, x) + 0.03;
      const radius = 8;
      mx = Math.cos(a) * radius - x;
      mz = Math.sin(a) * radius - z;
      if (d < 3) {
        mx += (x - target.x) * 0.7;
        mz += (z - target.z) * 0.7;
      }
      if (d > 10) {
        mx += (target.x - x) * 0.4;
        mz += (target.z - z) * 0.4;
      }
    }
    const sx = mx - mz,
      sy = mx + mz,
      keys = [];
    if (sx > 0.15) keys.push("d");
    if (sx < -0.15) keys.push("a");
    if (sy > 0.15) keys.push("s");
    if (sy < -0.15) keys.push("w");
    api.controls(target?.x || 0, target?.z || 0, keys, !!target);
    if (target) {
      if (frames % 15 === 0) {
        api.cast(0);
        api.cast(1);
        api.cast(2);
        if (Math.hypot(target.x - x, target.z - z) < 7) api.cast(3);
      }
      if (frames % 90 === 0) api.dash();
    }
    api.step(1 / 60);
  }
  return {
    snapshot: inspect(),
    frames,
    rooms,
    text: document.querySelector("#modal-content").textContent,
  };
});
console.log(JSON.stringify(result, null, 2));
await page.screenshot({ path: "/tmp/hades-campaign.png" });
await page.click('#again');
await page.click('#start-run');
const defeat = await page.evaluate(() => {
  const api = window.__HADES_TEST__;
  api.controls(0,0,[],false);
  for(let frame=0;frame<36000 && window.__HADES__.snapshot().state==='playing';frame++) api.step(1/60);
  return {state:window.__HADES__.snapshot().state,hp:window.__HADES__.snapshot().hp,text:document.querySelector('#modal-content').textContent};
});
await browser.close();
assert.equal(defeat.state,'ended');
assert.equal(defeat.hp,0);
assert.ok(defeat.text.includes('Return to the veil.'));
console.log('PASS: natural combat death, defeat screen, and retry after victory.');
assert.deepEqual(errors, []);
assert.ok(
  result.text.includes("A legend reborn."),
  "The input-driven bot should complete the campaign",
);
