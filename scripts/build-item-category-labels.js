// One-time pull: fetch one representative item per distinct {c (item class),
// u (item subclass)} combo from foreverchanges.pro's individual item pages,
// and record the exact category label text the site displays for that
// combo. This is what data/sources/foreverchanges_items/*.json's bulk
// exports never carry (see fc-item.js's buildSyntheticTooltip) -- only the
// per-item page renders it, as plain server-rendered HTML, not a JSON API
// (confirmed: zero XHR/fetch requests on an item page's Network tab).
//
// Only 63-81 distinct combos exist across the whole 21,458-item catalog
// (stable Blizzard item-class/subclass IDs, not beta data that drifts), so
// this is a one-time ~81-request pull, not a per-item scrape. Run again only
// if a future data pull introduces a c:u combo not in
// data/sources/item-category-labels.json.
//
// Usage: node scripts/build-item-category-labels.js

const fs = require("fs");
const path = require("path");

const SOURCES_DIR = path.join(__dirname, "..", "data", "sources", "foreverchanges_items");
const OUT_PATH = path.join(__dirname, "..", "data", "sources", "item-category-labels.json");

async function main() {
  const seen = new Map(); // "c:u" -> representative item id
  for (const file of ["new", "changed", "same", "missing"]) {
    const data = JSON.parse(fs.readFileSync(path.join(SOURCES_DIR, `${file}.json`), "utf8"));
    for (const it of data.items) {
      const key = `${it.c}:${it.u}`;
      if (!seen.has(key)) seen.set(key, it.i);
    }
  }

  console.log(`Fetching ${seen.size} representative items (one per c:u combo)...`);

  const labels = {};
  let i = 0;
  for (const [key, itemId] of seen) {
    i++;
    const url = `https://foreverchanges.pro/item/${itemId}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) {
      console.warn(`  [${i}/${seen.size}] ${key} (item ${itemId}): HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();

    // Two "it-tip it-labelled" panes render per item: Classic Era first,
    // Forever beta second -- and they are NOT just a value diff, the two
    // clients render this category line at different granularity (Classic
    // Era shows the item CLASS name, e.g. "Consumable"; Forever beta shows
    // the SUBCLASS name, e.g. "Potions"). We want what a Forever player
    // actually sees, so take the second pane only.
    // Two "it-tip it-labelled" panes render per item: Classic Era first,
    // Forever beta second. The literal string "Forever beta" also appears
    // several other places on the page (nav/RSC duplicate blobs), so anchor
    // on the actual pane label element, not the bare substring.
    let foreverIdx = html.indexOf('it-label">Forever beta');
    if (foreverIdx === -1) {
      console.warn(`  [${i}/${seen.size}] ${key} (item ${itemId}): no Forever beta pane found`);
      continue;
    }
    let foreverHtml = html.slice(foreverIdx);
    let usedFallback = false;
    // A handful of subclasses (e.g. Trade Goods 7:0, 7:3) exist ONLY in
    // missing.json -- no item of that subclass has any Forever-beta data at
    // all yet, so the Forever pane renders "No Forever data yet." with no
    // category line to read. Fall back to the Classic Era pane in that case
    // -- still real rendered text, just not Forever-specific.
    if (/^it-label">Forever beta[^<]*<\/div>No Forever data yet\./.test(foreverHtml)) {
      const classicIdx = html.indexOf('it-label">Classic Era');
      if (classicIdx !== -1) {
        foreverHtml = html.slice(classicIdx);
        usedFallback = true;
      }
    }

    // Within that pane's it-body, the type/category line renders one of two
    // shapes:
    //   - equippable items: <div class="it-line ..."><span>Slot</span><span>Subclass</span></div>
    //   - everything else:  <div class="it-line ...">Subclass</div>  (flat text, no spans)
    // It is usually, but not always, the first it-line -- some BoE/unique/
    // quest items render a flag line ("Binds when equipped", "Unique",
    // "Quest Item") before it, so scan for the first line that either has
    // the two-span shape or isn't one of those known flag lines.
    const FLAG_LINE = /^(Binds when (equipped|picked up|used)|Unique(\s*\(\d+\))?|Quest Item)$/i;
    const lineRe = /it-line it-\w+">(.*?)<\/div>/g;
    let subclassLabel = null;
    let match;
    while ((match = lineRe.exec(foreverHtml))) {
      const inner = match[1];
      const spanMatches = [...inner.matchAll(/<span>([^<]*)<\/span>/g)];
      if (spanMatches.length >= 2) {
        subclassLabel = spanMatches[1][1].trim();
        break;
      }
      const text = inner.replace(/<!-- -->/g, "").replace(/&amp;/g, "&").trim();
      // A real category label is a short plain phrase. Some items with no
      // normal tooltip structure at all (e.g. the WoW Token, c:u 18:0) fall
      // through to a flavor-text line instead -- reject anything that looks
      // like prose rather than a label, and leave it null for manual review.
      if (text && !FLAG_LINE.test(text) && text.length <= 30 && !text.includes('"') && !/&quot;/.test(inner)) {
        subclassLabel = text;
        break;
      }
    }

    labels[key] = { subclassLabel, sourcedFromClassic: usedFallback || undefined };
    console.log(`  [${i}/${seen.size}] ${key} (item ${itemId}): ${JSON.stringify(labels[key])}`);

    // Rate-limit: this is a one-time manual pull, be polite.
    await new Promise((r) => setTimeout(r, 300));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(labels, null, 2) + "\n");
  console.log(`Wrote ${Object.keys(labels).length} labels to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
