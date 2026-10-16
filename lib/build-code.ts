import type { ClassTalentData, Talent } from "@/lib/wow-data";

export type RankState = Record<string, number>;

// Build codes are positional: one base36 rank digit per talent, talents
// ordered by tier then col, trees separated by "-". That means ANY change
// to a tree's talent membership or order (add/remove/reshuffle) shifts
// every digit after the change point onto a DIFFERENT talent for anyone
// decoding an old link against the current data -- not just a decode
// failure, a silent wrong-talent assignment. See CURRENT_VERSION below for
// how this is guarded against going forward.
function orderedTalents(classData: ClassTalentData) {
  return classData.trees.map((tree) =>
    [...tree.talents].sort((a, b) => a.tier - b.tier || a.col - b.col)
  );
}

// Bumped whenever a tree-shape change (talent added/removed/reordered
// within a tree) would otherwise corrupt existing codes' positional
// meaning. A versioned code carries one extra leading "-"-separated
// segment (the version number) before the per-tree codes, so
// `code.split("-").length` is `classData.trees.length + 1` for a
// versioned code vs. exactly `classData.trees.length` for a legacy
// (pre-versioning) code -- no new characters needed in the format, just
// one more segment, so codes stay plain base36+"-" and drop safely into
// any URL segment or the OG image route's path with no escaping questions.
const CURRENT_VERSION = 6;

// One base36 digit per talent (max rank is well under 36), trees separated by "-".
export function encodeBuild(classData: ClassTalentData, ranks: RankState): string {
  const body = orderedTalents(classData)
    .map((talents) => talents.map((t) => (ranks[t.id] ?? 0).toString(36)).join(""))
    .join("-");
  return `${CURRENT_VERSION}-${body}`;
}

export function decodeBuild(classData: ClassTalentData, code: string): RankState {
  const segments = code.split("-");
  if (segments.length === classData.trees.length + 1 && /^\d+$/.test(segments[0])) {
    // Version 2 codes predate the 2026-09-24 reshape of 3 trees (see
    // V2_TREE_ORDER below): anything older than CURRENT_VERSION decodes
    // those trees against their frozen v2 order. Current-version codes
    // decode straight against live data.
    const version = parseInt(segments[0], 10);
    if (version < CURRENT_VERSION) {
      // Version 1-2 codes predate the 2026-09-24 reshape (need V2_TREE_ORDER
      // for Paladin Holy/Retribution + Shaman Elemental), the 2026-10-02
      // Druid Feral Combat reshape (V3_TREE_ORDER), AND today's 2026-10-03
      // Warrior Fury/Protection hotfix reshape (V4_TREE_ORDER) -- need all
      // three. Version 3 codes already have the post-09-24 shape for those
      // first 3 trees (so must NOT get V2_TREE_ORDER applied) but still
      // predate both the Druid and Warrior changes, so need V3 + V4. Version
      // 4 codes already have the post-Druid-change shape too, so only need
      // V4_TREE_ORDER for the Warrior trees. Every version below 6 predates
      // the 2026-10-15 reshape (V5_TREE_ORDER). Merged per tree, later wins:
      // V2's Shaman Elemental must override V5's while V5's Shaman
      // Restoration survives.
      const orders =
        version < 3
          ? mergeOrders(V5_TREE_ORDER, V2_TREE_ORDER, V3_TREE_ORDER, V4_TREE_ORDER)
          : version < 4
            ? mergeOrders(V5_TREE_ORDER, V3_TREE_ORDER, V4_TREE_ORDER)
            : version < 5
              ? mergeOrders(V5_TREE_ORDER, V4_TREE_ORDER)
              : V5_TREE_ORDER;
      return repairPrereqs(classData, decodeAgainstFrozenOrders(classData, segments.slice(1), orders));
    }
    return repairPrereqs(classData, decodeVersionedBuild(classData, segments.slice(1)));
  }
  // No recognizable version segment -> a pre-versioning (legacy) code,
  // encoded against whatever the tree shape was before CURRENT_VERSION
  // existed. Decode it against that frozen old shape, then translate.
  return repairPrereqs(classData, decodeLegacyBuild(classData, segments));
}

