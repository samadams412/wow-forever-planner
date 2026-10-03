#!/usr/bin/env node
// Fetches each dungeon's /dungeons/<fc-slug> page from foreverchanges.pro and
// extracts the "Map, bosses and loot" chapter's TWO things not already
// captured by fetch-foreverchanges-dungeon-loot.js's JSON-endpoint pull (loot
// only) or extract-foreverchanges-quests.js (quests only):
//   - the boss/trash/rare/entrance map pins (CSS left/top percent over a
//     fixed-size map image, same encoding QuestMapViewer.tsx already uses)
//   - each boss's "what to watch for" ability list (name/flags/description),
//     which exists only as rendered HTML -- confirmed in-session (network
//     tab showed zero requests when switching bosses) to be server-rendered
//     up front for every boss, just CSS/hidden-attribute toggled, so a plain
//     fetch + regex parse is enough; no Playwright needed.
//
// Output: data/sources/foreverchanges/dungeon_data/<fc-slug>.mapdata.json
// (one per foreverchanges slug -- several of our own dungeon ids share one
// fc slug for split wings, see scripts/dungeon-source-map.js, so this is
// keyed/dedup'd by fc slug, not our id).
//
// Map image itself is hotlinked (https://foreverchanges.pro/dungeons/maps/
// <slug>.webp), same as this project's existing boss-portrait/background-art
// convention (build-dungeons.js) -- not downloaded/rehosted. A handful of
// dungeons (confirmed: excavation-site, hall-of-thanes, ruins-of-lordaeron)
// use a commissioned fan map credited "by the artist <name>, shown here with
// <his/her> permission" -- that permission was granted to foreverchanges.pro
// specifically, so `attribution` captures the artist name + their own site
// link verbatim for display credit; never rehost that file, only hotlink it.
//
// Raw HTML is cached to data/sources/foreverchanges/raw-html/<fc-slug>.html
// (gitignored -- see .gitignore) so a parser bug doesn't require re-hitting
// the live site; delete that directory to force a fresh pull.
//
// Usage: node scripts/extract-foreverchanges-dungeon-maps.js [--slugs=a,b,c] [--offline-dir=/tmp]
// --slugs takes OUR dungeon ids (data/dungeons.json), resolved to fc slugs
// via dungeon-source-map.js, same as the rest of this pipeline.

const fs = require("fs");
const path = require("path");
const DUNGEON_SOURCE_MAP = require("./dungeon-source-map");

const OUT_DIR = path.join(__dirname, "..", "data", "sources", "foreverchanges", "dungeon_data");
const RAW_DIR = path.join(__dirname, "..", "data", "sources", "foreverchanges", "raw-html");

// Dungeons foreverchanges.pro has no boss data for at all yet as of
// 2026-10-02 (levels 40-60 new zones, "Not open in the beta yet") -- skip
// fetching these by default; re-run with an explicit --slugs= once beta
// reaches them.
const NOT_OPEN_YET = new Set(["alcaz-prison", "blackmaw-hold", "kroldok-stronghold", "shapers-terrace", "city-of-dalaran", "drowned-city"]);

const DELAY_MS = 1500;

