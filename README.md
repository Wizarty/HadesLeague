# Hades League — Echoes of the Rift

A complete, compact, single-player 3D arena roguelike for desktop browsers. Choose Ahri, Yasuo, or Jinx and fight through eight chambers, two biomes, seven blessing choices, and two guardians. Runs have a victory ending, defeat/retry loop, and persistent soul upgrades.

## Run

Requires Node.js 20.19+ (validated with Node 24) and a modern browser with WebGL and keyboard/mouse.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. For a production build:

```sh
npm run build
npm run preview
```

The `dist/` directory can be served by any static web host. All geometry, fonts, audio, and code are local; gameplay makes no external requests. No accounts, keys, or backend services are needed.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Screen-relative movement |
| Mouse | Aim |
| Hold left mouse | Basic attack |
| Space | Invulnerable dash |
| Q / 1 | Q ability |
| Shift+W / 2 | W ability (plain W moves) |
| E / 3 | E ability |
| R / 4 | Ultimate |
| Esc / P | Pause / resume |

Clear a chamber, select a blessing, then walk into the glowing gate at the north edge. Red circles mark attacks before they land. Obelisks block movement and ordinary projectiles; piercing abilities pass through. Cinder chambers also erupt beneath your feet. Health partially recovers between chambers. Embers awarded at the end of a run purchase permanent starting health on the champion selection screen.

## Champions

- **Ahri:** Essence Theft heals every third takedown. Orb of Deception travels out and returns, striking again. Fox-Fire seeks nearby enemies. Charm stuns. Spirit Rush grants three dashes with nearby spirit damage; recast during its eight-second window.
- **Yasuo:** Movement builds a protective Flow shield and his base critical chance is higher. Every third Steel Tempest becomes a piercing tornado. Wind Wall destroys nearby enemy projectiles. Sweeping Blade dashes and cuts. Last Breath damages and suspends nearby enemies.
- **Jinx:** Takedowns trigger a movement burst. Switcheroo enables temporary explosive rockets. Zap pierces and stuns. Flame Chompers remain as proximity traps. Super Mega Rocket detonates in a large area.

Twelve repeatable or unique blessing types enable cooldown, critical, healing, chain-lightning, frost, dash-nova, explosion, and Q-evolution builds. Champion kits are streamlined adaptations for this game's encounters, not exact League of Legends implementations.

## Verification

```sh
npm test
# With npm run dev already running, and system Chromium installed:
npm run test:browser
npm run test:campaign
```

Browser tests use `/usr/bin/chromium`; set `CHROMIUM_PATH` to override. Smoke tests check actual WebGL startup, movement, every champion's abilities, dash input, pause, defeat, and save persistence. Campaign testing accelerates the actual game update loop with input-driven combat, upgrade selection, and portal navigation. The automation API exists only in Vite development mode with `?test=1`; it is absent from production builds. Automated combat is evidence of functional completion, not a substitute for broad human balance or hardware testing.

Progress is stored under `hades-league-save` in browser localStorage. Clearing site storage resets it. Runs themselves are not resumed after a reload. Touch-only play, gamepads, multiplayer, and a narrative campaign are outside this release.

## Implementation and references

See [DESIGN.md](DESIGN.md) for systems, reference boundaries, and asset provenance. The scene uses original procedural low-poly meshes, animated transforms, particles, synthesized sound, and locally bundled open-source fonts. Static meshes are batched by material; effects expire and release their geometry/material resources. Device pixel ratio is capped at 1.75.

This is an independent fan project, unaffiliated with Riot Games or Supergiant Games. Champion names and ability identities belong to their respective owners. No commercial-game code, models, textures, audio, or animations were extracted or included.