// A talent's prereq can change (added, removed, or its required rank
// changed) between data syncs -- e.g. Impale gaining a 3-point Deep Wounds
// requirement on 2026-10-08. A previously-valid shared build can decode
// with points in a talent whose prereq is no longer satisfied; those points
// come back to the player as unspent rather than erroring, the same
// backward-compatibility treatment as a removed talent (see
// LEGACY_ID_TRANSLATION above). Processes talents in tier order per tree so
// a prereq invalidated earlier in this same pass correctly cascades to
// anything depending on it.
function repairPrereqs(classData: ClassTalentData, ranks: RankState): RankState {
  for (const talents of orderedTalents(classData)) {
    for (const t of talents) {
      if (!t.prereq) continue;
      const prereqRank = ranks[t.prereq.id] ?? 0;
      if (prereqRank < t.prereq.ranks) delete ranks[t.id];
    }
  }
  return ranks;
}

function decodeVersionedBuild(classData: ClassTalentData, treeCodes: string[]): RankState {
  const ranks: RankState = {};
  const trees = orderedTalents(classData);
  trees.forEach((talents, i) => {
    const treeCode = treeCodes[i] ?? "";
    talents.forEach((t, j) => {
      const char = treeCode[j];
      const rank = char ? parseInt(char, 36) : 0;
      if (Number.isFinite(rank) && rank > 0) {
        ranks[t.id] = Math.min(rank, t.maxRank);
      }
    });
  });
  return ranks;
}

// --- Legacy (pre-2026-09-18 tree shape) decoding --------------------------
//
// The 2026-09-18 data sync reshuffled 4 trees' talent membership/order to
// match the vendor's beta-client pull (see CLAUDE.md's session summary):
// Warrior Protection lost Vitality (Bastion and Focused Rage each moved
// into a vacated slot), Rogue Combat and Warlock Affliction each replaced
// one talent in place (same tier/col, different talent), and Druid Balance
// lost Balance of Nature outright. Every other tree, on every other class,
// is unchanged, so a legacy code only needs a translation for these 4.
//
// LEGACY_TREE_ORDER freezes the exact tier/col-sorted id order those 4
// trees had immediately before this migration existed -- i.e. exactly what
// encodeBuild would have produced for them under the old (unversioned)
// scheme. This must never be edited after the fact; it's a historical
// record, not live data.
const LEGACY_TREE_ORDER: Record<string, Record<string, string[]>> = {
  warrior: {
    Protection: [
      "protection_shield_specialization",
      "protection_anticipation",
      "protection_improved_bloodrage",
      "protection_toughness",
      "protection_improved_thunder_clap",
      "protection_last_stand",
      "protection_master_of_defense",
      "protection_improved_revenge",
      "protection_defiance",
      "protection_improved_sunder_armor",
      "protection_improved_disarm",
      "protection_vanguard",
      "protection_improved_shield_wall",
      "protection_concussion_blow",
      "protection_improved_shield_bash",
      "protection_vitality",
      "protection_focused_rage",
      "protection_bastion",
      "protection_shield_slam",
    ],
  },
  rogue: {
    Combat: [
      "combat_improved_eviscerate",
      "combat_improved_sinister_strike",
      "combat_lightning_reflexes",
      "combat_puncturing_wounds",
      "combat_deflection",
      "combat_precision",
      "combat_endurance",
      "combat_riposte",
      "combat_improved_sprint",
      "combat_improved_kick",
      "combat_restless_blades",
      "combat_dual_wield_specialization",
      "combat_blade_flurry",
      "combat_hack_and_slash",
      "combat_weapon_expertise",
      "combat_aggression",
      "combat_adrenaline_rush",
    ],
  },
  warlock: {
    Affliction: [
      "affliction_improved_life_tap",
      "affliction_suppression",
      "affliction_improved_corruption",
      "affliction_malediction",
      "affliction_soul_harvesting",
      "affliction_improved_drains",
      "affliction_improved_bane_of_agony",
      "affliction_fel_concentration",
      "affliction_amplify_curse",
      "affliction_pandemic",
      "affliction_malevolence",
      "affliction_nightfall",
      "affliction_curse_of_exhaustion",
      "affliction_siphon_life",
      "affliction_soul_siphon",
      "affliction_shadow_mastery",
      "affliction_drain_hope",
    ],
  },
  druid: {
    Balance: [
      "balance_improved_wrath",
      "balance_genesis",
      "balance_moonglow",
      "balance_improved_moonfire",
      "balance_natures_majesty",
      "balance_natures_reach",
      "balance_improved_entangling_roots",
      "balance_natures_splendor",
      "balance_balance_of_nature",
      "balance_insect_swarm",
      "balance_vengeance",
      "balance_improved_starfire",
      "balance_overgrowth",
      "balance_natures_grace",
      "balance_eclipse",
      "balance_moonfury",
      "balance_moonkin_form",
    ],
  },
};