function decodeEntities(str) {
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&times;/g, "×")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html) {
  return decodeEntities(html.replace(/<!--.*?-->/gs, "").replace(/<[^>]+>/g, "")).trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractChapter(html, id) {
  const startMarker = `<section id="${id}" class="dgx-chapter"`;
  const start = html.indexOf(startMarker);
  if (start === -1) return null;
  const nextChapterIdx = html.indexOf('class="dgx-chapter"', start + startMarker.length);
  let end;
  if (nextChapterIdx === -1) {
    end = html.length;
  } else {
    end = html.lastIndexOf('<section id="', nextChapterIdx);
    if (end === -1 || end <= start) end = html.length;
  }
  return html.slice(start, end);
}

// foreverchanges.pro's own numeric NPC display id, as used throughout this
// project for boss-portrait URLs -- `https://foreverchanges.pro/wow-ui/
// bosses/<display>.webp` (see build-dungeons.js).
function displayFromFaceUrl(html) {
  const m = html.match(/\/wow-ui\/bosses\/(\d+)\.webp/);
  return m ? Number(m[1]) : null;
}

// The server-rendered DOM (`<figure class="dgx-bm-map">`) only ever contains
// the FIRST floor's image/pins for a multi-floor dungeon (Blackfathom Deeps
// has 3) -- the other floors only exist in the page's React Flight stream
// (the `self.__next_f.push([1,"..."])` script calls that hydrate the client
// map-viewer component), never in the initial HTML. That stream also already
// carries `by`/`byUrl` (artist attribution) as structured fields instead of
// the figcaption prose the old DOM-only parser had to pattern-match, so it's
// the primary source for all of this now, not just the multi-floor case.
//
// Each `self.__next_f.push([1,"<escaped JSON>"])` call is a JS string
// literal (standard \" escaping) holding one "<rowId>:<payload>" line of the
// stream; concatenating every pushed string's *unescaped* content (a plain
// JSON.parse of the quoted literal does the unescaping) reconstructs the
// full stream as normal text with real quotes/brackets, inside which a
// `"map":{"by":...,"floors":[...]}` object can be found and bracket-matched
// like ordinary JSON.
function unescapeFlightPushes(html) {
  const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  let out = "";
  let m;
  while ((m = re.exec(html))) {
    try {
      out += JSON.parse(m[1]);
    } catch {
      // malformed/truncated chunk -- skip it, the marker we need is unlikely
      // to straddle exactly this boundary across the whole page
    }
  }
  return out;
}

// Scans forward from a '{' or '[' to its matching close, string-aware (a
// quote toggles in/out of a string, a backslash escapes the next char while
// inside one) so brackets inside string values (tooltip text, etc.) don't
// throw off the depth count.
function extractBalanced(text, startIdx) {
  let depth = 0;
  let inStr = false;
  for (let i = startIdx; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
  }
  return null;
}

function undef(v) {
  return v === "$undefined" || v === undefined ? null : v;
}

function parseMapFromFlight(html) {
  const flight = unescapeFlightPushes(html);
  const marker = '"map":{"by"';
  const idx = flight.indexOf(marker);
  if (idx === -1) return null;
  const objStr = extractBalanced(flight, idx + '"map":'.length);
  if (!objStr) return null;
  let raw;
  try {
    raw = JSON.parse(objStr);
  } catch {
    return null;
  }
  const by = undef(raw.by);
  return {
    alt: raw.alt,
    attribution: by ? { artistName: by, artistUrl: raw.byUrl } : null,
    floors: (raw.floors || []).map((f) => ({
      name: undef(f.name),
      src: f.src,
      width: f.width,
      height: f.height,
      pins: (f.pins || []).map((p) => ({
        label: undef(p.label),
        xPct: p.x,
        yPct: p.y,
        kind: p.kind || p.faceKind || "boss",
        display: p.face ?? null,
      })),
    })),
  };
}

function parseAbilityList(fightHtml) {
  if (!fightHtml) return [];
  return [...fightHtml.matchAll(/<li><img src="([^"]*)"[^>]*\/><div><p class="lb-ability">(.*?)<\/p><p>(.*?)<\/p><\/div><\/li>/gs)].map(
    (m) => {
      const [, icon, abilityHtml, descHtml] = m;
      const nameMatch = abilityHtml.match(/<strong>(.*?)<\/strong>/s);
      const flags = [...abilityHtml.matchAll(/class="dj-flag"[^>]*title="([^"]*)"/g)].map((f) => f[1]);
      return { name: nameMatch ? stripTags(nameMatch[1]) : null, icon, flags, description: stripTags(descHtml) };
    }
  );
}

