# Design and evidence

## Reference boundary

The requested REA companion is a guidance-only skill in this session. No REA analysis server, Hades II installation, gameplay capture, or executable was available. No reverse engineering of a shipped game occurred. Exact Hades II damage formulas, timings, AI, animation graphs, level generator, and progression rules were not verified or reproduced.

The design uses general action-roguelike conventions and familiar champion ability identities. These public official pages are useful reference pointers, not evidence of runtime inspection or pages retrieved during implementation:

- https://www.supergiantgames.com/games/hades-ii/
- https://www.leagueoflegends.com/en-us/champions/ahri/
- https://www.leagueoflegends.com/en-us/champions/yasuo/
- https://www.leagueoflegends.com/en-us/champions/jinx/

All numeric tuning, geometry, animation, AI, encounters, and implementation in this repository are original. This release is a short arena campaign, not a recreation of the commercial game's content volume.

## Systems

- **State flow:** title → champion selection → combat → blessing → portal → next chamber → victory/defeat → selection. Pause freezes combat; losing focus pauses automatically.
- **Combat:** mouse-to-ground raycast aiming; screen-relative movement; cooldown-gated attacks; dash invulnerability; critical hits; armor; projectile collision, piercing, returning and homing; area damage and stuns. W ability has alternate bindings to preserve WASD.
- **Champions:** three complete adapted passive/Q/W/E/R kits. Each starts fully equipped. Soul rank adds five maximum health per rank, capped at ten ranks.
- **Enemy AI:** pursuing wraiths, slow heavy attackers, distance-keeping archers, and telegraphed chargers. Guardians mix targeted ground attacks, radial projectiles, and close-range slams, gain speed below half health, and summon adds.
- **Campaign:** eight chambers, guardians at four/eight; procedurally selected enemy compositions, spawn angles, cover positions, and upgrade choices. Shared arena shell with two visual biomes. Enemy count and health scale with chamber; damage and environmental hazards escalate.
- **Builds:** twelve blessing types; unique effects are excluded after acquisition. Effects can stack across systems: explosions spread frost and chain damage, lifesteal restores health on kills, cooldown builds amplify evolved Q abilities.
- **Presentation:** original procedural geometry, shaded tiles, crystalline torches, forest ruins, dynamic particles, damage numbers, attack warning discs, animated movement, screen shake, synthesized sound, and a typographic menu/HUD. The style is intentionally low-poly.
- **Persistence:** validated localStorage reads recover from malformed data; writes fail gracefully if storage is unavailable. Embers and soul rank persist; active combat does not.
- **Performance:** merged static meshes, bounded pixel ratio, short-lived effect cleanup, no texture downloads, and shared materials. Hardware performance needs measurement on the intended devices; software-rendered test browser timings are not representative of GPU play.

## Validation boundaries

Unit tests cover kit data, reproducible procedural choices, chamber progression, all blessings, reward exclusions, armor, and corrupt saves. Real-browser smoke tests exercise rendering and UI/input paths. The campaign bot uses regular abilities and attacks without changing health, damage, or enemy state; its development-only stepping interface accelerates time to exercise the complete campaign.

Original art and synthesized effects require no proprietary assets. Inter and Cormorant Garamond are bundled from Fontsource with their upstream font licenses in the installed packages. Three.js, Vite, Playwright, and Prettier retain their upstream licenses.