// Old talent id -> current talent id, for the 4 trees above plus the two
// 2026-09-24 removals (see V2_TREE_ORDER below). `null`
// means the talent was removed outright with no replacement (points in it
// are dropped, not reassigned to anything). Ids not listed here are
// unchanged -- same id before and after.
const LEGACY_ID_TRANSLATION: Record<string, string | null> = {
  // Removed 2026-09-24 (see V2_TREE_ORDER below).
  holy_improved_holy_strike: null,
  retribution_crusade: null,
  protection_vitality: null,
  combat_restless_blades: "combat_flawless_execution",
  affliction_drain_hope: "affliction_wrack",
  balance_balance_of_nature: null,
  // Removed 2026-10-02 (see V3_TREE_ORDER below).
  feral_king_of_the_jungle: null,
  // Removed/renamed 2026-10-03 Warrior Fury/Protection hotfix (see
  // V4_TREE_ORDER below). Iron Will moved tree (Fury -> Protection), so its
  // id prefix changes to match; the other three were removed outright.
  fury_iron_will: "protection_iron_will",
  fury_improved_cleave: null,
  fury_boundless_rage: null,
  fury_precision: null,
  protection_toughness: null,
  // Removed 2026-10-15, beta build 70425 (see V5_TREE_ORDER below). Each
  // replacement that took the same slot is a different talent, so points drop.
  shadow_shadow_affinity: null,
  shadow_improved_fade: null,
  elemental_improved_fire_nova: null,
  elemental_call_of_thunder: null,
  fire_wake_of_fire: null,
  affliction_malediction: null,
};

// --- v2 tree shape (2026-09-18 .. 2026-09-24) ---------------------------------
//
// The 2026-09-24 data sync changed 3 more trees' shape: Paladin Holy lost
// Improved Holy Strike (its effect became baseline), Paladin Retribution
// lost Crusade, and Shaman Elemental swapped Elemental Fury (row 3 -> 6) and
// Elemental Alacrity (row 6 -> 3), which reorders every talent between them.
// (Druid Feral Combat's Mangle -> Primal Bite and Primal Fury -> Blood Frenzy
// are same-slot renames, so positional decoding is unaffected -- no entry.)
//
// V2_TREE_ORDER freezes each of those trees' tier/col-sorted id order as it
// stood at CURRENT_VERSION 2. Like LEGACY_TREE_ORDER, never edit after the
// fact. It is used for BOTH version-2 codes and unversioned (pre-v2) codes:
// those 3 trees were unchanged between the pre-v2 shape and v2, so one
// frozen order covers both.
const V2_TREE_ORDER: Record<string, Record<string, string[]>> = {
  paladin: {
    Holy: [
      "holy_improved_holy_strike",
      "holy_divine_strength",
      "holy_divine_intellect",
      "holy_healing_light",
      "holy_spiritual_focus",
      "holy_improved_seals",
      "holy_unyielding_faith",
      "holy_voice_of_truth",
      "holy_reverence",
      "holy_purifying_power",
      "holy_infusion_of_light",
      "holy_illumination",
      "holy_divine_favor",
      "holy_divine_precision",
      "holy_holy_shock",
      "holy_consecrated_ground",
      "holy_holy_power",
      "holy_lights_vigil",
    ],
    Retribution: [
      "retribution_deflection",
      "retribution_benediction",
      "retribution_improved_judgement",
      "retribution_holy_conduit",
      "retribution_conviction",
      "retribution_vindication",
      "retribution_sanctified_judgement",
      "retribution_seal_of_command",
      "retribution_pursuit_of_justice",
      "retribution_eye_for_an_eye",
      "retribution_sacred_arbiter",
      "retribution_crusade",
      "retribution_two_handed_weapon_specialization",
      "retribution_vengeance",
      "retribution_repentance",
      "retribution_champion_of_the_light",
      "retribution_instrument_of_law",
      "retribution_twist_of_light",
    ],
  },
  shaman: {
    Elemental: [
      "elemental_convection",
      "elemental_concussion",
      "elemental_elemental_warding",
      "elemental_reverberation",
      "elemental_call_of_flame",
      "elemental_elemental_devastation",
      "elemental_elemental_focus",
      "elemental_elemental_fury",
      "elemental_improved_fire_nova",
      "elemental_eye_of_the_storm",
      "elemental_call_of_thunder",
      "elemental_elemental_reach",
      "elemental_lightning_overload",
      "elemental_earthbound",
      "elemental_elemental_alacrity",
      "elemental_lava_burst",
    ],
  },
};

