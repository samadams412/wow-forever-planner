// Hand-authored content for /beta-wrapped, the story-mode recap of the WoW:
// Forever beta (Sept 16 - Oct 27, 2026). Paraphrased from Blizzard's beta
// development notes (data/patch-notes/) and the talentsforever.com client-data
// pulls (data/sources/talentsforever/), not generated. Client-safe: no
// lib/wow-data import (class colors and icons come in from the server page).
// A later edition (e.g. launch) is a new WrappedEdition + route reusing the
// same components.

export type WrappedClassId =
  | "warrior"
  | "paladin"
  | "hunter"
  | "rogue"
  | "priest"
  | "shaman"
  | "mage"
  | "warlock"
  | "druid";

export type WrappedSlide =
  | { kind: "intro"; eyebrow: string; title: string; subtitle: string }
  | {
      kind: "stats";
      title: string;
      hero: { value: string; label: string; detail: string };
      stats: { value: string; label: string }[];
      footnote: string;
    }
  | { kind: "timeline"; title: string; items: { date: string; build: string; headline: string }[] }
  | { kind: "list"; eyebrow: string; title: string; items: string[] }
  | {
      kind: "class";
      classId: WrappedClassId;
      // Talent tree whose background art heads the slide (public/backgrounds/<class>/<tree>.jpg).
      tree: string;
      label: string;
      tagline: string;
      // items[0] is the lead change, shown large, and should match the tagline; the rest run in date order.
      items: { date: string; text: string }[];
    }
  | { kind: "roster"; title: string; groups: { label: string; tone: "new" | "removed" | "renamed"; items: string[] }[] }
  | { kind: "beforeAfter"; eyebrow: string; title: string; rows: { race: string; before: string; after: string }[] }
  | {
      kind: "spotlight";
      eyebrow: string;
      title: string;
      subject: string;
      steps: { date: string; value: string }[];
      caption: string;
    }
  | { kind: "closer"; title: string; body: string; cta: { href: string; label: string } };

export type WrappedEdition = {
  id: string;
  title: string;
  range: string;
  slides: WrappedSlide[];
};

