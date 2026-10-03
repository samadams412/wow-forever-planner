#!/usr/bin/env node
// Scrapes individual /quest/<id> detail pages from foreverchanges.pro into a
// single combined data/sources/foreverchanges/quests/all.json -- a one-time,
// over-complete raw capture (every field the detail page exposes),
// independent of lib/quests.ts's current data model. See
// Forevercraft-Knowledge-Base/03-Handoffs/data-pipeline/2026-10-02-quest-data-source-research.md
// for why this source (not game files) and why fetch (not Playwright).
//
// Checkpoint design (modeled on C:\Users\samue\Desktop\Projects\python\
// wow-quest-scraper\scraper.py's append-only-log + atomic-rebuild pattern,
// not a single mutable progress file -- a crash mid-write there risks
// corrupting the one file tracking all progress):
//   - _checkpoint.jsonl is append-only, one JSON line per attempt (success
//     or failure), fsync'd on every append. A crash loses at most the last
//     unflushed line (ignored on reload, never corrupts earlier lines).
//   - all.json (the combined output) is rebuilt from the checkpoint after
//     every quest via write-to-.tmp-then-rename, so the real file is always
//     either the previous complete version or the new one, never partial.
//
// Three modes:
//   --build-manifest   crawl every /quests/<category> listing page linked
//                       from the root /quests nav, dedupe quest ids, write
//                       data/sources/foreverchanges/quests/_manifest.json
//   --test=id,id,...   run the detail-page parser against an explicit id
//                       list and print a field-coverage report (no files
//                       written to the checkpoint or all.json)
//   (default)          production run: reads _manifest.json, scrapes each
//                       id's detail page, appends to _checkpoint.jsonl, and
//                       rewrites all.json.
//
// Production run flags:
//   --delay-ms=1200       base delay between requests (default 1200)
//   --jitter-ms=800        +/- random jitter added to the delay (default 800)
//   --force                ignore the checkpoint, re-scrape everything
//   --retry-failed         re-scrape only ids previously recorded as failed
//   --limit=N              stop after N quests this run (for smoke-testing)
//   --ids=id,id,...        re-scrape exactly these ids (ignores the checkpoint;
//                          the newest "ok" line wins on reload, so this is how
//                          a parser fix is backfilled without a full re-run)
//
// Usage:
//   node scripts/scrape-foreverchanges-quest-pages.js --build-manifest
//   node scripts/scrape-foreverchanges-quest-pages.js --test=98601,9120,9117
//   node scripts/scrape-foreverchanges-quest-pages.js

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "data", "sources", "foreverchanges", "quests");
const MANIFEST_PATH = path.join(OUT_DIR, "_manifest.json");
const CHECKPOINT_PATH = path.join(OUT_DIR, "_checkpoint.jsonl");
const OUTPUT_PATH = path.join(OUT_DIR, "all.json");
const EXPECTED_TOTAL = 5049; // per root /quests page summary count, 2026-10-02 research

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function decodeEntities(str) {
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&times;/g, "×")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x2039;/g, "‹")
    .replace(/&#x203a;/g, "›");
}