function parseBossSections(loot) {
  const sectionStarts = [];
  // `data-kind` on the section itself distinguishes rare/trash groupings
  // from a regular boss (absent) -- e.g. a roaming rare's header reads "Rare
  // spawn, Level 26, appears at one of the 4 places on the map" rather than
  // a plain "Level N", and pure-trash groupings ("Trash mobs") carry no
  // level at all. Matches this project's own LootBoss.kind enum.
  const sectionRe = /<section id="([a-z0-9-]+)" class="lb-boss"(?: data-kind="([a-z]+)")?/g;
  let m;
  while ((m = sectionRe.exec(loot))) sectionStarts.push({ idx: m.index, id: m[1], kind: m[2] || "boss" });

  return sectionStarts.map(({ idx, id, kind }, i) => {
    const end = i + 1 < sectionStarts.length ? sectionStarts[i + 1].idx : loot.length;
    const section = loot.slice(idx, end);

    const nameMatch = section.match(/<h2 id="h-[a-z0-9-]+">(.*?)<\/h2>/s);
    const headerEnd = section.indexOf("</header>");
    const headerMatch = section.slice(0, headerEnd === -1 ? section.length : headerEnd).match(/<\/h2><p>(.*?)<\/p>/s);
    const levelMatch = headerMatch ? headerMatch[1].match(/Level (\d+)/) : null;
    const display = displayFromFaceUrl(section.slice(0, headerEnd + 1));

    const triggerMatch = section.match(
      /<p class="lb-trigger"><span class="lb-trigger-mark">(.*?)<\/span><\/span>(?:<span>)?(.*?)<\/span><\/p>/s
    );
    let trigger = null;
    if (triggerMatch) {
      const flagMatch = triggerMatch[1].match(/title="([^"]*)"/);
      trigger = { flag: flagMatch ? flagMatch[1] : null, text: stripTags(triggerMatch[2]) };
    }

    const fightMatch = section.match(/<div class="lb-fight">(.*?)<\/div><ul class="lb-rows">/s) ||
      section.match(/<div class="lb-fight">(.*?)<\/div><\/section>/s);

    return {
      id,
      kind,
      name: nameMatch ? stripTags(nameMatch[1]) : null,
      level: levelMatch ? Number(levelMatch[1]) : null,
      display,
      trigger,
      abilities: parseAbilityList(fightMatch ? fightMatch[1] : null),
    };
  });
}

async function fetchHtml(slug, offlineDir) {
  if (offlineDir) {
    const p = path.join(offlineDir, `${slug}.html`);
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  const res = await fetch(`https://foreverchanges.pro/dungeons/${slug}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ForevercraftResearch/1.0)" },
  });
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  const html = await res.text();
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.writeFileSync(path.join(RAW_DIR, `${slug}.html`), html);
  return html;
}

async function main() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slugs="));
  const offlineArg = args.find((a) => a.startsWith("--offline-dir="));
  const offlineDir = offlineArg ? offlineArg.slice("--offline-dir=".length) : null;

  const ourIds = slugArg
    ? slugArg.slice("--slugs=".length).split(",")
    : Object.keys(DUNGEON_SOURCE_MAP).filter((id) => !NOT_OPEN_YET.has(DUNGEON_SOURCE_MAP[id].fc));

  // Dedup by fc slug -- several of our ids (Dire Maul wings, Blackrock Spire
  // wings, Stratholme sides, SM wings) are distinct pages on foreverchanges
  // too (confirmed: each has its own slug, unlike the shared `art` field),
  // so no actual collapsing happens here today, but keep the dedup in case
  // that ever changes.
  const fcSlugs = [...new Set(ourIds.map((id) => DUNGEON_SOURCE_MAP[id].fc))];

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const summary = [];
  for (const slug of fcSlugs) {
    try {
      const html = await fetchHtml(slug, offlineDir);
      const loot = extractChapter(html, "loot");
      if (!loot) throw new Error("no #loot chapter found");
      const map = parseMapFromFlight(html);
      const bosses = parseBossSections(loot);
      const data = { id: slug, source: "foreverchanges.pro", section: "map-and-abilities", map, bosses };
      fs.writeFileSync(path.join(OUT_DIR, `${slug}.mapdata.json`), JSON.stringify(data, null, 1));
      const abilityCount = bosses.reduce((n, b) => n + b.abilities.length, 0);
      const pinCount = map ? map.floors.reduce((n, f) => n + f.pins.length, 0) : 0;
      summary.push({ slug, map: !!map, floors: map?.floors.length ?? 0, pins: pinCount, bosses: bosses.length, abilities: abilityCount });
      console.log(`${slug}: map=${!!map} floors=${map?.floors.length ?? 0} pins=${pinCount} bosses=${bosses.length} abilities=${abilityCount}`);
    } catch (err) {
      summary.push({ slug, error: String(err) });
      console.error(`${slug}: ERROR ${err}`);
    }
    if (!offlineDir) await sleep(DELAY_MS);
  }
  console.log("\n--- summary ---");
  console.log(JSON.stringify(summary, null, 1));
}

main();
