---
type: research
created: 2026-10-06
tags: [forevercraft, bis, competitors]
status: active
---

# BIS tools: competitor comparison (2026-10-06)

Part of [[BIS-Builder-Design]]. Observed in Chrome on 2026-10-06 against the Forever beta (build 1.60.1.70235).

Screenshots: `screenshots/` in this folder.

## Summary

| | ForeverChanges `/bis` | Wowhead Forever | Sixty Upgrades `/forever/characters/new` |
|---|---|---|---|
| Gear BIS tool found? | Yes: preset lists per spec, level 30 | **No gear BIS found.** The Forever section has a talent calculator. Only third-party gear lists turned up in search (wowtbc.gg, GearQuest Forever addon) | Yes: account-backed "character" with gear, but gear work sits behind sign-in |
| Start flow | Browse a class/spec card grid, or pick a spec | n/a (talent calc: class tree first) | Faction → class → cosmetics → name/level/realm → Create |
| Spec variants | Separate cards and URLs: `/bis/warrior`, `/bis/warrior/pvp`, `/bis/warrior/tank`. Mage has Frost/Fire/Arcane × PvE/PvP | n/a | Not seen (the create form has no spec step) |
| Item selection | Preset, read-only, ranked list per slot | n/a | Not reached (gear screen is behind Create) |
| Preset lists alongside a builder | Yes. "Make my own list" link on each spec page | n/a | Builder-first (characters) |
| Save/load/share | Not verified. No account UI visible on `/bis`. Presets are shareable by URL | n/a | Sign In / Register at top. Characters are saved to an account |

## 1. ForeverChanges (`foreverchanges.pro/bis`)

**Start flow.** The index is a grid of nine class cards plus a "All" filter row. Each card lists its specs as links. Clicking a spec opens a full list page. The header says "Best in slot lists at level 30", with a level dropdown.

**Spec variants.** Separate cards and separate URLs, not a toggle. Warrior has PvE, PvP, Tank. Mage has Frost PvE/PvP, Fire PvE/PvP, Arcane PvE. Paladin has Holy PvP and Shockadin PvP. Level 30 is currently the only level offered.

**Item selection.** No click-a-slot picker. Each spec page is one scroll: a character panel (slots, stats, enchants), then a ranked list per slot. Each slot's list has 5–10+ candidates, best first. Each candidate shows its source:
- Quest (with "in Classic" level notes, e.g. "level 34 in Classic, from level 30")
- Dungeon or raid boss, or trash, with a Classic drop-rate figure (e.g. "0.03% in Classic")
- Crafting (profession and skill level), and whether plans are findable
- World drop / auction house
- Reputation, with the rank needed

Items the beta hasn't placed yet are labelled "Where it comes from is not known yet" or "reported, not checked". The page marks its own uncertainty and asks users to report mistakes.

**Preset vs. builder.** Presets are the product: hardcoded per spec, and editorially ranked ("Rankings within each slot are ours, best first, for dungeons at the level 30 cap"). A "Make my own list" link sits on each spec page. The Alliance/Horde toggle and the "Character / Talents" tabs sit on the same page.

**Save/load/share.** Not confirmed. The preset is addressed by URL. I did not find an account or share control on the list page.

**Caveats.** The page says the beta is only a few days old and items may change. Rankings are opinion; the page does not describe how they are weighted beyond "dungeons at the level 30 cap". Its notes also say which stats are weighted most heavily for each spec.

## 2. Wowhead Forever

Wowhead's Forever section (`wowhead.com/forever/talent-calc`) is a **talent calculator** ("Forever Talent Calculator", tree first, Highest Trainable Ranks side panel, Talent Order drawer). I found no gear BIS page in the Forever section, and my search for one returned nothing from Wowhead.

The gear lists that do exist for Forever are from other sites:
- `wowtbc.gg/warcraftforever/bis-list/<spec>/` (Arms, Fury, Protection Warrior; Elemental, Enhancement Shaman; others) — per-spec preset lists
- GearQuest Forever (CurseForge addon) — top-3 per slot, all nine classes, levels 1–60, Alliance and Horde

Those would be worth checking directly before concluding that a Wowhead gear page is missing. This comparison used only what is above.

## 3. Sixty Upgrades (`sixtyupgrades.com/forever/characters/new`)

**Start flow.** A character wizard: faction (Alliance/Horde) → class (9 options) → cosmetic customization (Skin Color, Face, Hair Style, Hair Color, Facial Hair, with sliders) → Name / Level / Realm → **Create**. Sixty Upgrades is login-first: the header has Sign In / Register, and the character is then saved to an account. The wizard has no spec step.

**Spec variants.** Not in the create flow. Presumably handled after creation, but I did not create a character (that needs an account).

**Item selection.** Not reached. A "Customize" step ran, but the next screen did not render in the capture, so I can't describe it.

**Preset vs. builder.** The product is a character-first gear tracker, not a preset list.

**Save/load/share.** Account-based (Sign In / Register, then Create). Characters are server-side. The wizard's copy says "Create character", which suggests accounts and multiple characters per user.

**Caveats.** Cookie banner at the bottom (not accepted: non-essential). The Customize screen screenshot timed out, so no image of it is in `screenshots/`.

## What to take and what to leave

**Take:**
- Ranked per-slot lists with per-candidate source and drop-rate notes. That's the content users came for, and it is more useful than a bare item.
- Explicit uncertainty labels (unknown source, reported not checked).
- Separate spec pages with PvE/PvP/Tank as distinct cards.

**Leave:**
- Login-first character creation. Forevercraft has no accounts (see [[Roadmap]] "Shelved": accounts are out of scope).
- Cosmetic character wizards. A BIS planner doesn't need appearance.
- Presets as the only mode. Forevercraft's differentiator is the unified flow, so a builder has to come first; presets follow.
