#!/usr/bin/env node
// Read-only drift check: live foreverchanges.pro dungeon loot vs our raw
// pulls in data/sources/foreverchanges/dungeon_data/<fc-slug>.json.
//
// For each dungeon in scripts/dungeon-source-map.js, fetches
// https://foreverchanges.pro/dungeons/<fc>.json (the same endpoint
// fetch-foreverchanges-dungeon-loot.js pulls from) and compares, per group
// (bosses, rares, trash, objects -- every group renders loot), the set of
// item ids, plus group additions/removals and kind/level changes (kind drives
// the roster counts in lib/dungeon-roster.ts). Counts alone are not enough:
// the 2026-10-06 audits found drift with matching counts.
//
// Writes nothing. Re-pull what it reports with
//   node scripts/fetch-foreverchanges-dungeon-loot.js --slugs=<fc>,<fc>
// then `node scripts/build-dungeons.js`.
//
// Usage:
//   node scripts/check-dungeon-drift.js              # all mapped dungeons
//   node scripts/check-dungeon-drift.js --slugs=razorfen-kraul,the-stockade
//   node scripts/check-dungeon-drift.js --json       # machine-readable report on stdout
//
// Exit code: 0 = every checked dungeon matches live, 1 = drift found,
// 2 = a fetch or parse failed (drift may also be present).

const fs = require("fs");
const path = require("path");
const SOURCE_MAP = require("./dungeon-source-map");

const RAW_DIR = path.join(__dirname, "..", "data", "sources", "foreverchanges", "dungeon_data");
const LIVE_URL = (fc) => `https://foreverchanges.pro/dungeons/${fc}.json`;
// Same politeness as the other foreverchanges scrapers (robots.txt allows
// /dungeons and sets no crawl-delay).
const REQUEST_GAP_MS = 1000;

function parseArgs(argv) {
  const slugArg = argv.find((a) => a.startsWith("--slugs="));
  return {
    slugs: slugArg ? slugArg.slice("--slugs=".length).split(",").filter(Boolean) : null,
    json: argv.includes("--json"),
  };
}

// Groups are matched by name. Names can repeat within a dungeon (rarely), so
// repeats get a #2, #3 suffix in file order on both sides.
function keyedGroups(data) {
  const seen = new Map();
  const out = new Map();
  for (const g of data.bosses || []) {
    const n = (seen.get(g.name) || 0) + 1;
    seen.set(g.name, n);
    out.set(n === 1 ? g.name : `${g.name} #${n}`, g);
  }
  return out;
}

function itemIds(group) {
  return (group.items || []).map((it) => it.i);
}

function compareDungeon(local, live) {
  const lg = keyedGroups(local);
  const vg = keyedGroups(live);
  const groups = [];
  for (const [name, v] of vg) {
    const l = lg.get(name);
    const liveIds = new Set(itemIds(v));
    if (!l) {
      groups.push({ name, kind: v.kind, status: "group-added", added: [...liveIds], missing: [] });
      continue;
    }
    const localIds = new Set(itemIds(l));
    const added = [...liveIds].filter((id) => !localIds.has(id));
    const missing = [...localIds].filter((id) => !liveIds.has(id));
    const changes = [];
    if (l.kind !== v.kind) changes.push(`kind ${l.kind} -> ${v.kind}`);
    if (JSON.stringify(l.level) !== JSON.stringify(v.level)) changes.push(`level ${JSON.stringify(l.level)} -> ${JSON.stringify(v.level)}`);
    groups.push({
      name,
      kind: v.kind,
      status: added.length || missing.length || changes.length ? "changed" : "same",
      localCount: localIds.size,
      liveCount: liveIds.size,
      added,
      missing,
      changes,
    });
  }
  for (const [name, l] of lg) {
    if (!vg.has(name)) groups.push({ name, kind: l.kind, status: "group-removed", added: [], missing: itemIds(l) });
  }
  const drift = groups.some((g) => g.status !== "same");
  return { drift, groups };
}