// --- v3 tree shape (2026-09-24 .. 2026-10-02) ---------------------------------
//
// The 2026-10-02 data pull (beta build 70170) reshaped Druid Feral Combat:
// Shredding Attacks moved tier 4 -> tier 3 col 1, King of the Jungle was
// removed outright, and two new talents (Shifting Power at the vacated
// tier 4 col 1, Improved Shifting Power at tier 5 col 1) pushed Predatory
// Instincts from tier 5 col 1 to tier 5 col 4. Positions after Savage Fury
// (tier 3 col 2) all shift, so any build code issued before today needs
// this frozen order to decode correctly.
//
// V3_TREE_ORDER freezes Feral Combat's tier/col-sorted id order as it stood
// at CURRENT_VERSION 3, immediately before today's change. Never edit after
// the fact, same rule as LEGACY_TREE_ORDER/V2_TREE_ORDER above.
const V3_TREE_ORDER: Record<string, Record<string, string[]>> = {
  druid: {
    "Feral Combat": [
      "feral_ferocity",
      "feral_heart_of_the_wild",
      "feral_feral_swiftness",
      "feral_feral_instinct",
      "feral_brutal_impact",
      "feral_thick_hide",
      "feral_savage_fury",
      "feral_feral_charge",
      "feral_sharpened_claws",
      "feral_shredding_attacks",
      "feral_primal_bite",
      "feral_predatory_strikes",
      "feral_blood_frenzy",
      "feral_predatory_instincts",
      "feral_leader_of_the_pack",
      "feral_king_of_the_jungle",
      "feral_natural_reaction",
      "feral_rend_and_tear",
      "feral_berserk",
    ],
  },
};

// --- v4 tree shape (2026-10-02 .. 2026-10-03) ---------------------------------
//
// Blizzard's 1 Oct patch notes for Warrior (Fury/Protection rework) landed
// as a server-side hotfix on 1-2 Oct, captured by the 2026-10-03
// talentsforever.com pull. Fury gained Lingering Rage, Furious Precision,
// and Gore Drinker, and lost Improved Cleave, Boundless Rage, and Precision;
// Protection lost Toughness entirely; Iron Will moved tree (Fury -> renamed
// protection_iron_will) with most of the rest of both trees' rows shuffling
// around the vacated/added slots. See LEGACY_ID_TRANSLATION above for the
// id-level moves/removals.
//
// V4_TREE_ORDER freezes Warrior Fury and Protection's tier/col-sorted id
// order as it stood at CURRENT_VERSION 4, immediately before this hotfix.
// Never edit after the fact, same rule as the other frozen orders above.
const V4_TREE_ORDER: Record<string, Record<string, string[]>> = {
  warrior: {
    Fury: [
      "fury_booming_voice",
      "fury_cruelty",
      "fury_iron_will",
      "fury_unbridled_wrath",
      "fury_improved_cleave",
      "fury_piercing_howl",
      "fury_blood_craze",
      "fury_boundless_rage",
      "fury_dual_wield_specialization",
      "fury_raging_blows",
      "fury_enrage",
      "fury_improved_execute",
      "fury_precision",
      "fury_death_wish",
      "fury_improved_intercept",
      "fury_improved_berserker_rage",
      "fury_flurry",
      "fury_bloodthirst",
    ],
    Protection: [
      "protection_shield_specialization",
      "protection_anticipation",
      "protection_improved_bloodrage",
      "protection_toughness",
      "protection_improved_thunder_clap",
      "protection_last_stand",
      "protection_master_of_defense",
      "protection_improved_revenge",
      "protection_defiance",
      "protection_improved_sunder_armor",
      "protection_improved_disarm",
      "protection_vanguard",
      "protection_improved_shield_wall",
      "protection_concussion_blow",
      "protection_improved_shield_bash",
      "protection_bastion",
      "protection_focused_rage",
      "protection_shield_slam",
    ],
  },
};