function stripTags(html) {
  if (!html) return "";
  return decodeEntities(html.replace(/<!--.*?-->/gs, "").replace(/<[^>]+>/g, "")).trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Manifest (id enumeration)
// ---------------------------------------------------------------------------

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function buildManifest() {
  console.log("Fetching root /quests page to discover category listing pages...");
  const rootHtml = await fetchText("https://foreverchanges.pro/quests");
  const categories = new Set();
  for (const m of rootHtml.matchAll(/href="\/quests\/([a-z0-9-]+)"/g)) categories.add(m[1]);
  const categoryList = [...categories].sort();
  console.log(`Found ${categoryList.length} category listing pages.`);

  const idToPages = new Map(); // id -> Set(category)
  const perCategoryCounts = {};

  for (const category of categoryList) {
    const url = `https://foreverchanges.pro/quests/${category}`;
    try {
      const html = await fetchText(url);
      const ids = new Set();
      for (const m of html.matchAll(/href="\/quest\/(\d+)"/g)) ids.add(m[1]);
      perCategoryCounts[category] = ids.size;
      for (const id of ids) {
        if (!idToPages.has(id)) idToPages.set(id, new Set());
        idToPages.get(id).add(category);
      }
      console.log(`  ${category}: ${ids.size} quest id(s)`);
    } catch (err) {
      perCategoryCounts[category] = `ERROR: ${err}`;
      console.error(`  ${category}: ERROR ${err}`);
    }
    await sleep(500);
  }

  const ids = [...idToPages.keys()].sort((a, b) => Number(a) - Number(b));
  const manifest = {
    source: "foreverchanges.pro",
    generatedAt: new Date().toISOString(),
    categoryPagesCrawled: categoryList,
    perCategoryCounts,
    totalUniqueQuestIds: ids.length,
    expectedTotal: EXPECTED_TOTAL,
    quests: ids.map((id) => ({ id, foundOnPages: [...idToPages.get(id)].sort() })),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 1));

  console.log(`\nTotal unique quest ids found: ${ids.length} (expected ~${EXPECTED_TOTAL})`);
  const diff = ids.length - EXPECTED_TOTAL;
  if (Math.abs(diff) > 50) {
    console.warn(
      `DISCREPANCY: off by ${diff} from the expected ~${EXPECTED_TOTAL} -- review perCategoryCounts ` +
        `in ${MANIFEST_PATH} before trusting this manifest for a full run.`
    );
  } else {
    console.log(`Within expected range (diff: ${diff >= 0 ? "+" : ""}${diff}).`);
  }
  console.log(`Manifest written to ${MANIFEST_PATH}`);
}

// ---------------------------------------------------------------------------
// Detail-page parser
// ---------------------------------------------------------------------------

function parseItemLink(block) {
  // <a class="qp-item" href="/item/282423" data-tip="282423">
  //   <span class="qp-item-icon"><img src="/icon/....jpg" .../><b>8</b></span>
  //   <span class="qp-item-name qN">Name</span>
  // </a>
  const hrefMatch = block.match(/href="(\/item\/\d+)"/);
  const idMatch = block.match(/data-tip="(\d+)"/);
  const iconMatch = block.match(/<img src="([^"]+)"/);
  const qtyMatch = block.match(/<b>(\d+)<\/b>/);
  const nameMatch = block.match(/<span class="qp-item-name[^"]*">(.*?)<\/span>/s);
  const altMatch = block.match(/<img[^>]*alt="([^"]*)"/); // chain-route reward icons carry the name as img alt, no name span
  const qualityMatch = block.match(/qp-item-name (q\d)/);
  return {
    itemId: idMatch ? Number(idMatch[1]) : null,
    href: hrefMatch ? hrefMatch[1] : null,
    icon: iconMatch ? iconMatch[1] : null,
    name: nameMatch ? stripTags(nameMatch[1]) : altMatch && altMatch[1] ? decodeEntities(altMatch[1]) : null,
    quality: qualityMatch ? qualityMatch[1] : null,
    qty: qtyMatch ? Number(qtyMatch[1]) : 1,
  };
}

