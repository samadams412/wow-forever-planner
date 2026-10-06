# foreverchanges.pro — UX / feature audit

Research only. No app code touched. Browsed live in Chrome on 2026-10-06 (beta build 1.60.1.70205).

Pages actually visited: homepage, `/class/warrior`, `/dungeons`, `/dungeons/shadowfang-keep`, `/dungeons/gnomeregan` (URL only), `/quests`, `/quests/elwynn-forest`, `/quest/783` (A Threat Within), `/item/2224` (Militia Dagger), site search. Not visited in depth: `/map`, `/guides`, `/patch-notes`, `/bis`, `/racials`, `/legacy-perks`, `/professions`, `/items` listing, `/tier-list`, the footer guide pages. Gaps are called out where they matter.

---

## 1. Navigation structure

**Header is flat. There is no dropdown.** Thirteen top-level items, in this order:

| Item | Path | Notes |
|---|---|---|
| Changes | `/class/<class>` | Default landing = class changes page |
| Talents | `/talents/<class>` | Calculator |
| Spellbook | `/spellbook/<class>` | |
| Legacy | `/legacy-perks` | |
| Professions | `/professions` | |
| Races | `/racials` | |
| Dungeons | `/dungeons` | Badge: "New" |
| Items | `/items` | |
| Quests | `/quests` | |
| BiS list | `/bis` | Badge: "New" |
| World map | `/map` | |
| Guides | `/guides` | Badge: "New" |
| Patch notes | `/patch-notes` | |

Status items sit in the header too: a "Beta realms offline / back online" link to `/server-status`, a countdown to launch linking to `/beta`, and an "Updated · Beta build …" link to patch notes.

**Structure by page type:**
- **Class** (`/class/<class>`): the class is the organising unit. A class selector row sits at the top of the homepage and the class pages, and each class page holds three sub-tools: changes, talents, spellbook.
- **Dungeon** (`/dungeons/<slug>`): dungeon is the unit. Each has sub-anchors (`#quests`), a link to the map, and a "Dungeons by level" sidebar.
- **Quest** (`/quests` → `/quests/<zone>` → `/quest/<id>`): three levels. A global list of 5,190 quests, then a per-zone page, then a per-quest page. Zone pages have a zone picker.
- **Item** (`/items` → `/item/<id>`): list then detail.

**How this maps to our current IA:** Items, Quests, and Dungeons are all top-level for them, with Professions also top-level. We have all nine of these items under one Reference dropdown.

---

## 2. Cross-linking pattern

Linking is dense, consistent, and looks **data-driven** — the same template appears on every quest, item, and dungeon, with the same kinds of links. I did not crawl enough to rule out hand-curation for every case, but the uniform structure points to generation.

- **Quest → zone:** every quest links to its zone (`/quests/elwynn-forest`) and to the zone on the world map (`/map/eastern-kingdoms/elwynn-forest`, "Open the zone on the world map").
- **Quest → NPCs and coordinates:** start and end NPCs are listed with coordinates (e.g. `48.2, 42.9`), and the NPC names are links.
- **Quest → reward items:** each reward is a link to `/item/<id>`.
- **Quest → class siblings / chain:** class-specific variants link to each other (A Threat Within links to the Warrior/Paladin/Rogue/Priest/Mage/Warlock versions by id).
- **Quest → related quests in the zone:** a "related" block of other quests in the same zone.
- **Item → quest that rewards it:** the item page has a "Quests" section linking back ("A reward to choose from — Brotherhood of Thieves, Level 4, Alliance"). **Item → dungeon:** I didn't confirm this on the dungeon-only items I checked; it's probably there for boss drops (not verified).
- **Dungeon → map, bosses, quests:** the dungeon page links to the entrance on the world map, has a boss list, and a "Before you go → Quests (3)" block with an in-page anchor.
- **Class → talents, spellbook, races:** the class page links to the talent calculator and spellbook, and lists races that can play the class.
- **Search → everything:** see §5.

