export const CHAMPIONS = {
  ahri: {
    name: "Ahri",
    title: "THE NINE-TAILED FOX",
    role: "MAGE · SUSTAIN · MOBILITY",
    color: 0x78e4d6,
    sigil: "✧",
    hp: 110,
    speed: 7.4,
    damage: 17,
    passive: "Essence Theft",
    description:
      "Dance between danger and desire. Harvest essence to heal as your returning orb tears through the veil.",
    skills: ["Orb of Deception", "Fox-Fire", "Charm", "Spirit Rush"],
    cooldowns: [3.5, 7, 8, 20],
  },
  yasuo: {
    name: "Yasuo",
    title: "THE UNFORGIVEN",
    role: "MELEE · CRITICAL · DEFENSE",
    color: 0xa3c4ff,
    sigil: "≋",
    hp: 140,
    speed: 8,
    damage: 23,
    passive: "Way of the Wanderer",
    description:
      "Become the storm. Chain steel strikes into a tornado, turn aside projectiles, and strike from the wind.",
    skills: ["Steel Tempest", "Wind Wall", "Sweeping Blade", "Last Breath"],
    cooldowns: [2.4, 10, 5, 22],
  },
  jinx: {
    name: "Jinx",
    title: "THE LOOSE CANNON",
    role: "RANGED · EXPLOSIVES · CHAOS",
    color: 0xe9a2ed,
    sigil: "✶",
    hp: 100,
    speed: 7.2,
    damage: 14,
    passive: "Get Excited!",
    description:
      "Leave a trail of beautiful destruction. Swap to rockets, lay explosive traps, and let the mayhem spread.",
    skills: ["Switcheroo!", "Zap!", "Flame Chompers!", "Super Mega Rocket"],
    cooldowns: [5, 5, 9, 23],
  },
};
export const UPGRADES = [
  {
    id: "power",
    name: "Cruel Intent",
    desc: "+25% damage to attacks and abilities.",
    icon: "⚔",
    apply: (p) => (p.power *= 1.25),
  },
  {
    id: "haste",
    name: "Borrowed Time",
    desc: "Abilities recharge 18% faster.",
    icon: "◷",
    apply: (p) => (p.haste *= 0.82),
  },
  {
    id: "vitality",
    name: "Undying Heart",
    desc: "+30 maximum health. Restore 45 health.",
    icon: "♡",
    apply: (p) => {
      p.maxHp += 30;
      p.hp = Math.min(p.maxHp, p.hp + 45);
    },
  },
  {
    id: "frost",
    name: "Winter’s Embrace",
    desc: "Every hit slows enemies by 35% for 2 seconds.",
    icon: "❄",
    apply: (p) => (p.frost = true),
  },
  {
    id: "chain",
    name: "Stormbound",
    desc: "Hits arc to a nearby enemy for 30% damage.",
    icon: "ϟ",
    apply: (p) => (p.chain = true),
  },
  {
    id: "vamp",
    name: "Crimson Pact",
    desc: "Restore 3 health with every enemy defeated.",
    icon: "♦",
    apply: (p) => (p.vamp = (p.vamp || 0) + 3),
  },
  {
    id: "nova",
    name: "Aftershock",
    desc: "Every dash erupts for 45 damage around you.",
    icon: "◎",
    apply: (p) => (p.nova = (p.nova || 0) + 45),
  },
  {
    id: "crit",
    name: "Fate’s Edge",
    desc: "+20% critical chance. Critical hits deal double damage.",
    icon: "✦",
    apply: (p) => (p.crit += 0.2),
  },
  {
    id: "speed",
    name: "Fleet of Foot",
    desc: "+15% movement speed. Dashes recharge 20% faster.",
    icon: "➶",
    apply: (p) => {
      p.speed *= 1.15;
      p.dashHaste *= 0.8;
    },
  },
  {
    id: "echo",
    name: "Echoes of Power",
    desc: "Q evolves: wider area and 50% more damage.",
    icon: "◈",
    apply: (p) => (p.echo = (p.echo || 1) * 1.5),
  },
  {
    id: "armor",
    name: "Veil of Stone",
    desc: "Reduce incoming damage by 20%.",
    icon: "⬡",
    apply: (p) => (p.armor *= 0.8),
  },
  {
    id: "eruption",
    name: "Ashes to Ashes",
    desc: "Slain enemies explode for 25 damage.",
    icon: "☄",
    apply: (p) => (p.eruption = (p.eruption || 0) + 25),
  },
];
export function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function createPlayer(id, meta = 0) {
  const c = CHAMPIONS[id];
  return {
    id,
    hp: c.hp + meta * 5,
    maxHp: c.hp + meta * 5,
    speed: c.speed,
    power: 1,
    haste: 1,
    dashHaste: 1,
    crit: id === "yasuo" ? 0.2 : 0.05,
    armor: 1,
    cooldowns: [0, 0, 0, 0],
    dashCd: 0,
    attackCd: 0,
    invuln: 0,
    kills: 0,
    gold: 0,
    buffs: [],
    stacks: 0,
  };
}
export function choices(random, player) {
  return UPGRADES.filter(
    (u) => !["frost", "chain"].includes(u.id) || !player[u.id],
  )
    .map((u) => ({ u, r: random() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, 3)
    .map((x) => x.u);
}
export function roomPlan(room, random) {
  const boss = room === 4 || room === 8;
  return {
    boss,
    count: boss ? 1 : 5 + room * 2,
    theme: room > 4 ? "ember" : "garden",
    enemies: boss
      ? [room === 8 ? "warden" : "sentinel"]
      : Array.from({ length: 5 + room * 2 }, () => {
          const r = random();
          return r < 0.22
            ? "archer"
            : r < 0.4
              ? "brute"
              : r < 0.55 && room > 2
                ? "charger"
                : "wraith";
        }),
  };
}
export function damageAfterArmor(amount, armor) {
  return Math.max(1, amount * armor);
}
export function loadSave(storage) {
  try {
    const s = JSON.parse(storage.getItem("hades-league-save"));
    return {
      embers: Math.max(0, Number(s?.embers) || 0),
      rank: Math.min(10, Math.max(0, Number(s?.rank) || 0)),
      wins: Number(s?.wins) || 0,
      best: Number(s?.best) || 0,
    };
  } catch {
    return { embers: 0, rank: 0, wins: 0, best: 0 };
  }
}
