import Link from "next/link";
import { mediumIconUrl } from "@/lib/wow-data";

// Left-side category filter, matching foreverchanges.pro/professions/<id>'s
// own sidebar (studied live before building) -- a vertical list of
// categories with a recipe count next to each, the active one highlighted.
// Pure server-rendered Links driving a `?category=` search param, same
// pattern /reference/items' status tabs already use on this site, so no
// client JS is needed just to filter a list.

// One shared map keyed by the category's exact display string, since the
// same slot/weapon-type names repeat verbatim across several professions'
// own category lists (data/professions-catalog/<id>.json's `categories`) --
// e.g. "Chest" means the same thing whether it's Blacksmithing's plate
// chestpiece bucket or Tailoring's cloth one, so one representative icon
// per name is enough. Every slug below was checked against wow.zamimg.com
// before use (a nonexistent slug there still returns 200 but a ~146-byte
// placeholder image, not a 404 -- checked by response size, not status
// code). A few categories have no single real WoW icon that names them
// exactly (there's no in-game "Transmute" or "player camp" item icon, and
// the 5 Cooking stat buckets and a couple of Engineering/First Aid/
// Blacksmithing categories are closer buckets than exact matches) --
// flagged inline below rather than silently presented as exact.
const CATEGORY_ICON: Record<string, string> = {
  // Alchemy
  Potions: "inv_potion_51",
  Elixirs: "inv_potion_92",
  Flasks: "inv_alchemy_endlessflask_01",
  Transmutes: "trade_alchemy", // no distinct "transmute" icon exists -- reusing the profession's own icon
  "Oils and Other": "inv_potion_162", // generic vial; this is a mixed catch-all bucket

  // Blacksmithing / shared weapon & armor slots
  "One-Hand Weapons": "inv_sword_04",
  "Two-Hand Weapons": "inv_axe_09",
  Shields: "inv_shield_04",
  Head: "inv_helmet_03",
  Shoulders: "inv_shoulder_01",
  Chest: "inv_chest_cloth_01",
  Bracers: "inv_bracer_03",
  Gloves: "inv_gauntlets_04",
  Belts: "inv_belt_01",
  Legs: "inv_pants_03",
  Boots: "inv_boots_02",
  "Sharpening/Weight/Grinding Stones": "inv_stone_sharpeningstone_04",
  "Shield Spikes/Chain/Spurs": "inv_shield_06", // generic shield, not spike-specific -- no closer icon found
  "Keys/Rods/Tools": "inv_misc_key_03",

  // Cooking buff buckets -- best-guess numbered food icons, not verified
  // against the game's actual buff-tooltip icons
  "Stamina and Spirit": "inv_misc_food_11",
  "Strength and Attack Power": "inv_misc_food_08",
  Agility: "inv_misc_fish_02",
  "Intellect/Spell Power/Mana": "inv_misc_food_09",
  "Other Buffs": "inv_misc_questionmark",
  "Health and Mana Only": "inv_misc_food_01",

  // Enchanting
  Weapon: "inv_sword_04",
  "Two-Hand": "inv_axe_09",
  Shield: "inv_shield_04",
  "Off-Hand": "inv_misc_orb_04", // approximate -- off-hand items vary widely (tomes, totems, orbs)
  Cloak: "inv_misc_cape_01",
  Neck: "inv_jewelry_necklace_01",
  Other: "inv_misc_questionmark",

  // Engineering
  "Bombs and Explosives": "inv_misc_bomb_05",
  "Trinkets and Devices": "inv_misc_pocketwatch_01",
  "Goggles and Helms": "inv_helmet_28",
  "Other Gear": "inv_misc_gear_01",
  "Guns and Scopes": "inv_weapon_rifle_01",
  Ammunition: "inv_misc_ammo_bullet_01",
  "Fireworks and Toys": "spell_fire_fire", // no dedicated firework icon found -- generic fire
  "Pets and Mounts": "inv_box_petcarrier_01",
  Parts: "inv_misc_gear_02",

  // First Aid
  Bandages: "inv_misc_bandage_08",
  "Anti-Venoms and Potions": "inv_potion_19", // generic potion, not venom-specific

  // Leatherworking / Tailoring
  Cloaks: "inv_misc_cape_01",
  "Armor Kits": "inv_misc_armorkit_17",
  Bags: "inv_misc_bag_08",
  "Cured Leather": "inv_misc_leatherscrap_03",
  "Shirts and Robes for Show": "inv_shirt_08",
  "Bolts of Cloth": "inv_fabric_silk_01", // silk-specific icon standing in for cloth bolts generally

  // Shared across every crafting profession -- no canonical in-game "camp"
  // item icon exists (this project's own Legacy System camp feature, not
  // a Classic one), so this is a placeholder rather than a real match.
  "Camp Objects": "inv_misc_map_01",
};

export default function ProfessionCategorySidebar({
  professionId,
  categories,
  counts,
  active,
}: {
  professionId: string;
  categories: string[];
  counts: Record<string, number>;
  active: string;
}) {
  return (
    <nav className="flex shrink-0 flex-row flex-wrap gap-1 sm:w-56 sm:flex-col sm:flex-nowrap sm:gap-0.5">
      <Link
        href={`/reference/professions/${professionId}`}
        className={`flex items-center justify-between rounded px-2.5 py-1.5 text-sm transition-colors ${
          active === "All" ? "bg-accent/20 text-accent" : "text-foreground-muted hover:bg-surface-hover hover:text-foreground"
        }`}
      >
        <span>All</span>
        <span className="text-xs text-foreground-muted">
          {Object.values(counts).reduce((n, c) => n + c, 0)}
        </span>
      </Link>
      {categories.map((category) => (
        <Link
          key={category}
          href={`/reference/professions/${professionId}?category=${encodeURIComponent(category)}`}
          className={`flex items-center justify-between rounded px-2.5 py-1.5 text-sm transition-colors ${
            active === category
              ? "bg-accent/20 text-accent"
              : "text-foreground-muted hover:bg-surface-hover hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            {CATEGORY_ICON[category] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediumIconUrl(CATEGORY_ICON[category])} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
            )}
            {category}
          </span>
          <span className="text-xs text-foreground-muted">{counts[category] ?? 0}</span>
        </Link>
      ))}
    </nav>
  );
}