async function fetchLive(fc) {
  const res = await fetch(LIVE_URL(fc));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const itemTotal = (data) => (data.bosses || []).reduce((n, g) => n + (g.items || []).length, 0);

async function main() {
  const { slugs, json } = parseArgs(process.argv.slice(2));
  const entries = Object.entries(SOURCE_MAP)
    .map(([id, m]) => ({ id, fc: m.fc }))
    .filter((e) => !slugs || slugs.includes(e.fc) || slugs.includes(e.id));

  const report = [];
  let first = true;
  for (const { id, fc } of entries) {
    const rawPath = path.join(RAW_DIR, `${fc}.json`);
    const hasLocal = fs.existsSync(rawPath);
    if (!first) await sleep(REQUEST_GAP_MS);
    first = false;
    let live;
    try {
      live = await fetchLive(fc);
    } catch (err) {
      report.push({ id, fc, status: "error", error: String(err) });
      continue;
    }
    if (!hasLocal) {
      // No raw pull yet (several new-in-Forever dungeons). Worth knowing when
      // live starts publishing loot for one of them.
      report.push({ id, fc, status: itemTotal(live) > 0 ? "no-local-live-has-data" : "no-local-live-empty", liveGroups: (live.bosses || []).length, liveItems: itemTotal(live) });
      continue;
    }
    let local;
    try {
      local = JSON.parse(fs.readFileSync(rawPath, "utf8"));
    } catch (err) {
      report.push({ id, fc, status: "error", error: `local parse: ${err}` });
      continue;
    }
    const { drift, groups } = compareDungeon(local, live);
    report.push({
      id,
      fc,
      status: drift ? "drift" : "match",
      localItems: itemTotal(local),
      liveItems: itemTotal(live),
      added: groups.reduce((n, g) => n + g.added.length, 0),
      missing: groups.reduce((n, g) => n + g.missing.length, 0),
      groups: groups.filter((g) => g.status !== "same"),
    });
  }

  if (json) {
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), report }, null, 1));
  } else {
    printReport(report);
  }
  if (report.some((r) => r.status === "error")) process.exitCode = 2;
  else if (report.some((r) => r.status === "drift" || r.status === "no-local-live-has-data")) process.exitCode = 1;
}

function printReport(report) {
  const drift = report.filter((r) => r.status === "drift");
  const match = report.filter((r) => r.status === "match");
  const errors = report.filter((r) => r.status === "error");
  const noLocal = report.filter((r) => r.status.startsWith("no-local"));

  console.log(`# Dungeon drift check (${new Date().toISOString()})\n`);
  console.log(`Checked ${report.length - noLocal.length} raw files against live: ${match.length} match, ${drift.length} drift, ${errors.length} error(s).\n`);

  if (drift.length) {
    console.log("## Drift\n");
    for (const r of drift) {
      console.log(`### ${r.id} (${r.fc}): local ${r.localItems} -> live ${r.liveItems} items, +${r.added} / -${r.missing}`);
      for (const g of r.groups) {
        const parts = [];
        if (g.status === "group-added") parts.push("NEW GROUP");
        if (g.status === "group-removed") parts.push("GROUP GONE FROM LIVE");
        if (g.localCount !== undefined) parts.push(`${g.localCount} -> ${g.liveCount}`);
        if (g.added.length) parts.push(`+ ${g.added.join(" ")}`);
        if (g.missing.length) parts.push(`- ${g.missing.join(" ")}`);
        if (g.changes && g.changes.length) parts.push(g.changes.join("; "));
        console.log(`- ${g.name} [${g.kind}]: ${parts.join(" | ")}`);
      }
      console.log("");
    }
    console.log(`Re-pull: node scripts/fetch-foreverchanges-dungeon-loot.js --slugs=${drift.map((r) => r.fc).join(",")}\n`);
  }
  if (match.length) {
    console.log("## Match live (nothing to do)\n");
    console.log(match.map((r) => `${r.id} (${r.liveItems})`).join(", ") + "\n");
  }
  if (noLocal.length) {
    console.log("## No local raw file\n");
    for (const r of noLocal) console.log(`- ${r.id} (${r.fc}): live has ${r.liveGroups} group(s), ${r.liveItems} item(s)`);
    console.log("");
  }
  if (errors.length) {
    console.log("## Errors\n");
    for (const r of errors) console.log(`- ${r.id} (${r.fc}): ${r.error}`);
  }
}

main();