function parseNeedList(sheetHtml) {
  // <ul class="qp-need"><li class="qp-need-item">...item...<span class="qp-from">sources</span></li>...
  const ulMatch = sheetHtml.match(/<ul class="qp-need">(.*?)<\/ul>/s);
  if (!ulMatch) return [];
  const lis = [...ulMatch[1].matchAll(/<li class="qp-need-item">(.*?)<\/li>/gs)];
  return lis.map((m) => {
    const block = m[1];
    const item = parseItemLink(block);
    const fromMatch = block.match(/<span class="qp-from">(.*?)<\/span>\s*$/s);
    let sources = [];
    if (fromMatch) {
      // each source is its own <span>Name<span class="qp-pct"> N%</span></span>, comma-joined
      sources = stripTags(fromMatch[1])
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return { ...item, sources };
  });
}

function parseProvided(sheetHtml) {
  const m = sheetHtml.match(/<p class="qp-provided">(.*?)<\/p>/s);
  if (!m) return [];
  return [...m[1].matchAll(/<a class="qp-item"[^>]*>.*?<\/a>/gs)].map((am) => parseItemLink(am[0]));
}

function parseDescription(sheetHtml) {
  const headingIdx = sheetHtml.indexOf("<h2>Description</h2>");
  if (headingIdx === -1) return [];
  const afterHeading = sheetHtml.slice(headingIdx + "<h2>Description</h2>".length);
  const nextH2 = afterHeading.search(/<h2>|<div class="qp-more">|<\/article>/);
  const block = nextH2 === -1 ? afterHeading : afterHeading.slice(0, nextH2);
  return [...block.matchAll(/<p>(.*?)<\/p>/gs)].map((m) => stripTags(m[1]));
}

function parseObjectivesText(sheetHtml) {
  const headingIdx = sheetHtml.indexOf("<h2>Quest Objectives</h2>");
  if (headingIdx === -1) return null;
  const afterHeading = sheetHtml.slice(headingIdx + "<h2>Quest Objectives</h2>".length);
  const pMatch = afterHeading.match(/^<p>(.*?)<\/p>/s);
  return pMatch ? stripTags(pMatch[1]) : null;
}

function parseMoreDialogue(sheetHtml) {
  const moreMatch = sheetHtml.match(/<div class="qp-more">(.*?)<\/div>/s);
  if (!moreMatch) return { partial: null, turnIn: null };
  const details = [...moreMatch[1].matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/gs)];
  let partial = null;
  let turnIn = null;
  for (const [, summary, body] of details) {
    const s = stripTags(summary).toLowerCase();
    if (s.includes("come back")) partial = stripTags(body);
    else if (s.includes("hand it in")) turnIn = stripTags(body);
  }
  return { partial, turnIn };
}

function parseRewards(sheetHtml) {
  const headingIdx = sheetHtml.indexOf("<h2>Rewards</h2>");
  if (headingIdx === -1) {
    return { rewardNote: null, isChoice: false, items: [], experienceText: null, reputation: [] };
  }
  const afterHeading = sheetHtml.slice(headingIdx + "<h2>Rewards</h2>".length);
  const endIdx = afterHeading.search(/<\/article>/);
  const block = endIdx === -1 ? afterHeading : afterHeading.slice(0, endIdx);

  const noteMatch = block.match(/^<p>(.*?)<\/p>/s);
  const rewardNote = noteMatch ? stripTags(noteMatch[1]) : null;
  const isChoice = /choose one of these rewards/i.test(rewardNote || "");

  const itemsBlockMatch = block.match(/<div class="qp-items">(.*?)<\/div>/s);
  const items = itemsBlockMatch
    ? [...itemsBlockMatch[1].matchAll(/<a class="qp-item"[^>]*>.*?<\/a>/gs)].map((m) => parseItemLink(m[0]))
    : [];

  const gainsMatch = block.match(/<p class="qp-gains">(.*?)<\/p>/s);
  const gainsHtml = gainsMatch ? gainsMatch[1] : "";
  // Money and Experience are sibling <span>Label:</span> runs inside one
  // <p class="qp-gains">, not separate elements -- split on the labels
  // rather than stripping the whole block to text (that concatenates
  // "0 gold, 55 silver, 0 copperExperience: 2,000" with no separator).
  const moneyMatch = gainsHtml.match(/<span>Money:<\/span>\s*<span class="qp-money">.*?<span class="qp-sr">(.*?)<\/span>/s);
  const expMatch = gainsHtml.match(/<span>Experience:<\/span>\s*<b>(.*?)<\/b>/s);
  const moneyText = moneyMatch ? stripTags(moneyMatch[1]) : null;
  const experienceText = expMatch ? stripTags(expMatch[1]) : null;

  const repMatch = block.match(/<ul class="qp-rep">(.*?)<\/ul>/s);
  const reputation = repMatch ? [...repMatch[1].matchAll(/<li>(.*?)<\/li>/gs)].map((m) => stripTags(m[1])) : [];

  return { rewardNote, isChoice, items, moneyText, experienceText, reputation };
}

