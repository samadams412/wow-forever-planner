#!/usr/bin/env node
// Fetches each dungeon's /dungeons/<slug> page from foreverchanges.pro and
// extracts ONLY the #quests chapter (quest name, giver, objectives, rewards,
// and /map link references) into data/sources/foreverchanges_dungeon_data/<slug>.quests.json
//
// Deliberately skips "Before You Go", "Quest Items" and "Where Quests Start" --
// their relevant content is already duplicated inside the quests section itself.
//
// Usage: node scripts/extract-foreverchanges-quests.js [--slugs=a,b,c] [--offline-dir=/tmp]

const fs = require("fs");
const path = require("path");

const ALL_SLUGS = [
  "hall-of-thanes", "ragefire-chasm", "ruins-of-lordaeron", "wailing-caverns",
  "the-deadmines", "shadowfang-keep", "excavation-site", "blackfathom-deeps",
  "the-stockade", "city-of-dalaran", "gnomeregan", "razorfen-kraul",
  "scarlet-monastery-graveyard", "scarlet-monastery-library", "the-drowned-city",
  "scarlet-monastery-armory", "razorfen-downs", "scarlet-monastery-cathedral",
  "kroldok-stronghold", "uldaman", "zulfarrak", "maraudon", "alcaz-prison",
  "sunken-temple", "blackrock-depths", "dire-maul-east", "blackmaw-hold",
  "lower-blackrock-spire", "dire-maul-north", "dire-maul-west", "scholomance",
  "shapers-terrace", "stratholme-main-gate", "stratholme-service-gate",
  "upper-blackrock-spire",
];

const OUT_DIR = path.join(__dirname, "..", "data", "sources", "foreverchanges_dungeon_data");

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

function extractChapter(html, name) {
  const startMarker = `<section id="${name}" class="dgx-chapter"`;
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

function splitTopLevel(html, openTagRegex) {
  // Splits html into chunks starting at each match of openTagRegex (siblings only,
  // relies on openTagRegex matching a distinctive opening tag that doesn't nest).
  const matches = [...html.matchAll(openTagRegex)];
  const chunks = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : html.length;
    chunks.push(html.slice(start, end));
  }
  return chunks;
}

function parseNeedItems(ddHtml) {
  // "Bring back" fields can hold a <ul class="dgx-need"> of {icon, item link+name, qty, source(s)}
  // instead of plain text -- parse that structure explicitly rather than flattening it.
  const ulMatch = ddHtml.match(/<ul class="dgx-need">(.*?)<\/ul>/s);
  if (!ulMatch) return null;
  const items = [...ulMatch[1].matchAll(/<li>(.*?)<\/li>/gs)].map((m) => {
    const block = m[1];
    const itemMatch = block.match(/<a href="(\/item\/[^"]+)">(.*?)<\/a>/s);
    const smallMatch = block.match(/<small>(.*?)<\/small>/s);
    // text between </a> and <small> (or end) holds the "×N" quantity, if present
    let qtyText = block;
    if (itemMatch) qtyText = qtyText.slice(qtyText.indexOf(itemMatch[0]) + itemMatch[0].length);
    if (smallMatch) qtyText = qtyText.slice(0, qtyText.indexOf(smallMatch[0]));
    return {
      itemHref: itemMatch ? itemMatch[1] : null,
      name: itemMatch ? stripTags(itemMatch[2]) : null,
      qty: stripTags(qtyText) || null,
      source: smallMatch ? stripTags(smallMatch[1]) : null,
    };
  });
  return items;
}

function parseFields(dlHtml) {
  if (!dlHtml) return [];
  const dts = [...dlHtml.matchAll(/<dt>(.*?)<\/dt>/gs)].map((m) => stripTags(m[1]));
  const ddBlocks = [...dlHtml.matchAll(/<dd>(.*?)<\/dd>/gs)].map((m) => m[1]);
  const fields = [];
  for (let i = 0; i < dts.length; i++) {
    const ddHtml = ddBlocks[i] || "";
    const mapMatch = ddHtml.match(/<a href="(\/map[^"]*)">(.*?)<\/a>/s);
    const mapRef = mapMatch ? { name: stripTags(mapMatch[2]), href: mapMatch[1] } : null;
    const needItems = parseNeedItems(ddHtml);
    fields.push({ label: dts[i], value: stripTags(ddHtml), mapRef, needItems });
  }
  return fields;
}