// --- v5 tree shape (2026-10-03 .. 2026-10-15) ---------------------------------
//
// The 2026-10-15 talentsforever.com pull (beta build 1.60.1.70425) reshaped 7
// trees. Priest Shadow lost Shadow Affinity and Improved Fade and gained Dark
// Inspiration; Priest Discipline moved Improved Power Word: Shield, Mental
// Strength and Improved Mana Burn. Shaman Elemental lost Improved Fire Nova
// and Call of Thunder, gained Trial by Fire and Elemental Mastery, and moved
// most of the rest. Shaman Restoration swapped Totemic Focus/Tidal Focus/Tidal
// Mastery positions. Mage Arcane gained Arcane Wrath and moved Missile
// Barrage to tier 1. Mage Fire replaced Wake of Fire with Improved Fire Blast.
// Warlock Affliction replaced Malediction with Grim Reach. Removed ids are in
// LEGACY_ID_TRANSLATION above.
//
// V5_TREE_ORDER freezes those trees' tier/col-sorted id order as it stood at
// CURRENT_VERSION 5. Never edit after the fact, same rule as the other frozen
// orders above.
const V5_TREE_ORDER: Record<string, Record<string, string[]>> = {
  priest: {
    Discipline: [
      "discipline_power_in_light",
      "discipline_wand_specialization",
      "discipline_twin_disciplines",
      "discipline_silent_resolve",
      "discipline_holy_precision",
      "discipline_improved_power_word_shield",
      "discipline_martyrdom",
      "discipline_mental_agility",
      "discipline_inner_focus",
      "discipline_meditation",
      "discipline_improved_inner_fire",
      "discipline_mental_strength",
      "discipline_soul_warding",
      "discipline_improved_mana_burn",
      "discipline_penance",
      "discipline_renewed_hope",
      "discipline_divine_aegis",
      "discipline_power_infusion",
    ],
    Shadow: [
      "shadow_shadow_focus",
      "shadow_blackout",
      "shadow_spirit_tap",
      "shadow_shadow_affinity",
      "shadow_improved_shadow_word_pain",
      "shadow_shadow_reach",
      "shadow_improved_mind_blast",
      "shadow_improved_psychic_scream",
      "shadow_mind_flay",
      "shadow_improved_mind_flay",
      "shadow_improved_fade",
      "shadow_vampiric_embrace",
      "shadow_shadow_weaving",
      "shadow_silence",
      "shadow_devouring_contagion",
      "shadow_early_demise",
      "shadow_darkness",
      "shadow_shadowform",
    ],
  },
  shaman: {
    Elemental: [
      "elemental_convection",
      "elemental_concussion",
      "elemental_elemental_warding",
      "elemental_reverberation",
      "elemental_call_of_flame",
      "elemental_elemental_devastation",
      "elemental_elemental_focus",
      "elemental_elemental_alacrity",
      "elemental_improved_fire_nova",
      "elemental_eye_of_the_storm",
      "elemental_call_of_thunder",
      "elemental_elemental_reach",
      "elemental_lightning_overload",
      "elemental_earthbound",
      "elemental_elemental_fury",
      "elemental_lava_burst",
    ],
    Restoration: [
      "restoration_improved_healing_wave",
      "restoration_tidal_mastery",
      "restoration_mindfulness",
      "restoration_natural_grace",
      "restoration_tidal_focus",
      "restoration_improved_reincarnation",
      "restoration_ancestral_healing",
      "restoration_healing_focus",
      "restoration_water_shield",
      "restoration_totemic_focus",
      "restoration_restorative_totems",
      "restoration_mana_tide_totem",
      "restoration_healing_way",
      "restoration_natures_swiftness",
      "restoration_purification",
      "restoration_riptide",
    ],
  },
  mage: {
    Arcane: [
      "arcane_wand_specialization",
      "arcane_arcane_focus",
      "arcane_improved_channeling",
      "arcane_arcane_subtlety",
      "arcane_magic_absorption",
      "arcane_arcane_concentration",
      "arcane_arcane_resilience",
      "arcane_arcane_geometry",
      "arcane_arcane_impact",
      "arcane_arcane_blast",
      "arcane_arcane_shielding",
      "arcane_improved_counterspell",
      "arcane_arcane_meditation",
      "arcane_missile_barrage",
      "arcane_presence_of_mind",
      "arcane_arcane_mind",
      "arcane_arcane_instability",
      "arcane_arcane_power",
    ],
    Fire: [
      "fire_wake_of_fire",
      "fire_incineration",
      "fire_improved_fireball",
      "fire_ignite",
      "fire_flame_throwing",
      "fire_impact",
      "fire_burning_soul",
      "fire_improved_flamestrike",
      "fire_pyroblast",
      "fire_improved_scorch",
      "fire_improved_fire_ward",
      "fire_heating_up",
      "fire_master_of_elements",
      "fire_critical_mass",
      "fire_blast_wave",
      "fire_fire_power",
      "fire_combustion",
    ],
  },
  warlock: {
    Affliction: [
      "affliction_improved_life_tap",
      "affliction_suppression",
      "affliction_improved_corruption",
      "affliction_malediction",
      "affliction_soul_harvest",
      "affliction_improved_drains",
      "affliction_improved_bane_of_agony",
      "affliction_fel_concentration",
      "affliction_amplify_curse",
      "affliction_pandemic",
      "affliction_malevolence",
      "affliction_nightfall",
      "affliction_curse_of_exhaustion",
      "affliction_siphon_life",
      "affliction_soul_siphon",
      "affliction_shadow_mastery",
      "affliction_wrack",
    ],
  },
};