function splitTopLevelSpans(html) {
  // Start/End <dd> values can hold multiple NPCs as sibling top-level
  // <span>...</span> blocks, each possibly nesting its own
  // <span class="qp-coord">...</span> -- a plain non-nesting regex can't
  // tell a sibling boundary from the nested coord span, so walk it with a
  // depth counter instead.
  const spans = [];
  const tagRe = /<span[^>]*>|<\/span>/g;
  let depth = 0;
  let start = -1;
  let m;
  while ((m = tagRe.exec(html))) {
    const isOpen = m[0][1] !== "/";
    if (isOpen) {
      if (depth === 0) start = m.index;
      depth++;
    } else {
      depth--;
      if (depth === 0 && start !== -1) {
        spans.push(html.slice(start, tagRe.lastIndex));
        start = -1;
      }
    }
  }
  return spans;
}

function parsePersonEntry(spanHtml) {
  const coordMatch = spanHtml.match(/<span class="qp-coord">(.*?)<\/span>/s);
  const name = stripTags(spanHtml.replace(/<span class="qp-coord">.*?<\/span>/s, "")).replace(/^,\s*/, "");
  return { name, coordText: coordMatch ? stripTags(coordMatch[1]) : null };
}

function parseFacts(sideHtml) {
  const dlMatch = sideHtml.match(/<dl class="qp-facts">(.*?)<\/dl>/s);
  if (!dlMatch) return { raw: [], parsed: {} };
  const dl = dlMatch[1];
  const dts = [...dl.matchAll(/<dt>(.*?)<\/dt>/gs)].map((m) => stripTags(m[1]));
  const ddBlocks = [...dl.matchAll(/<dd[^>]*>(.*?)<\/dd>/gs)].map((m) => m[1]);
  const raw = dts.map((label, i) => ({ label, html: ddBlocks[i] || "", text: stripTags(ddBlocks[i] || "") }));

  const parsed = {};
  for (const { label, html, text } of raw) {
    if (label === "Difficulty") {
      parsed.difficultyBands = [...html.matchAll(/<span class="qp-band-(\w+)" title="\w+">(\d+)<\/span>/g)].map(
        (m) => ({ color: m[1], level: Number(m[2]) })
      );
    } else if (label === "Start" || label === "End") {
      const itemStart = html.match(/an item: (.*)/);
      const npcs = itemStart ? [] : splitTopLevelSpans(html).map(parsePersonEntry);
      parsed[label.toLowerCase()] = {
        text,
        isItemStart: !!itemStart,
        npcs,
        // back-compat convenience for the common single-NPC case
        npcName: npcs.length === 1 ? npcs[0].name : null,
        coordText: npcs.length === 1 ? npcs[0].coordText : null,
      };
    } else if (label === "Level") {
      const parts = text.split(",").map((s) => s.trim());
      parsed.level = Number(parts[0]) || null;
      parsed.levelRequirementText = parts[1] || null;
    } else {
      // Side, Class, Type, Shareable, Quest ID, Repeatable, etc -- generic passthrough
      const key = label.replace(/\s+/g, "").replace(/^./, (c) => c.toLowerCase());
      parsed[key] = text;
    }
  }
  return { raw, parsed };
}