Depth: at least two hops work cleanly (item → quest → zone → map). I didn't test three.

---

## 3. Footer

One long link sequence in the DOM. It is **not** grouped into labelled sections in the markup I saw (I did not confirm the visual columns in the rendered layout). Order, as it appears:

1. Support: a Ko-fi link (the only external link in the footer)
2. The nine classes
3. Tools: Talent calculator, Spellbook, Legacy perks, Races, Professions, Downrank calculator, Tier list maker, BiS list, Items, Hidden items, Transmog, World map, Dungeons, Quests, Dungeon quests, Rare spawns, Library books
4. **Guide pages mixed in with tools**, with no separation: Scarlet Banner, $100,000 duel tournament, Level 30, Druid Cat Form quest, Addons, Savory Whimsyfin Delight, Druid snake form, Battle mage, Cozy Sleeping Bag, and more

So the footer is a sitemap dump. Guide slugs are promoted there, and it has no category grouping. Not a pattern to copy.

---

## 4. "Online now" counter — is it honest?

**Verdict: the number does not behave like a live count. Treat it as decorative.** I did not build a confident case either way beyond this evidence, and I could not read the underlying values (the JS tool blocked those reads).

What was observed:
- Shows **"ONLINE NOW 1,856 MURLOCS"** with a murloc mascot, in the header of every page I opened (homepage, class, dungeon, quests, quest, item).
- **The value never moved.** Sampled every 4 seconds over ~24 seconds on one page: 1,856 each time. Then fresh loads on four different pages: 1,856 each time.
- For a site with real traffic, a concurrent count would move within a minute. A fixed number across reloads and pages is the strongest signal here.
- Network: the first 100 requests on a dungeon page contain **no count/API request**. The only analytics-like calls are `GET /rt/s.js` and `POST /rt/e` (202). I did not inspect the POST body.
- The inline script for the counter reads and writes a **`localStorage` key with an `fc-online` prefix**. That suggests the number is computed or seeded in the browser, not counted on a server. Also, the sample output showed the script reading that key. I did not read the value itself.

**Recommendation:** don't build a counter like this. If we want a social signal, use something true (for example, "last updated" for the data, or our build-tracking aggregates once they're read back). A fake or seeded count is the kind of thing that erodes trust on a site whose whole pitch is data confidence.

---

## 5. Search

- A single search box in the header and on the homepage ("Search a spell, an item, a zone, a dungeon…"). The header also has a `/` keyboard shortcut (the label reads "Search /").
- **Results are grouped by type in one dropdown**: Items, Zones and maps, Dungeons and bosses, Quests. Keyboard hints in the footer of the dropdown: ↑↓ to choose, Enter to open, Esc to close.
- **Cross-category: yes.** Query "Shadowfang" returned:
  - Items: "Shadowfang" (Changed from Classic, item level 24)
  - Zones and maps: "Shadowfang Keep" twice (one as a map, one as a place in Silverpine Forest)
  - Dungeons and bosses: "Shadowfang Keep" (dungeon, level 22–30)
  - Quests: "Deathstalkers in Shadowfang" (level 25, Horde)
- Each result has a category subtitle, which helps disambiguate duplicates. The duplicate "Shadowfang Keep" (map vs. place) is a small rough edge.
- Searches are case-insensitive substring-ish; I didn't test fuzzy matching or typos.

---

## 6. Header image treatment

Each page has a faded background image under a "masthead" block.

- Element: `div.p-masthead`, with `background-image` set to a `.webp` per page, `background-size: cover`, `background-position: 50% 40%`.
- Overlay: a `::before` pseudo-element with a **vertical gradient** from `rgba(11,15,21,0.72)` at the top, to `rgba(11,15,21,0.55)` at 50%, to `rgba(11,15,21,0.92)` at the bottom. Plus a **radial gold glow** (`radial-gradient(60% 120% at 50% 100%, …)`) rising from the bottom edge.
- No `mix-blend-mode`, no `filter`. The fade is entirely the gradient overlay, not opacity on the image.

