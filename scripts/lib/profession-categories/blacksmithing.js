// Blacksmithing's category list has no catch-all "Other" bucket, so every
// recipe has to land somewhere real. Primary signal is the crafted item's
// own `slot` field from the item catalog (armor/weapon slot -> category is
// a direct, reliable mapping); items with no slot (consumable stones, tool
// add-ons, camp fixtures) fall back to name patterns, checked directly
// against the 36 real "no slot" blacksmithing items before trusting them --
// see the session notes for the exact list. "Thrown" weapons (3 items) have
// no clean home in the given category list and are flagged uncertain
// rather than forced into One-Hand Weapons.

const SLOT_TO_CATEGORY = {
  "One-Hand": "One-Hand Weapons",
  "Main Hand": "One-Hand Weapons",
  "Two-Hand": "Two-Hand Weapons",
  "Shield": "Shields",
  "Head": "Head",
  "Shoulder": "Shoulders",
  "Chest": "Chest",
  "Wrist": "Bracers",
  "Hands": "Gloves",
  "Waist": "Belts",
  "Legs": "Legs",
  "Feet": "Boots",
};

const NAME_RULES = [
  [/Sharpening (Stone|Wheel)$|Weightstone$|Grinding Stone$/i, "Sharpening/Weight/Grinding Stones"],
  [/Shield Spike$|Buckle$|Counterweight$|Weapon Chain$|Spurs$/i, "Shield Spikes/Chain/Spurs"],
  [/Skeleton Key$|\bRod$|Blacksmith Hammer$/i, "Keys/Rods/Tools"],
  [/^Anvil$|Forge$|Sharpening Wheel$/i, "Camp Objects"],
];

function categorize(recipeName, item) {
  const slot = item ? item.slot : null;
  if (slot && SLOT_TO_CATEGORY[slot]) {
    return { category: SLOT_TO_CATEGORY[slot], confident: true };
  }
  for (const [pattern, category] of NAME_RULES) {
    if (pattern.test(recipeName)) return { category, confident: true };
  }
  // Best-effort fallback so nothing is left uncategorized, per this
  // session's instruction not to skip categorization even when uncertain --
  // Camp Objects is the least-wrong bucket for the remaining oddities
  // (unique tools/fixtures like "Inlaid Mithril Cylinder").
  return { category: "Camp Objects", confident: false };
}

module.exports = { categorize };