function parseRewards(rewardHtml) {
  if (!rewardHtml) return { rewardHeading: null, rewardNotes: [], rewards: [] };
  const headingMatch = rewardHtml.match(/<h5>(.*?)<\/h5>/s);
  const rewardHeading = headingMatch ? stripTags(headingMatch[1]) : null;
  // top-level <p> notes: those appearing before the <ul class="lb-rows">
  const ulIdx = rewardHtml.indexOf('<ul class="lb-rows"');
  const notesHtml = ulIdx === -1 ? rewardHtml : rewardHtml.slice(0, ulIdx);
  const rewardNotes = [...notesHtml.matchAll(/<p>(.*?)<\/p>/gs)].map((m) => stripTags(m[1]));
  const rewards = [...rewardHtml.matchAll(/<li class="lb-row">(.*?)<\/li>/gs)].map((m) => {
    const block = m[1];
    const hrefMatch = block.match(/<a href="([^"]+)">/);
    const nameMatch = block.match(/<span class="lb-name[^"]*">(.*?)<\/span>/s);
    const typeMatch = block.match(/<span class="lb-type">(.*?)<\/span>/s);
    return {
      itemHref: hrefMatch ? hrefMatch[1] : null,
      name: nameMatch ? stripTags(nameMatch[1]) : null,
      type: typeMatch ? stripTags(typeMatch[1]) : null,
    };
  });
  return { rewardHeading, rewardNotes, rewards };
}

function parseQuestSection(secHtml) {
  const idMatch = secHtml.match(/<section class="dgx-quest" id="([^"]+)"/);
  const nameMatch = secHtml.match(/<h4[^>]*>(.*?)<\/h4>/s);
  const headerPMatch = secHtml.match(/<\/h4><\/header>|<header>.*?<h4[^>]*>.*?<\/h4>\s*<p>(.*?)<\/p>/s);
  // header's level <p> comes right after </header> open? Actually it's inside <header>...<p>Level..</p></header>
  const levelMatch = secHtml.match(/<header>.*?<p>(.*?)<\/p><\/header>/s);
  const questTextMatch = secHtml.match(/<p class="dgx-quest-text">(.*?)<\/p>/s);
  const dlMatch = secHtml.match(/<dl>(.*?)<\/dl>/s);
  const rewardMatch = secHtml.match(/<div class="dgx-reward">(.*?)<\/div><\/section>/s) ||
    secHtml.match(/<div class="dgx-reward">(.*?)<\/div>\s*$/s);
  const { rewardHeading, rewardNotes, rewards } = parseRewards(rewardMatch ? rewardMatch[1] : null);
  return {
    id: idMatch ? idMatch[1] : null,
    name: nameMatch ? stripTags(nameMatch[1]) : null,
    levelText: levelMatch ? stripTags(levelMatch[1]) : null,
    questText: questTextMatch ? stripTags(questTextMatch[1]) : null,
    fields: parseFields(dlMatch ? dlMatch[1] : null),
    rewardHeading,
    rewardNotes,
    rewards,
  };
}

function parseQuestsChapter(html) {
  const chapter = extractChapter(html, "quests");
  if (!chapter) return null;
  const sideBlocks = splitTopLevel(chapter, /<div class="dgx-side"/g);
  const groups = sideBlocks.map((sideHtml) => {
    const h3Match = sideHtml.match(/<h3>(.*?)<\/h3>/s);
    const groupNameFull = h3Match ? stripTags(h3Match[1]) : null;
    const questSections = splitTopLevel(sideHtml, /<section class="dgx-quest"/g).filter((s) =>
      s.startsWith('<section class="dgx-quest"')
    );
    const quests = questSections.map(parseQuestSection);
    return { groupNameFull, quests };
  });
  return groups;
}

async function fetchHtml(slug, offlineDir) {
  if (offlineDir) {
    const p = path.join(offlineDir, `${slug}.html`);
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  const res = await fetch(`https://foreverchanges.pro/dungeons/${slug}`);
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slugs="));
  const offlineArg = args.find((a) => a.startsWith("--offline-dir="));
  const slugs = slugArg ? slugArg.slice("--slugs=".length).split(",") : ALL_SLUGS;
  const offlineDir = offlineArg ? offlineArg.slice("--offline-dir=".length) : null;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const summary = [];
  for (const slug of slugs) {
    try {
      const html = await fetchHtml(slug, offlineDir);
      const groups = parseQuestsChapter(html);
      const outPath = path.join(OUT_DIR, `${slug}.quests.json`);
      const data = { id: slug, source: "foreverchanges.pro", section: "quests", groups: groups || [] };
      fs.writeFileSync(outPath, JSON.stringify(data, null, 1));
      const questCount = (groups || []).reduce((n, g) => n + g.quests.length, 0);
      summary.push({ slug, groups: (groups || []).length, quests: questCount });
      console.log(`${slug}: ${(groups || []).length} group(s), ${questCount} quest(s)`);
    } catch (err) {
      summary.push({ slug, error: String(err) });
      console.error(`${slug}: ERROR ${err}`);
    }
  }
  console.log("\n--- summary ---");
  console.log(JSON.stringify(summary, null, 1));
}

main();