export const BETA_WRAPPED: WrappedEdition = {
  id: "beta",
  title: "Beta Wrapped",
  range: "Sept 16 – Oct 27, 2026",
  slides: [
    {
      kind: "intro",
      eyebrow: "WoW: Forever · Sept 16 – Oct 27, 2026",
      title: "The beta, wrapped",
      subtitle: "Six weeks, seven builds, two hotfixes. Here's everything Blizzard changed.",
    },
    {
      kind: "stats",
      title: "By the numbers",
      hero: { value: "~560", label: "talent edits", detail: "385 of the 465 talents changed at least once" },
      stats: [
        { value: "~1,100", label: "spell tooltip edits" },
        { value: "73", label: "racial edits" },
        { value: "19", label: "data pulls" },
      ],
      footnote:
        "Counted across the pulls from Sept 13 to Oct 27; spell edits span 438 spells. Includes some data corrections, not only Blizzard balance changes.",
    },
    {
      kind: "timeline",
      title: "Seven builds, two hotfixes",
      items: [
        { date: "Sept 16", build: "69893", headline: "The beta opens: spellbooks to level 60, four talents swapped out" },
        { date: "Sept 24", build: "70009", headline: "First balance pass, plus the Cooldown Manager" },
        { date: "Oct 1", build: "70170", headline: "Level cap 30, three dungeons, every class tuned" },
        { date: "Oct 1–2", build: "Hotfix", headline: "Warrior Fury and Protection rework" },
        { date: "Oct 8", build: "70291", headline: "Impale needs Deep Wounds, spell-rank scaling pass" },
        { date: "Oct 15", build: "70425", headline: "Six talents in, six out, racial weapon specs reworked" },
        { date: "Oct 20", build: "Hotfix", headline: "Mage Frost: Piercing Ice gone, Winter's Chill reworked" },
        { date: "Oct 27", build: "70630", headline: "Pushback talents reworded, final racial pass" },
      ],
    },
    {
      kind: "list",
      eyebrow: "Oct 1 · build 70170",
      title: "World & PvP",
      items: [
        "Level cap raised to 30",
        "New dungeon: Excavation Site: Wetlands (26–31), plus Razorfen Downs and Uldaman",
        "Dungeon quests give 50% less bonus XP",
        "Faster respawns in Hillsbrad, Ashenvale, Wetlands, Duskwood and Thousand Needles",
        "Honor costs up ~50%, honor cap 15,000 → 25,000",
        "Low-rank spells cast far below your level get less spell power and fewer procs (rank 1 Frostbolt at 60: 0% Frostbite)",
      ],
    },
    {
      kind: "class",
      classId: "warrior",
      tree: "Fury",
      label: "Warrior",
      tagline: "Fury and Protection, rebuilt",
      items: [
        { date: "Oct 1", text: "Fury gets Lingering Rage, Furious Precision and Gore Drinker; Improved Cleave, Boundless Rage and Toughness are gone" },
        { date: "Oct 1", text: "Bloodthirst hits for 45% of Attack Power (was 35%), and Berserker Rage comes at 30" },
        { date: "Oct 1", text: "Spearing Strike works with any melee weapon, in Battle Stance" },
        { date: "Oct 8", text: "Impale needs 3/3 Deep Wounds" },
        { date: "Sept 24", text: "Improved Slam cuts Slam's cooldown, and Slam no longer resets your swing" },
      ],
    },
    {
      kind: "class",
      classId: "paladin",
      tree: "Holy",
      label: "Paladin",
      tagline: "Holy Strike for everyone, Salvation reworked",
      items: [
        { date: "Sept 24", text: "Improved Holy Strike is gone: its 10 sec cooldown is baseline and Holy Strike hits harder" },
        { date: "Sept 24", text: "Crusade leaves the Retribution tree" },
        { date: "Oct 1", text: "Holy Shield blocks 30%; Redoubt tops out at 20%" },
        { date: "Oct 8", text: "Reckoning's extra attack is capped at once per 1.5 sec; Retribution Aura hits softer" },
        { date: "Oct 15", text: "Blessing of Salvation becomes Salvation, Mass Salvation and Revoke" },
      ],
    },
    {
      kind: "class",
      classId: "hunter",
      tree: "Marksmanship",
      label: "Hunter",
      tagline: "Longer reach, a bigger Mark",
      items: [
        { date: "Oct 1", text: "Sniper Shot reaches 45 yd, and your next 3 shots get +10 yd" },
        { date: "Sept 24", text: "Pet Furious Howl gives 40% less Attack Power, and you can't tame beasts above your level" },
        { date: "Oct 1", text: "Deflection is halved (5% parry at max), and pet Aggressive Mode is back" },
        { date: "Oct 8", text: "Expose Prey's Mongoose Bite window is 10 sec (was 5)" },
        { date: "Oct 27", text: "Hunter's Mark rank 4 gives 143 ranged Attack Power (was 71)" },
      ],
    },
    {
      kind: "class",
      classId: "rogue",
      tree: "Combat",
      label: "Rogue",
      tagline: "The quietest six weeks",
      items: [
        { date: "Sept 16", text: "Restless Blades is out; Flawless Execution takes its slot" },
        { date: "Sept 24", text: "Sap flags you for PvP when used on a flagged target" },
        { date: "Oct 1", text: "Setup only adds a combo point to the target you dodged or resisted" },
        { date: "Oct 1", text: "Missing with Expose Armor no longer costs your combo points" },
      ],
    },
    {
      kind: "class",
      classId: "priest",
      tree: "Shadow",
      label: "Priest",
      tagline: "Penance down, Shadow reshaped",
      items: [
        { date: "Oct 8", text: "Penance rank 4 drops to 92 damage / 425 healing (was 131 / 673) and costs more" },
        { date: "Sept 24", text: "Renew can crit, and Dark Sacrifice no longer breaks crowd control" },
        { date: "Oct 1", text: "Devouring Plague can crit; Inner Focus no longer crits periodic effects" },
        { date: "Oct 15", text: "Dark Inspiration is new; Shadow Affinity and Improved Fade are gone" },
        { date: "Oct 15", text: "Vampiric Embrace has a 30 sec cooldown, and Shadow Weaving is a debuff on the target" },
      ],
    },
    {
      kind: "class",
      classId: "shaman",
      tree: "Elemental",
      label: "Shaman",
      tagline: "Elemental, reshuffled twice",
      items: [
        { date: "Oct 15", text: "Trial by Fire and Elemental Mastery are in; Improved Fire Nova and Call of Thunder are out" },
        { date: "Sept 24", text: "Flametongue and Windfury Totems no longer stack with weapon imbues or Grace of Air" },
        { date: "Oct 8", text: "Water Shield has no cooldown" },
        { date: "Oct 15", text: "Lava Burst moves to row 5, cheaper with lower damage; Stormstrike costs 8% of base mana" },
        { date: "Oct 27", text: "Lava Burst rank 3's Flame Shock bonus is 20%, matching the other ranks" },
      ],
    },
    {
      kind: "class",
      classId: "mage",
      tree: "Frost",
      label: "Mage",
      tagline: "Frost got the hotfix",
      items: [
        { date: "Oct 20", text: "Piercing Ice is removed, Elemental Precision drops to 3 ranks, and Winter's Chill is reworked" },
        { date: "Oct 1", text: "Hot Streak becomes Heating Up, and Combustion has 3 charges (was 4)" },
        { date: "Oct 15", text: "Arcane Wrath and Improved Fire Blast are in; Wake of Fire is out" },
        { date: "Oct 15", text: "Arcane Blast casts in 1.5 sec, and Critical Mass goes to 5 ranks" },
        { date: "Oct 20", text: "Ice Barrier adds +3% Frost damage, and +3% more while the shield holds" },
      ],
    },
    {
      kind: "class",
      classId: "warlock",
      tree: "Affliction",
      label: "Warlock",
      tagline: "Wrack, Grim Reach, and fixes",
      items: [
        { date: "Sept 16", text: "Drain Hope is out; Wrack takes its slot" },
        { date: "Oct 1", text: "Hellfire can crit, and Soul Harvest's +50/100% mana regen works" },
        { date: "Oct 8", text: "Demonic Brand only causes high threat on Shadow damage" },
        { date: "Oct 15", text: "Grim Reach replaces Malediction" },
        { date: "Oct 27", text: "Amplify Curse boosts Curse of Exhaustion by 20% (was 50%)" },
      ],
    },
    {
      kind: "class",
      classId: "druid",
      tree: "Feral Combat",
      label: "Druid",
      tagline: "A new Feral toolkit",
      items: [
        { date: "Oct 1", text: "Shifting Power and Improved Shifting Power are new; Tiger's Fury and King of the Jungle are gone" },
        { date: "Sept 24", text: "Wrath does ~50% more base damage; Rejuvenation, Tranquility and Wild Growth can crit" },
        { date: "Sept 24", text: "Mangle becomes Primal Bite, and Primal Fury is Blood Frenzy again" },
        { date: "Oct 1", text: "Bear crits give 75% more Rage, and Primal Bite's threat is doubled" },
        { date: "Oct 8", text: "Predatory Instincts becomes Natural Instinct, adding spell healing from Intellect" },
      ],
    },
    {
      kind: "roster",
      title: "Talents in, talents out",
      groups: [
        {
          label: "13 new",
          tone: "new",
          items: [
            "Wrack",
            "Flawless Execution",
            "Lingering Rage",
            "Furious Precision",
            "Gore Drinker",
            "Shifting Power",
            "Improved Shifting Power",
            "Dark Inspiration",
            "Trial by Fire",
            "Elemental Mastery",
            "Arcane Wrath",
            "Improved Fire Blast",
            "Grim Reach",
          ],
        },
        {
          label: "18 removed",
          tone: "removed",
          items: [
            "Drain Hope",
            "Restless Blades",
            "Vitality",
            "Balance of Nature",
            "Improved Holy Strike",
            "Crusade",
            "King of the Jungle",
            "Improved Cleave",
            "Boundless Rage",
            "Precision",
            "Toughness",
            "Shadow Affinity",
            "Improved Fade",
            "Improved Fire Nova",
            "Call of Thunder",
            "Wake of Fire",
            "Malediction",
            "Piercing Ice",
          ],
        },
        {
          label: "5 renamed",
          tone: "renamed",
          items: [
            "Mangle → Primal Bite",
            "Primal Fury → Blood Frenzy",
            "Hot Streak → Heating Up",
            "Soul Harvesting → Soul Harvest",
            "Predatory Instincts → Natural Instinct",
          ],
        },
      ],
    },
    {
      kind: "beforeAfter",
      eyebrow: "Oct 26–27 · final pass before launch",
      title: "Racials, before and after",
      rows: [
        { race: "Human", before: "Ruthless 2% crit · Spirit +5%", after: "Ruthless 1% crit · Spirit +10%" },
        { race: "Dwarf", before: "Earth Fury", after: "Artisan's Precision, +1% hit" },
        { race: "Orc", before: "Savage · Blood Fury 3 min", after: "Command, +5% pet damage · Blood Fury 2 min" },
        { race: "Undead", before: "Touch of the Grave 25 sec", after: "Touch of the Grave 15 sec" },
        { race: "Tauren", before: "Plainsrunning up to 30%", after: "Plainsrunning up to 60%, not mounted" },
        { race: "Troll", before: "Berserking 10 sec", after: "Berserking 15 sec" },
        { race: "Skyborne", before: "Wind Blessed 3% haste", after: "Wind Blessed 2% haste" },
      ],
    },
    {
      kind: "spotlight",
      eyebrow: "Most-reworked talent",
      title: "Champion of the Light",
      subject: "Retribution Paladin · Intellect as spell damage, max rank",
      steps: [
        { date: "Sept 18", value: "100%" },
        { date: "Oct 2", value: "60%" },
        { date: "Oct 15", value: "30%" },
        { date: "Oct 27", value: "60%" },
      ],
      caption:
        "Four versions in six weeks. It started out boosting healing too, and it landed back where Blizzard's Oct 1 notes put it.",
    },
    {
      kind: "closer",
      title: "Launch is Nov 4",
      body: "Every change here is already in the planner. Build for launch, and share it with your guild.",
      cta: { href: "/planner", label: "Open the talent planner" },
    },
  ],
};