type FrozenOrders = Record<string, Record<string, string[]>>;
function mergeOrders(...orders: FrozenOrders[]): FrozenOrders {
  const out: FrozenOrders = {};
  for (const o of orders) for (const cls in o) out[cls] = { ...out[cls], ...o[cls] };
  return out;
}

// Decodes a versioned code older than CURRENT_VERSION, whose per-tree digits
// are positioned against a frozen older tree order for whichever trees have
// one in `orders`; every other tree decodes against live data exactly as a
// current-version code would. Removed talents translate to null and drop.
function decodeAgainstFrozenOrders(
  classData: ClassTalentData,
  treeCodes: string[],
  orders: Record<string, Record<string, string[]>>
): RankState {
  const ranks: RankState = {};
  const currentById = new Map<string, Talent>();
  for (const tree of classData.trees) {
    for (const t of tree.talents) currentById.set(t.id, t);
  }
  const live = orderedTalents(classData);
  classData.trees.forEach((tree, i) => {
    const order = orders[classData.class]?.[tree.name] ?? live[i].map((t) => t.id);
    const treeCode = treeCodes[i] ?? "";
    order.forEach((oldId, j) => {
      const char = treeCode[j];
      const rank = char ? parseInt(char, 36) : 0;
      if (!Number.isFinite(rank) || rank <= 0) return;
      const newId = oldId in LEGACY_ID_TRANSLATION ? LEGACY_ID_TRANSLATION[oldId] : oldId;
      if (!newId) return;
      const talent = currentById.get(newId);
      if (!talent) return;
      ranks[talent.id] = Math.min(rank, talent.maxRank);
    });
  });
  return ranks;
}

function decodeLegacyBuild(classData: ClassTalentData, treeCodes: string[]): RankState {
  const ranks: RankState = {};
  const currentById = new Map<string, Talent>();
  for (const tree of classData.trees) {
    for (const t of tree.talents) currentById.set(t.id, t);
  }

  classData.trees.forEach((tree, i) => {
    const legacyOrder =
      LEGACY_TREE_ORDER[classData.class]?.[tree.name] ??
      V2_TREE_ORDER[classData.class]?.[tree.name] ??
      V3_TREE_ORDER[classData.class]?.[tree.name] ??
      V4_TREE_ORDER[classData.class]?.[tree.name] ??
      V5_TREE_ORDER[classData.class]?.[tree.name];
    const order = legacyOrder ?? orderedTalents(classData)[i].map((t) => t.id);
    const treeCode = treeCodes[i] ?? "";
    order.forEach((oldId, j) => {
      const char = treeCode[j];
      const rank = char ? parseInt(char, 36) : 0;
      if (!Number.isFinite(rank) || rank <= 0) return;
      const newId = oldId in LEGACY_ID_TRANSLATION ? LEGACY_ID_TRANSLATION[oldId] : oldId;
      if (!newId) return; // talent removed with no replacement -- drop the points
      const talent = currentById.get(newId);
      if (!talent) return;
      ranks[talent.id] = Math.min(rank, talent.maxRank);
    });
  });
  return ranks;
}
