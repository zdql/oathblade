# Oathblade: Gauntlet of Five

A **Legend of Zelda × Mike Tyson's Punch-Out!!** fantasy swordplay roguelite built in TypeScript + HTML5 Canvas with an **isolated, DOM-free physics engine**.

## Quick Start

```bash
npm install
npm run dev
```

Open the local Vite URL (default `http://localhost:5173`).

Run tests & build:

```bash
npm test
npm run build
```

## Controls

- **`W A S D`** — Walk along the fantasy trail; strafe and position in combat arenas
- **`K`** — Quick Strike (fast startup, combo starter, interrupts taunts)
- **`J`** — Strong Cleave (heavy damage & poise break)
- **`L` (neutral)** — Steel Parry (deflect incoming blows for massive stagger & Counter Window)
- **`L` + `W A S D`** — Directional Evade Roll (i-frames + Perfect Evade Counter Window)
- **`F1`** — Toggle the live **Physics Lab** (hitbox/hurtbox overlay + real-time physics sliders)

## The 5 Successive Monster Bosses

Each boss rolls procedural **% attribute variance** and **Fantasy Traits** every run:

1. **Tier 1 — Brambleback, The Mossbound Troll** (*Emerald Forest Trail*): Heavy club sweeps, overhead smash, and punishable roar taunt.
2. **Tier 2 — Vexis, The Bogfang Stalker** (*Sunken Bogfang Marsh*): Fast claw rushes, leaping pounces, and Punch-Out!! feint-step lunges.
3. **Tier 3 — Ironjaw, The Gilded Ogre-Knight** (*Gilded Ruin Courtyard*): Armored tower-shield guard that must be shattered via Parries or Guard-Break combos, plus 3-hit flail chains.
4. **Tier 4 — Skarrath, The Obsidian Wyvern-Drake** (*Obsidian Wyvern Gorge*): Soaring aerial dives (parry to ground it!), snap-jaw double bites, and wide tail whips.
5. **Tier 5 — Malakor, The Ashen Sovereign** (*Ashen Sovereign Citadel*): Grandmaster dark-blade duelist with lightning quick-draws, deceptive delayed cleaves, and Phase II Crimson Execution chains.

## Architecture & Isolated Physics Engine

- **`src/physics/`** — Standalone, zero-DOM, zero-Canvas 2.5D physics engine:
  - `config.ts`: Single source of truth for all movement, dodge, parry, hitstop, knockback, and gravity constants.
  - `world.ts`: Fixed-timestep `PhysicsWorld` with arena clamping, soft separation, hitbox/hurtbox resolution, and hitstop.
  - `combatPhysics.ts` & `math.ts`: Pure vector math, parry/dodge resolution, lunge & knockback impulses.
- **`src/combos/`** — Extensible `ComboEngine` with 8 built-in martial combos plus an in-game **Custom Combo Forge** to craft and save your own sequences.
- **`src/bosses/`** — 5 boss templates + seeded procedural generator rolling % attribute variance and traits.
- **`src/game/`** — Overworld path state, combat state machine, roguelite Gold/XP Sanctuary progression, input buffer, and particle/slash effects.
- **`src/render/`** — 2.5D perspective depth projection, 5 parallax fantasy biomes, and articulated layered 2D sprites.
- **`src/audio/`** — Procedural Web Audio API sound effects.