function parseChain(html) {
  const sectionMatch = html.match(/<section class="qp-section"[^>]*aria-labelledby="qp-chain">(.*?)<\/section>/s);
  if (!sectionMatch) return null;
  const section = sectionMatch[1];
  const subMatch = section.match(/<p class="qp-section-sub">(.*?)<\/p>/s);
  const steps = [...section.matchAll(/<li\s*(class="is-here"[^>]*)?>\s*<span class="qp-route-mark"[^>]*>(\d+)<\/span>(.*?)<\/li>/gs)];
  const parsedSteps = steps.map((m) => {
    const isCurrentStep = !!m[1];
    const stepNumber = Number(m[2]);
    const stepHtml = m[3];
    // One step can hold several parallel quests (e.g. three "The Ashenvale
    // Hunt" givers at once). Split on each quest's own opening tag: a
    // non-greedy match to `</div></div>` swallowed every sibling quest into
    // the first one's block (2026-10-03 bug, 875 chains lost quests).
    // The current quest's wrapper carries an extra class (`qp-route-quest is-here`),
    // so match the `\b` boundary rather than a closing quote.
    const questBlocks = [...stepHtml.matchAll(/<div class="qp-route-quest\b[^"]*"[^>]*>(.*?)(?=<div class="qp-route-quest\b|$)/gs)];
    const quests = questBlocks.map((qm) => {
      const qHtml = qm[1];
      // The title holds the quest's own name: a link for other quests, bold
      // (plus a "this quest" marker) for the current one. A class-variant row
      // ("One quest for each class") has no title link, and its objective
      // links the variants instead, so the name must come from the title alone.
      const titleHtml = qHtml.match(/<p class="qp-route-title">(.*?)<\/p>/s)?.[1] ?? "";
      const isCurrent = /qp-route-here/.test(qHtml) || /<b>/.test(titleHtml);
      const titleLink = titleHtml.match(/<a href="\/quest\/(\d+)">/s);
      const nameText = stripTags(titleHtml.replace(/<span class="qp-route-level">.*?<\/span>/s, "").replace(/<span class="qp-route-here">.*?<\/span>/s, ""));
      const levelMatch = qHtml.match(/<span class="qp-route-level">\[(.*?)\]<\/span>/s);
      const objMatch = qHtml.match(/<p class="qp-route-obj">(.*?)<\/p>/s);
      const objHtml = objMatch ? objMatch[1] : "";
      const objLinks = [...objHtml.matchAll(/<a href="\/quest\/(\d+)">(.*?)<\/a>/gs)];
      const variants = objLinks.length > 1 ? objLinks.map((v) => ({ questId: Number(v[1]), label: stripTags(v[2]) })) : null;
      const whoMatch = qHtml.match(/<p class="qp-route-who">.*?<span>(.*?)<\/span><small>(.*?)<\/small>/s);
      const xpMatch = qHtml.match(/<p class="qp-route-xp">(.*?)<\/p>/s);
      const getsMatch = qHtml.match(/<p class="qp-route-gets">(.*?)<\/p>/s);
      return {
        questId: titleLink ? Number(titleLink[1]) : variants ? variants[0].questId : null,
        name: nameText || null,
        isCurrent,
        level: levelMatch ? stripTags(levelMatch[1]) : null,
        objectiveText: objMatch ? stripTags(objMatch[1]) : null,
        // Set only for a row that stands for several quests at once (one per class).
        variants,
        giverName: whoMatch ? stripTags(whoMatch[1]) : null,
        giverZone: whoMatch ? stripTags(whoMatch[2]) : null,
        xpText: xpMatch ? stripTags(xpMatch[1]) || null : null,
        rewardItem: getsMatch ? parseItemLink(getsMatch[1]) : null,
      };
    });
    return { stepNumber, isCurrentStep, quests };
  });
  return { subtitle: subMatch ? stripTags(subMatch[1]) : null, steps: parsedSteps };
}

function parseMapPins(sideHtml) {
  const mapImgMatch = sideHtml.match(/<figure class="qp-map">.*?<img src="([^"]+)"/s);
  const pins = [...sideHtml.matchAll(/<button type="button" class="(qp-pin[^"]*)" style="([^"]*)" aria-label="([^"]*)"/g)].map(
    (m) => {
      const classes = m[1];
      const style = m[2];
      const label = decodeEntities(m[3]);
      const leftMatch = style.match(/left:([\d.]+)%/);
      const topMatch = style.match(/top:([\d.]+)%/);
      let kind = "start";
      if (classes.includes("qp-pin-end")) kind = "end";
      if (classes.includes("qp-pin-both")) kind = "both";
      return { kind, xPct: leftMatch ? Number(leftMatch[1]) : null, yPct: topMatch ? Number(topMatch[1]) : null, label };
    }
  );
  const zoneMatch = sideHtml.match(/<figcaption><span>(.*?)<\/span><a href="([^"]+)">/s);
  return {
    mapImage: mapImgMatch ? mapImgMatch[1] : null,
    pins,
    zoneName: zoneMatch ? stripTags(zoneMatch[1]) : null,
    zoneMapHref: zoneMatch ? zoneMatch[2] : null,
  };
}

