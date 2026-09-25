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
const CURRENT_VERSION = 3;

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
    if (parseInt(segments[0], 10) < CURRENT_VERSION) {
      return decodeAgainstFrozenOrders(classData, segments.slice(1), V2_TREE_ORDER);
    }
    return decodeVersionedBuild(classData, segments.slice(1));
  }
  // No recognizable version segment -> a pre-versioning (legacy) code,
  // encoded against whatever the tree shape was before CURRENT_VERSION
  // existed. Decode it against that frozen old shape, then translate.
  return decodeLegacyBuild(classData, segments);
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
      LEGACY_TREE_ORDER[classData.class]?.[tree.name] ?? V2_TREE_ORDER[classData.class]?.[tree.name];
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
