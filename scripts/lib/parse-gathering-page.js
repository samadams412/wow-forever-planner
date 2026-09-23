// Parses foreverchanges.pro's /professions/<slug> pages for the 3
// gathering professions (Mining, Herbalism, Skinning) -- studied live
// before writing this: their page structure is genuinely NOT the crafting-
// profession shape parse-profession-page.js handles (confirmed by
// checking each of the 3 live, not assumed from Mining alone):
//   - Mining:    chapters nodes, leveling, smelting, camp
//   - Herbalism: chapters nodes, leveling, camp (no smelting)
//   - Skinning:  chapters skin, camp only -- no separate "nodes" list at
//     all (no named nodes exist for skinning) and its single "skin" list
//     already IS the leveling guide (range + beast-level band + zones +
//     typical items), not two separate chapters.
// "Camp, skill rewards and perks" (id="camp") is the one chapter that
// really is identical in markup to the crafting version -- reuses
// parseCampSection from parse-profession-page.js directly. Gathering pages
// never render a "Legacy points and title" list at all (no per-profession
// Certification/title track for these 3), so that part of the shared
// parser correctly comes back empty -- not a gap to work around.

const BASE = "https://foreverchanges.pro";

function cleanText(html) {
  return html
    .replace(/<!-- -->/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "")
    .trim();
}

function absUrl(href) {
  return href.startsWith("http") ? href : `${BASE}${href}`;
}

function parseMatItems(matsHtml) {
  const items = [];
  const matRe = /<a href="([^"]+)" class="cr-mat" aria-label="([^"]*)">/g;
  let m;
  while ((m = matRe.exec(matsHtml))) {
    items.push({ name: cleanText(m[2]), url: absUrl(m[1]) });
  }
  return items;
}

// "Gathered from 1; yellow at 26, green at 51, grey at 101" (nodes) or
// "Learned at 10; yellow 25, green 47, grey 70" (smelting recipes, same
// wording the crafting Recipes chapter uses) -- both forms handled by one
// flexible regex.
function parseSkillTitle(title) {
  const m = title.match(/(?:Gathered from|Learned at) (\d+); yellow(?: at)? (\d+), green(?: at)? (\d+), grey(?: at)? (\d+)/);
  if (!m) return null;
  return { orange: m[1], yellow: m[2], green: m[3], grey: m[4] };
}

// id="nodes" chapter (Mining's "Ore by skill", Herbalism's "Herbs by
// skill") -- a flat <ol class="en3-list gt-nodes"> of <li class="gt-node">,
// each: icon + name + zones text, the real items it can yield (cr-mats,
// same convention as a recipe's reagent list), and a 4-color skill
// threshold (same color language as ProfessionSkillColors, read from the
// en3-skill span's title attribute since only the orange number renders as
// visible text).
function parseNodes(html) {
  const chapterIdx = html.indexOf('id="nodes"');
  if (chapterIdx === -1) return null;
  const olStart = html.indexOf('<ol class="en3-list gt-nodes">', chapterIdx);
  if (olStart === -1) return null;
  const olEnd = html.indexOf("</ol>", olStart);
  const olHtml = html.slice(olStart, olEnd);

  // A node past the beta's current skill cap carries an extra "en3-lv-
  // later" class (e.g. "gt-node en3-lv-later") -- match on the leading
  // class only, or every post-cap node silently drops (confirmed live:
  // Herbalism's own page lists 28 herbs total, but an exact class match
  // only found the first 18, cutting off at the "beta stops at 225"
  // divider -- same class of bug as the leveling-step parser's "en3-lv-
  // step en3-lv-rod" fix last session).
  const nodeRe = /<li class="gt-node(?:\s[^"]*)?">([\s\S]*?)<\/li>/g;
  const nodes = [];
  let match;
  while ((match = nodeRe.exec(olHtml))) {
    const inner = match[1];
    const iconMatch = inner.match(/<img src="\/icon\/([^".]+)\.jpg"/);
    const nameMatch = inner.match(/<strong>(.*?)<\/strong>/);
    const zonesMatch = inner.match(/<small>([\s\S]*?)<\/small>/);
    const matsMatch = inner.match(/<span class="cr-mats">([\s\S]*?)<\/span>/);
    const skillMatch = inner.match(/<span class="en3-skill[^"]*" title="([^"]*)">/);

    nodes.push({
      name: cleanText(nameMatch?.[1] ?? ""),
      icon: iconMatch ? iconMatch[1] : null,
      zones: cleanText(zonesMatch?.[1] ?? ""),
      items: matsMatch ? parseMatItems(matsMatch[1]) : [],
      skills: skillMatch ? parseSkillTitle(skillMatch[1]) : null,
    });
  }
  return nodes;
}