function parseKnownStatus(headHtml) {
  // <p class="qp-known qp-known-forever"><b class="qp-new">New in Forever.</b> ... </p>
  // <div class="qp-known qp-known-forever"><p><b>Changed in Forever.</b> text... </p></div>
  // <p class="qp-known">Unchanged in Forever as far as is known: ...</p>
  const match = headHtml.match(/<(?:p|div) class="qp-known[^"]*">(.*?)<\/(?:p|div)>/s);
  if (!match) return { raw: null, status: "unknown", changeNote: null };
  const raw = stripTags(match[1]);
  let status = "unknown";
  if (/^new in forever/i.test(raw)) status = "new";
  else if (/^changed in forever/i.test(raw)) status = "changed";
  else if (/^unchanged in forever/i.test(raw)) status = "unchanged";
  return { raw, status, changeNote: raw };
}

function parseQuestDetail(html, id) {
  const workMatch = html.match(/<div class="qp-work">(.*?)<p class="qp-foot">(.*?)<\/p>/s);
  if (!workMatch) return { parseError: "qp-work block not found -- page shape may differ or quest id invalid" };
  const work = workMatch[1];
  const footText = stripTags(workMatch[2]);

  const crumbsMatch = work.match(/<nav class="qp-crumbs"[^>]*>.*?<span>(.*?)<\/span><\/nav>/s);
  const headMatch = work.match(/<header class="qp-head">(.*?)<\/header>/s);
  const titleMatch = work.match(/<h1>(.*?)<\/h1>/s);
  const ledeMatch = work.match(/<p class="qp-lede">(.*?)<\/p>/s);

  const sheetMatch = work.match(/<article class="qp-sheet">(.*?)<\/article>/s);
  const sideMatch = work.match(/<aside class="qp-side">(.*?)<\/aside>/s);
  const sheetHtml = sheetMatch ? sheetMatch[1] : "";
  const sideHtml = sideMatch ? sideMatch[1] : "";

  const { partial: partialDialogue, turnIn: turnInDialogue } = parseMoreDialogue(sheetHtml);
  const { raw: factsRaw, parsed: facts } = parseFacts(sideHtml);

  return {
    id: Number(id),
    url: `https://foreverchanges.pro/quest/${id}`,
    scrapedAt: new Date().toISOString(),
    breadcrumbCategory: crumbsMatch ? stripTags(crumbsMatch[1]) : null,
    name: titleMatch ? stripTags(titleMatch[1]) : null,
    lede: ledeMatch ? stripTags(ledeMatch[1]) : null,
    knownStatus: parseKnownStatus(headMatch ? headMatch[1] : ""),
    objectivesText: parseObjectivesText(sheetHtml),
    objectiveItems: parseNeedList(sheetHtml),
    providedItems: parseProvided(sheetHtml),
    description: parseDescription(sheetHtml),
    partialDialogue,
    turnInDialogue,
    rewards: parseRewards(sheetHtml),
    map: parseMapPins(sideHtml),
    facts: { raw: factsRaw, parsed: facts },
    chain: parseChain(work),
    footerSourceNote: footText,
  };
}

// ---------------------------------------------------------------------------
// Field-coverage report (test mode)
// ---------------------------------------------------------------------------

function fieldPresence(obj, prefix, out) {
  if (obj === null || obj === undefined) {
    out.push([prefix, "empty"]);
    return;
  }
  if (Array.isArray(obj)) {
    out.push([prefix, obj.length > 0 ? `array(${obj.length})` : "empty array"]);
    return;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      fieldPresence(v, prefix ? `${prefix}.${k}` : k, out);
    }
    return;
  }
  const isEmptyString = typeof obj === "string" && obj.trim() === "";
  out.push([prefix, isEmptyString ? "empty string" : "ok"]);
}