Reproducible in our theme: a `relative` container with the background image, plus an `absolute inset-0` layer with the same stacked gradient, and a bottom-anchored radial glow. Keep the image at `cover` with a fixed focal point. No blend modes needed.

---

## 7. Comparison and recommendations

### Where we stand
- Planner, Reference (9 items under a dropdown), Guides, Blog.
- Items, Quests, Dungeons, and Professions are all **under Reference** and get nav-level prominence only via the dropdown.

### Is the Reference burial hurting discoverability?
**Probably yes, and the evidence is structural.** Items, Quests, and Dungeons are destinations people search for by name (a boss, a quest, a drop). Racials and Legacy Perks are lookups people hit once. Putting destination pages and one-off lookups under the same dropdown makes both harder to find. The competitor keeps the top-level bar short but gives each destination its own slot.

We can't measure our traffic from here, so this is a judgment, not a measured result.

### Proposed structure
Top-level (5–7 items):
- **Planner** (class-first, as today)
- **Dungeons**
- **Quests**
- **Items**
- **Professions**
- **Guides**
- **Reference** (dropdown keeps Racials, Legacy Perks, Class Spellbooks, Dungeon Level Ranges, World Map if we keep it there)

Or, if the World Map is a flagship: promote it too and drop Reference to four children.

Keep the **class-first** entry point we already have — their "Changes" page is a good version of the same idea and our planner-first is already aligned with it.

### Ideas, grouped by priority

**Clearly good — prioritise:**
1. **Promote Items / Quests / Dungeons to top-level nav** (see above). Low effort, high expected impact.
2. **Unified search with category groups.** Items, zones/maps, dungeons/bosses, quests in one dropdown, with `/` as a shortcut. Our planner-first flow makes this more valuable, not less.
3. **Classic-vs-Forever side-by-side tooltip** on item and spell pages. Their item page does this well, and it's a direct fit for a "what changed" site.
4. **Data-confidence badges on detail pages** (Hidden / Datamined / Confirmed in game; "Unchanged in Forever as far as is known"). This matches our existing confidence model in `CLAUDE.md` — copy the *pattern* (per-page badge with plain-language status and a note on where the data came from), not their wording.
5. **Class-page change list with filter tabs** (All / New / Changed / Moved / Removed / Spells, with counts). Our class page already has changes — the tab filter is a quick win if we don't have it.
6. **Quest → zone → map and item → quest back-links.** Mostly data-driven; we likely already have the data.

**Worth doing, lower priority:**
7. **Search result subtitles** (category + level) to disambiguate duplicate names.
8. **Header status strip** (server status, launch countdown, last-updated). Useful for a beta site, and cheap. Keep it honest — link to the real source.
9. **Per-quest chain and class-variant links** (the Warrior/Paladin/… sibling quest list). Good for leveling content.

**Marginal or don't copy:**
10. **"Online now" counter** — see §4. Don't build a fake one.
11. **Footer as a flat sitemap dump with guides mixed into tools.** Build a grouped footer instead.
12. **Ko-fi support link** — a monetisation-adjacent choice. We're not monetised, so it's not ours to copy.

### Things we should not copy
- Their text, images, and exact layouts. Patterns only.
- The Ko-fi link and any "online" counter.

---

## Open questions / follow-ups
- Confirm whether dungeon-only items link back to dungeons (I only checked a quest reward item).
- Visit `/map`, `/guides`, `/bis`, `/racials`, `/professions`, `/items` listing to finish the nav pass.
- Check the footer's rendered columns on desktop and mobile (I read the DOM order only).
- Decide whether the top-level nav change (§7) should be its own task, separate from search and the tooltip work — they're independent.
