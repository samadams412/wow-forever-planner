import localFont from "next/font/local";

// Quest-page fonts, shared by QuestJournal, QuestInfo, QuestChain and QuestMap.
// Scoped to the quest feature only (not app/layout.tsx) -- CLAUDE.md's font
// note calls for the Name/Description/Rewards headers specifically, not a
// site-wide heading font swap. next/font/local resolves assets/fonts/ relative
// to this file, which sits at the same depth as the journal did.

// Headers (quest name, section headings, chain title).
export const morpheus = localFont({
  src: "../../assets/fonts/morpheus_cyr.ttf",
  display: "swap",
});

// Body text (description, objectives, chain rows, NPC lines) -- matches the
// in-game quest log's own body font.
export const friz = localFont({
  src: "../../assets/fonts/frizqt__.ttf",
  display: "swap",
});