async function runTest(ids) {
  console.log(`Running test harness against ${ids.length} quest id(s): ${ids.join(", ")}\n`);
  const report = [];
  for (const id of ids) {
    const url = `https://foreverchanges.pro/quest/${id}`;
    try {
      const html = await fetchText(url);
      const parsed = parseQuestDetail(html, id);
      if (parsed.parseError) {
        report.push({ id, error: parsed.parseError });
        console.error(`id ${id}: PARSE ERROR -- ${parsed.parseError}`);
      } else {
        const fields = [];
        fieldPresence(parsed, "", fields);
        const empties = fields.filter(([, status]) => status.startsWith("empty"));
        report.push({ id, name: parsed.name, totalFields: fields.length, emptyFields: empties.map(([k]) => k) });
        console.log(`id ${id} "${parsed.name}": ${fields.length} leaf fields, ${empties.length} empty`);
        if (empties.length) console.log(`  empty: ${empties.map(([k]) => k).join(", ")}`);
      }
    } catch (err) {
      report.push({ id, error: String(err) });
      console.error(`id ${id}: FETCH ERROR -- ${err}`);
    }
    await sleep(600 + Math.random() * 400);
  }
  console.log("\n--- full parsed payloads (for manual review) ---");
  console.log(JSON.stringify(report, null, 1));
}

// ---------------------------------------------------------------------------
// Production run (checkpoint/resume)
// ---------------------------------------------------------------------------

function loadCheckpoint() {
  const completed = new Map(); // id -> parsed quest record
  const failed = new Map(); // id -> { error, at }
  if (!fs.existsSync(CHECKPOINT_PATH)) return { completed, failed };
  const lines = fs.readFileSync(CHECKPOINT_PATH, "utf8").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue; // last line of an interrupted write -- skip, not fatal
    }
    if (!rec || rec.id == null) continue;
    if (rec.status === "ok") {
      completed.set(rec.id, rec.data);
      failed.delete(rec.id);
    } else if (rec.status === "failed" && !completed.has(rec.id)) {
      failed.set(rec.id, { error: rec.error, at: rec.at });
    }
  }
  return { completed, failed };
}

function appendCheckpoint(record) {
  // One line per attempt, flushed immediately -- a crash mid-write can only
  // ever lose this one not-yet-flushed line, never corrupt prior ones.
  const fd = fs.openSync(CHECKPOINT_PATH, "a");
  try {
    fs.writeSync(fd, JSON.stringify(record) + "\n");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function sleepSync(ms) {
  // Blocking sleep for use outside async code (the rename-retry backoff
  // below) -- Atomics.wait on a throwaway buffer is the standard way to do
  // this in Node without pulling in a worker thread.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function writeOutput(allIds, completed) {
  const ordered = allIds.filter((id) => completed.has(id)).map((id) => completed.get(id));
  const tmpPath = `${OUTPUT_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(ordered, null, 1));
  // Windows + OneDrive/antivirus can briefly hold a lock on OUTPUT_PATH
  // while it's being synced/scanned, which fails the rename with EPERM even
  // though nothing is actually wrong -- retry with backoff instead of
  // crashing the whole run over it. _checkpoint.jsonl already has this
  // quest's data durably either way, so if every retry still fails, the
  // worst case is all.json is one quest stale until the next iteration's
  // writeOutput call (not a data loss, just a rebuild that'll succeed later).
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      fs.renameSync(tmpPath, OUTPUT_PATH); // atomic on the same filesystem -- all.json is never left half-written
      return ordered.length;
    } catch (err) {
      const transient = err && (err.code === "EPERM" || err.code === "EBUSY" || err.code === "ENOENT");
      if (!transient || attempt === maxAttempts) {
        console.warn(`writeOutput: couldn't update ${OUTPUT_PATH} this round (${err.code || err}) -- will retry on the next quest.`);
        return ordered.length;
      }
      sleepSync(100 * attempt); // 100, 200, 300, 400, 500ms backoff
    }
  }
  return ordered.length;
}

