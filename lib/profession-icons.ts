// Trade-window icon slugs, the same ones the old profession write-up pages
// used in their frontmatter (verified against those before reusing them --
// "trade_engraving" is genuinely Enchanting's real Blizzard icon slug, not
// a typo). Leatherworking never had a write-up to carry one forward, so
// its slug is the standard one every other WoW reference site uses.
// Shared by the professions index, each profession page, and the
// cross-profession nav row so all three stay in sync automatically.
export const PROFESSION_ICON: Record<string, string> = {
  alchemy: "trade_alchemy",
  blacksmithing: "trade_blacksmithing",
  cooking: "inv_misc_food_15",
  enchanting: "trade_engraving",
  engineering: "trade_engineering",
  "first-aid": "spell_holy_sealofsacrifice",
  leatherworking: "trade_leatherworking",
  tailoring: "trade_tailoring",
  mining: "trade_mining",
  herbalism: "trade_herbalism",
  skinning: "inv_misc_pelt_wolf_01",
};