// id="leveling" chapter for Mining/Herbalism -- and id="skin" for Skinning,
// which has NO separate nodes list, so this same list doubles as both "what
// to gather" and "leveling" there. Both are a flat <ol class="en3-lv gt-
// route"> of <li class="en3-lv-step ...">, no rank tiers at all (unlike the
// crafting Leveling guide's Apprentice/Journeyman/... groups) -- range,
// then either a name + plain icon list (gt-step-icons, Mining/Herbalism --
// just points back at nodes already listed in the nodes chapter, no item
// links of their own) or a name + real item links (cr-mats, Skinning --
// this list has no separate nodes chapter to point back at, so it carries
// real items directly).
function parseGatheringSteps(html, chapterId) {
  const chapterIdx = html.indexOf(`id="${chapterId}"`);
  if (chapterIdx === -1) return null;
  const olStart = html.indexOf('<ol class="en3-lv gt-route">', chapterIdx);
  if (olStart === -1) return null;
  const olEnd = html.indexOf("</ol>", olStart);
  const olHtml = html.slice(olStart, olEnd);

  const stepRe = /<li class="en3-lv-step(?:\s[^"]*)?">([\s\S]*?)<\/li>/g;
  const steps = [];
  let match;
  while ((match = stepRe.exec(olHtml))) {
    const inner = match[1];
    const rangeText = cleanText(inner.match(/<span class="en3-lv-range"><b>(.*?)<\/b>/)?.[1] ?? "");
    const [min, max] = rangeText.split(/[–-]/).map((n) => parseInt(n.trim(), 10));

    const whatMatch = inner.match(/<span class="en3-lv-what">([\s\S]*?)<\/span>(?=<span class="(?:gt-step-icons|cr-mats)")/);
    const whatHtml = whatMatch?.[1] ?? "";
    const name = cleanText(whatHtml.match(/<strong>(.*?)<\/strong>/)?.[1] ?? "");
    const zones = cleanText(whatHtml.match(/<small>([\s\S]*?)<\/small>/)?.[1] ?? "");

    // gt-step-icons: plain <img title="Node Name"> list, no item links (the
    // node is already a real entry in the nodes chapter, not an item).
    const iconIcons = inner.match(/<span class="gt-step-icons">([\s\S]*?)<\/span>/)?.[1] ?? "";
    const icons = [...iconIcons.matchAll(/<img src="\/icon\/([^".]+)\.jpg"[^>]*title="([^"]*)"/g)].map((m) => ({
      icon: m[1],
      name: cleanText(m[2]),
    }));

    // cr-mats: real item links (Skinning only -- see header comment).
    const matsMatch = inner.match(/<span class="cr-mats">([\s\S]*?)<\/span>/);
    const items = matsMatch ? parseMatItems(matsMatch[1]) : [];

    steps.push({ range: [min, max], name, zones, icons, items });
  }
  return steps;
}

// id="smelting" (Mining only) -- structurally identical to a crafting
// profession's Recipes chapter (<ol class="en3-list cr-list"> of <li
// class="cr-row">, confirmed against the same cr-made/cr-mats/en3-skill/
// cr-src markup the main Recipes tab uses), just under a different chapter
// id and with no per-category slot grouping. A crafted output's own "x2"-
// style quantity (e.g. "Bronze Bar ×2") renders as a <small> suffix on the
// name, same as everywhere else this convention appears on this site.
function parseSmelting(html) {
  const chapterIdx = html.indexOf('id="smelting"');
  if (chapterIdx === -1) return null;
  const olStart = html.indexOf('<ol class="en3-list cr-list">', chapterIdx);
  if (olStart === -1) return null;
  const olEnd = html.indexOf("</ol>", olStart);
  const olHtml = html.slice(olStart, olEnd);

  const rowRe = /<li id="[^"]*" class="cr-row">([\s\S]*?)<\/li>/g;
  const recipes = [];
  let match;
  while ((match = rowRe.exec(olHtml))) {
    const inner = match[1];
    const madeMatch = inner.match(/<a href="([^"]+)" class="cr-made">[\s\S]*?<span class="cr-name[^"]*">(.*?)<\/span><\/a>/);
    const rawName = cleanText(madeMatch?.[2] ?? "");
    const qtyMatch = rawName.match(/^(.*?)\s*×\s*(\d+)$/) ?? [null, rawName, null];
    const name = qtyMatch[1] ?? rawName;
    const makesQty = qtyMatch[2] ? parseInt(qtyMatch[2], 10) : null;

    const matsMatch = inner.match(/<span class="cr-mats">([\s\S]*?)<\/span>/);
    const skillMatch = inner.match(/<span class="en3-skill[^"]*" title="([^"]*)">/);
    const srcMatch = inner.match(/<span class="cr-src">([\s\S]*?)<\/span>/);

    recipes.push({
      name,
      makesQty,
      itemUrl: madeMatch ? absUrl(madeMatch[1]) : null,
      mats: matsMatch ? parseMatItems(matsMatch[1]) : [],
      skills: skillMatch ? parseSkillTitle(skillMatch[1]) : null,
      source: cleanText(srcMatch?.[1] ?? ""),
    });
  }
  return recipes;
}

async function fetchGatheringPage(slug) {
  const res = await fetch(`${BASE}/professions/${slug}`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return { ok: false, status: res.status };
  const html = await res.text();
  return {
    ok: true,
    nodes: parseNodes(html),
    leveling: parseGatheringSteps(html, "leveling"),
    skin: parseGatheringSteps(html, "skin"),
    smelting: parseSmelting(html),
  };
}

module.exports = { fetchGatheringPage, parseNodes, parseGatheringSteps, parseSmelting, parseSkillTitle };
