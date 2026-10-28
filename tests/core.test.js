import test from "node:test";
import assert from "node:assert/strict";
import {
  CHAMPIONS,
  UPGRADES,
  createPlayer,
  choices,
  rng,
  roomPlan,
  damageAfterArmor,
  loadSave,
} from "../src/core.js";
test("every champion has a complete usable kit", () => {
  for (const id of Object.keys(CHAMPIONS)) {
    const c = CHAMPIONS[id],
      p = createPlayer(id, 2);
    assert.equal(c.skills.length, 4);
    assert.equal(p.maxHp, c.hp + 10);
    assert.ok(c.cooldowns.every((v) => v > 0));
    assert.equal(p.hp, p.maxHp);
  }
});
test("seeded campaigns reproduce encounters and reward choices", () => {
  const a = rng(42),
    b = rng(42);
  for (let i = 1; i <= 8; i++) assert.deepEqual(roomPlan(i, a), roomPlan(i, b));
  assert.deepEqual(
    choices(a, createPlayer("ahri")),
    choices(b, createPlayer("ahri")),
  );
});
test("campaign contains two bosses and escalating rooms", () => {
  const r = rng(1);
  assert.equal(roomPlan(4, r).enemies[0], "sentinel");
  assert.equal(roomPlan(8, r).enemies[0], "warden");
  assert.ok(roomPlan(7, r).count > roomPlan(1, r).count);
  assert.equal(roomPlan(5, r).theme, "ember");
});
test("every upgrade applies without invalidating player stats", () => {
  const p = createPlayer("yasuo");
  for (const u of UPGRADES) u.apply(p);
  assert.ok(p.power > 1);
  assert.ok(p.hp <= p.maxHp);
  assert.ok(p.haste > 0);
  assert.ok(p.chain && p.frost);
  assert.ok(p.armor < 1);
});
test("unique effects are excluded after acquisition", () => {
  const p = createPlayer("jinx");
  p.chain = p.frost = true;
  for (let i = 0; i < 100; i++) {
    const c = choices(rng(i), p);
    assert.equal(c.length, 3);
    assert.equal(new Set(c.map((u) => u.id)).size, 3);
    assert.ok(c.every((u) => !["chain", "frost"].includes(u.id)));
  }
});
test("damage reduction preserves a positive damage floor", () => {
  assert.equal(damageAfterArmor(20, 0.8), 16);
  assert.equal(damageAfterArmor(1, 0.1), 1);
});
test("corrupt saves recover safely", () => {
  assert.deepEqual(loadSave({ getItem: () => "{bad" }), {
    embers: 0,
    rank: 0,
    wins: 0,
    best: 0,
  });
  assert.equal(
    loadSave({ getItem: () => '{"rank":99,"embers":-20}' }).rank,
    10,
  );
  assert.equal(
    loadSave({ getItem: () => '{"rank":99,"embers":-20}' }).embers,
    0,
  );
});
