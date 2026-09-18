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
const CURRENT_VERSION = 2;

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

// Old talent id -> current talent id, for the 4 trees above only. `null`
// means the talent was removed outright with no replacement (points in it
// are dropped, not reassigned to anything). Ids not listed here are
// unchanged -- same id before and after.
const LEGACY_ID_TRANSLATION: Record<string, string | null> = {
  protection_vitality: null,
  combat_restless_blades: "combat_flawless_execution",
  affliction_drain_hope: "affliction_wrack",
  balance_balance_of_nature: null,
};

function decodeLegacyBuild(classData: ClassTalentData, treeCodes: string[]): RankState {
  const ranks: RankState = {};
  const currentById = new Map<string, Talent>();
  for (const tree of classData.trees) {
    for (const t of tree.talents) currentById.set(t.id, t);
  }

  classData.trees.forEach((tree, i) => {
    const legacyOrder = LEGACY_TREE_ORDER[classData.class]?.[tree.name];
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
