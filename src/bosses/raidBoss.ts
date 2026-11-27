import type { BiomeId, BossInstance, BossMove } from './types';

interface RaidFlavor {
  name: string;
  title: string;
  accent: string;
  secondary: string;
  lore: string;
}

const RAID_FLAVOR_BY_BIOME: Record<BiomeId, RaidFlavor> = {
  forest: {
    name: 'Sylvarok',
    title: 'Rift-Crowned Briar Sovereign',
    accent: '#d500f9',
    secondary: '#00e676',
    lore: 'An ancient woodland colossus warped by an Abyssal Rift, clad in runic obsidian bark and emerald starlight.',
  },
  marsh: {
    name: 'Morvath',
    title: 'Abyssal Mire Archon',
    accent: '#e040fb',
    secondary: '#76ff03',
    lore: 'A venomous dread-lord that drags wandering duelists into pocket bog-rifts woven from violet mist.',
  },
  ruins: {
    name: 'Aurexion',
    title: 'Gilded Rift Warlord',
    accent: '#ff4081',
    secondary: '#ffd740',
    lore: 'Forged from shattered temple crowns and void steel, swinging colossal rift-cleavers.',
  },
  gorge: {
    name: 'Pyroklast',
    title: 'Cinder-Veined Dreadwyrm',
    accent: '#ff1744',
    secondary: '#d500f9',
    lore: 'A volcanic apex predator whose scales pulse with violet magma fissures.',
  },
  citadel: {
    name: 'Kaelgorath',
    title: 'Obsidian Oathbreaker',
    accent: '#d500f9',
    secondary: '#ff5252',
    lore: 'An exiled sovereign knight wielding twin void-forged greatswords inside a fractured throne.',
  },
  tundra: {
    name: 'Glaciorex',
    title: 'Permafrost Rift Behemoth',
    accent: '#00e5ff',
    secondary: '#e040fb',
    lore: 'Encased in runic abyssal ice that shatters into lethal crystalline novas.',
  },
  sanctum: {
    name: 'Seraphyne',
    title: 'Astral Rift Valkyrie',
    accent: '#ea80fc',
    secondary: '#ffd740',
    lore: 'A fallen celestial blade-master whose wings trail violet comets.',
  },
  eclipse: {
    name: 'Umbrathor',
    title: 'Null-Sun Titan',
    accent: '#ff1744',
    secondary: '#aa00ff',
    lore: 'A living eclipse that splits the arena floor with twin void-beams.',
  },
  stormpeak: {
    name: 'Voltarion',
    title: 'Tempest Rift Colossus',
    accent: '#00e5ff',
    secondary: '#ffea00',
    lore: 'Crowned in violet lightning spires that detonate across the mountain summit.',
  },
  elysium: {
    name: 'Aethelgard',
    title: 'Eternal Rift Paragon',
    accent: '#ffd740',
    secondary: '#d500f9',
    lore: 'The ultimate reflection of the Gauntlet itself — a transcendent warlord of pure runic steel.',
  },
};