async function runProduction(opts) {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`No manifest at ${MANIFEST_PATH}. Run with --build-manifest first.`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const allIds = manifest.quests.map((q) => Number(q.id));

  if (opts.force && fs.existsSync(CHECKPOINT_PATH)) fs.rmSync(CHECKPOINT_PATH);
  let { completed, failed } = loadCheckpoint();

  let shuttingDown = false;
  const handleSignal = (sig) => {
    if (shuttingDown) return;
    shuttingDown = true;
    // Nothing to flush here -- every completed/failed attempt is already
    // durably appended to the checkpoint and folded into all.json before
    // the next request's delay even starts. Just stop cleanly.
    console.log(`\nReceived ${sig}, exiting (checkpoint is already up to date)...`);
    process.exit(0);
  };
  process.on("SIGINT", () => handleSignal("SIGINT"));
  process.on("SIGTERM", () => handleSignal("SIGTERM"));

  let idsToRun;
  if (opts.retryFailed) {
    idsToRun = allIds.filter((id) => failed.has(id));
  } else {
    idsToRun = allIds.filter((id) => !completed.has(id));
  }
  if (opts.ids) idsToRun = opts.ids.filter((id) => allIds.includes(id)); // explicit re-scrape, ignores the checkpoint
  if (opts.limit) idsToRun = idsToRun.slice(0, opts.limit);

  console.log(
    `Production run: ${idsToRun.length} quest(s) to fetch (of ${allIds.length} total manifest entries). ` +
      `Delay ${opts.delayMs}ms +/- ${opts.jitterMs}ms. ${opts.retryFailed ? "Retrying failed only." : ""}`
  );

  let done = 0;
  for (const id of idsToRun) {
    if (shuttingDown) break;
    const url = `https://foreverchanges.pro/quest/${id}`;
    const at = new Date().toISOString();
    try {
      const html = await fetchText(url);
      const parsed = parseQuestDetail(html, id);
      if (parsed.parseError) throw new Error(parsed.parseError);
      appendCheckpoint({ id, status: "ok", at, data: parsed });
      completed.set(id, parsed);
      failed.delete(id);
      done++;
    } catch (err) {
      appendCheckpoint({ id, status: "failed", at, error: String(err) });
      failed.set(id, { error: String(err), at });
      console.error(`id ${id}: FAILED -- ${err}`);
    }
    writeOutput(allIds, completed); // rebuild the combined file after every quest, not just at the end
    if (done % 25 === 0 && done > 0) {
      console.log(`...${done}/${idsToRun.length} done this run (${completed.size} total completed)`);
    }
    const delay = opts.delayMs + (Math.random() * 2 - 1) * opts.jitterMs;
    await sleep(Math.max(0, delay));
  }

  console.log(
    `\nRun finished (or interrupted). Completed total: ${completed.size}/${allIds.length}. ` +
      `Failed: ${failed.size}. Combined output: ${OUTPUT_PATH}`
  );
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const getFlag = (name) => {
    const found = args.find((a) => a.startsWith(`--${name}=`));
    return found ? found.slice(`--${name}=`.length) : null;
  };
  return {
    buildManifest: args.includes("--build-manifest"),
    test: getFlag("test"),
    force: args.includes("--force"),
    retryFailed: args.includes("--retry-failed"),
    delayMs: getFlag("delay-ms") ? Number(getFlag("delay-ms")) : 1200,
    jitterMs: getFlag("jitter-ms") ? Number(getFlag("jitter-ms")) : 800,
    limit: getFlag("limit") ? Number(getFlag("limit")) : null,
    ids: getFlag("ids") ? getFlag("ids").split(",").map(Number) : null,
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const opts = parseArgs();
  if (opts.buildManifest) {
    await buildManifest();
  } else if (opts.test) {
    await runTest(opts.test.split(","));
  } else {
    await runProduction(opts);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { parseQuestDetail, fetchText };
