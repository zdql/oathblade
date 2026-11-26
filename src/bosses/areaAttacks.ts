import type { BossMove, BossVisualId } from './types';

function makeAreaMove(
  id: string,
  name: string,
  minPhase: 1 | 2,
  windup: number,
  damageMul: number,
  tellLabel: string,
  shape: 'ring' | 'zones' | 'lanes' | 'cross',
  visual: NonNullable<BossMove['steps'][0]['areaAttack']>['visual'],
  color: string,
  secondaryColor: string,
  count: number,
  radius: number
): BossMove {
  return {
    id,
    name,
    minPhase,
    weight: 2.35,
    steps: [
      {
        windup,
        active: 0.42,
        recovery: 0.62,
        side: 'center',
        damageMul,
        hitboxRadius: radius,
        lungeSpeed: 40,
        knockback: 310,
        parryable: true,
        areaAttack: {
          shape,
          visual,
          color,
          secondaryColor,
          count,
          radius,
        },
        tellLabel,
      },
    ],
  };
}

/**
 * 3 unique, signature Area Attacks for EVERY ONE of the 10 bosses (30 total!).
 * Each renders with its own bespoke 20-frame multi-stage pixel animation on the arena floor.
 */
export const BOSS_UNIQUE_AREA_MOVES: Record<BossVisualId, BossMove[]> = {
  // TIER 1: BRAMBLEBACK
  troll: [
    makeAreaMove('bb_root_eruption', 'Bramble Root Eruption', 1, 0.85, 1.15, 'AREA: ROOT ERUPTION!', 'lanes', 'root_eruption', '#8bc34a', '#4e342e', 3, 66),
    makeAreaMove('bb_quake_ring', 'Earthshaker Ring', 1, 0.88, 1.25, 'AREA: QUAKE SHOCKWAVE!', 'ring', 'shockwave_ring', '#a1887f', '#dce775', 1, 175),
    makeAreaMove('bb_boulder_rain', 'Canopy Boulder Barrage', 2, 0.82, 1.3, 'AREA: BOULDER BARRAGE!', 'zones', 'boulder_barrage', '#8d6e63', '#c5e1a5', 4, 72),
  ],

  // TIER 2: VEXIS
  stalker: [
    makeAreaMove('vx_venom_pools', 'Venom Mire Pools', 1, 0.78, 1.15, 'AREA: VENOM POOLS!', 'zones', 'venom_pools', '#76ff03', '#00695c', 4, 70),
    makeAreaMove('vx_briar_cross', 'Bogfang Cross-Lash', 1, 0.76, 1.25, 'AREA: CROSS-LASH!', 'cross', 'briar_lash_cross', '#b2ff59', '#1de9b6', 2, 62),
    makeAreaMove('vx_marsh_geyser', 'Sunken Mire Geysers', 2, 0.74, 1.35, 'AREA: MIRE GEYSERS!', 'zones', 'marsh_geyser', '#64ffda', '#76ff03', 5, 68),
  ],

  // TIER 3: IRONJAW
  ogre_knight: [
    makeAreaMove('ij_gilded_fissure', 'Gilded Quake Fissures', 1, 0.84, 1.25, 'AREA: GILDED FISSURE!', 'lanes', 'gilded_fissure', '#ffd54f', '#8d6e3f', 3, 68),
    makeAreaMove('ij_flail_cyclone', 'Siege Flail Cyclone', 1, 0.8, 1.3, 'AREA: FLAIL CYCLONE!', 'ring', 'flail_cyclone', '#cfd8dc', '#ffd54f', 1, 185),
    makeAreaMove('ij_pillar_collapse', 'Ruin Pillar Collapse', 2, 0.78, 1.4, 'AREA: FALLING PILLARS!', 'zones', 'pillar_collapse', '#ffe082', '#5d4037', 5, 74),
  ],

  // TIER 4: SKARRATH
  wyvern: [
    makeAreaMove('sk_magma_wave', 'Obsidian Magma Wave', 1, 0.78, 1.25, 'AREA: MAGMA WAVE!', 'lanes', 'magma_wave', '#ff6d00', '#ffd54f', 3, 72),
    makeAreaMove('sk_cinder_meteors', 'Volcanic Cinder Meteors', 1, 0.76, 1.35, 'AREA: CINDER METEORS!', 'zones', 'cinder_meteors', '#ff3d00', '#ffab00', 5, 74),
    makeAreaMove('sk_wing_lanes', 'Wyvern Gale Shear', 2, 0.72, 1.4, 'AREA: GALE SHEAR!', 'cross', 'wing_storm_lanes', '#ff9100', '#e040fb', 2, 66),
  ],

  // TIER 5: MALAKOR
  sovereign: [
    makeAreaMove('mk_crimson_cross', 'Ashen Judgment Cross', 1, 0.74, 1.35, 'AREA: CRIMSON CROSS!', 'cross', 'crimson_cross_slash', '#ff1744', '#ffffff', 2, 68),
    makeAreaMove('mk_ashen_pillars', 'Citadel Ash Pillars', 1, 0.76, 1.3, 'AREA: ASH PILLARS!', 'zones', 'ashen_pillars', '#ff5252', '#ff8a80', 5, 72),
    makeAreaMove('mk_blade_ring', 'Sovereign Steel Nova', 2, 0.72, 1.45, 'AREA: STEEL NOVA!', 'ring', 'blade_ring_burst', '#ff1744', '#ffd54f', 1, 195),
  ],

  // TIER 6: FROSTMAW
  behemoth: [
    makeAreaMove('fm_glacier_spikes', 'Permafrost Spike Lanes', 1, 0.78, 1.3, 'AREA: GLACIER SPIKES!', 'lanes', 'glacier_spikes', '#00e5ff', '#e0f7fa', 3, 72),
    makeAreaMove('fm_blizzard_ring', 'Absolute Zero Ring', 1, 0.8, 1.35, 'AREA: BLIZZARD RING!', 'ring', 'blizzard_ring', '#80deea', '#ffffff', 1, 195),
    makeAreaMove('fm_icicle_rain', 'Shattering Icicle Rain', 2, 0.74, 1.45, 'AREA: ICICLE RAIN!', 'zones', 'icicle_rain', '#4fc3f7', '#ffffff', 5, 74),
  ],

  // TIER 7: NYXARA
  valkyrie: [
    makeAreaMove('nx_starlight_beams', 'Astral Lance Beams', 1, 0.72, 1.35, 'AREA: ASTRAL BEAMS!', 'lanes', 'starlight_beams', '#ffd54f', '#d1c4e9', 3, 70),
    makeAreaMove('nx_halo_nova', 'Celestial Halo Nova', 1, 0.74, 1.4, 'AREA: HALO NOVA!', 'ring', 'halo_nova', '#e1bee7', '#ffd54f', 1, 198),
    makeAreaMove('nx_lance_rain', 'Valkyrie Spear Volley', 2, 0.7, 1.48, 'AREA: SPEAR VOLLEY!', 'zones', 'lance_rain', '#ffd740', '#b388ff', 6, 72),
  ],

  // TIER 8: VAELKOR
  titan: [
    makeAreaMove('vk_eclipse_cross', 'Eternal Eclipse Cross', 1, 0.72, 1.4, 'AREA: ECLIPSE CROSS!', 'cross', 'eclipse_cross', '#ffab00', '#ff1744', 2, 72),
    makeAreaMove('vk_solar_flares', 'Solar Flare Eruptions', 1, 0.74, 1.45, 'AREA: SOLAR FLARES!', 'zones', 'solar_flares', '#ffd740', '#ff3d00', 6, 76),
    makeAreaMove('vk_cataclysm_ring', 'Eclipse Cataclysm Ring', 2, 0.7, 1.55, 'AREA: CATACLYSM RING!', 'ring', 'cataclysm_ring', '#ffab00', '#ffffff', 1, 210),
  ],

  // TIER 9: KAELTHAS
  colossus: [
    makeAreaMove('kt_thunder_strikes', 'Sky-Bolt Thunder Strikes', 1, 0.72, 1.4, 'AREA: THUNDER STRIKES!', 'zones', 'thunder_strikes', '#00e5ff', '#ffea00', 6, 74),
    makeAreaMove('kt_storm_ring', 'Tempest Shockwave Ring', 1, 0.74, 1.45, 'AREA: STORM RING!', 'ring', 'storm_ring', '#00e5ff', '#ffffff', 1, 205),
    makeAreaMove('kt_arc_lanes', 'Lightning Arc Lanes', 2, 0.7, 1.52, 'AREA: LIGHTNING LANES!', 'lanes', 'arc_lanes', '#80deea', '#ffea00', 3, 74),
  ],

  // TIER 10: AURELION
  eternal: [
    makeAreaMove('au_dawn_cross', 'Golden Dawn Cross', 1, 0.7, 1.45, 'AREA: DAWN CROSS!', 'cross', 'dawn_cross', '#ffd740', '#ffffff', 2, 74),
    makeAreaMove('au_oath_rain', 'Rain of Eternal Blades', 1, 0.72, 1.5, 'AREA: BLADE RAIN!', 'zones', 'oath_blades_rain', '#fff59d', '#00e5ff', 6, 76),
    makeAreaMove('au_sovereign_nova', 'Imperial Oath Nova', 2, 0.68, 1.6, 'AREA: IMPERIAL NOVA!', 'ring', 'sovereign_nova', '#ffd740', '#00e5ff', 1, 215),
  ],
};