function buildRaidCustomMoves(accent: string, secondary: string): BossMove[] {
  return [
    {
      id: 'raid_rift_cataclysm',
      name: 'Rift Cataclysm',
      minPhase: 1,
      weight: 3.0,
      steps: [
        {
          windup: 0.62,
          active: 0.16,
          recovery: 0.36,
          side: 'center',
          damageMul: 1.25,
          hitboxRadius: 118,
          lungeSpeed: 340,
          knockback: 380,
          parryable: true,
          areaAttack: {
            shape: 'ring',
            visual: 'sovereign_nova',
            color: accent,
            secondaryColor: secondary,
            count: 1,
            radius: 175,
          },
          tellLabel: '⚡ RIFT CATACLYSM! (PARRY / EVADE)',
        },
      ],
    },
    {
      id: 'raid_void_severance',
      name: 'Void Severance',
      minPhase: 1,
      weight: 2.8,
      steps: [
        {
          windup: 0.44,
          active: 0.12,
          recovery: 0.14,
          side: 'left',
          damageMul: 0.85,
          hitboxRadius: 102,
          lungeSpeed: 310,
          knockback: 220,
          parryable: true,
          tellLabel: '⚡ VOID SLASH LEFT!',
        },
        {
          windup: 0.38,
          active: 0.12,
          recovery: 0.16,
          side: 'feint_left_to_right',
          damageMul: 0.95,
          hitboxRadius: 108,
          lungeSpeed: 360,
          knockback: 260,
          parryable: true,
          tellLabel: '⚡ RIFT FEINT RIGHT!',
        },
        {
          windup: 0.56,
          active: 0.16,
          recovery: 0.42,
          side: 'center',
          damageMul: 1.32,
          hitboxRadius: 120,
          lungeSpeed: 400,
          knockback: 420,
          parryable: true,
          areaAttack: {
            shape: 'cross',
            visual: 'eclipse_cross',
            color: accent,
            secondaryColor: '#ffffff',
            count: 2,
            radius: 115,
          },
          tellLabel: '⚡ VOID CROSS FINISHER!',
        },
      ],
    },
    {
      id: 'raid_sovereign_decree',
      name: "Sovereign's Decree",
      minPhase: 1,
      weight: 2.6,
      steps: [
        {
          windup: 0.66,
          active: 0.16,
          recovery: 0.4,
          side: 'aerial',
          damageMul: 1.35,
          hitboxRadius: 112,
          lungeSpeed: 320,
          knockback: 400,
          parryable: false,
          jumpVz: 340,
          areaAttack: {
            shape: 'zones',
            visual: 'ashen_pillars',
            color: accent,
            secondaryColor: secondary,
            count: 4,
            radius: 74,
          },
          tellLabel: '⚡ SOVEREIGN DECREE! (DODGE ZONES)',
        },
      ],
    },
  ];
}

/**
 * Generates an optional Area Raid Boss strictly stronger than the current area's boss,
 * with custom Raid abilities, bespoke obsidian-rift texturing, and high bounties.
 */
export function generateRaidBossInstance(areaBoss: BossInstance): BossInstance {
  const flavor = RAID_FLAVOR_BY_BIOME[areaBoss.template.biome];
  const customMoves = buildRaidCustomMoves(flavor.accent, flavor.secondary);

  return {
    seed: areaBoss.seed ^ 0x5f3759df,
    isRaidBoss: true,
    template: {
      ...areaBoss.template,
      id: `raid_${areaBoss.template.id}`,
      name: flavor.name,
      title: flavor.title,
      fightingStyle: `AREA RAID SOVEREIGN — Rift Cataclysm, Void Severance & Sovereign's Decree`,
      lore: flavor.lore,
      palette: {
        primary: '#1a1026',
        secondary: flavor.secondary,
        accent: flavor.accent,
        eye: '#ffea00',
        weapon: '#e040fb',
      },
      moves: [...customMoves, ...areaBoss.template.moves],
    },
    traits: [
      {
        id: 'raid_overlord',
        name: 'Area Raid Overlord',
        description: '+45% HP, +28% ATK, Custom Rift Abilities',
        badgeColor: '#d500f9',
      },
      ...areaBoss.traits.slice(0, 1),
    ],
    stats: {
      maxHp: Math.round(areaBoss.stats.maxHp * 1.45),
      attackDamage: Math.round(areaBoss.stats.attackDamage * 1.28),
      maxPoise: Math.round(areaBoss.stats.maxPoise * 1.32),
      attackSpeedMul: Number(Math.min(1.75, areaBoss.stats.attackSpeedMul * 1.1).toFixed(2)),
      moveSpeed: Math.round(areaBoss.stats.moveSpeed * 1.08),
      aggression: Number((areaBoss.stats.aggression * 1.15).toFixed(2)),
      goldReward: Math.round(areaBoss.stats.goldReward * 1.6),
      xpReward: Math.round(areaBoss.stats.xpReward * 1.6),
      variancePct: {
        hp: 45,
        damage: 28,
        speed: 10,
        poise: 32,
        aggression: 15,
      },
    },
  };
}
