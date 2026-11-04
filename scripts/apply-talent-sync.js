#!/usr/bin/env node
// Apply a talentsforever snapshot to data/talents/*.json (Data-Sync-Runbook §1.3).
// Usage: node apply-talent-sync.js <snapshot.json> --prev <prevSnapshot.json> [--write] [--repo <dir>]
// classic is rewritten only where the vendor's classic changed since --prev (keeps
// our deliberate hand edits, e.g. the 4 renamedFrom mismatches from 10-22).
// Without --write: prints the id map and a per-file "would change" summary.
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const snapPath = args.find((a, i) => !a.startsWith("--") && !["--repo", "--prev"].includes(args[i - 1]));
const prevSnap = JSON.parse(fs.readFileSync(opt("--prev"), "utf8"));
const write = args.includes("--write");
const repo = opt("--repo") || process.cwd();
const snap = JSON.parse(fs.readFileSync(snapPath, "utf8"));

const snake = (s) => s.toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const statusMap = (s) => (s === "same" ? "unchanged" : s);

function mapClassic(vc, prev) {
  if (!vc) return undefined;
  const c = { status: statusMap(vc.status) };
  if (vc.tree !== undefined) c.tree = vc.tree;
  if (vc.row !== undefined) c.tier = vc.row;
  if (vc.col !== undefined) c.col = vc.col;
  if (vc.max !== undefined) c.maxRank = vc.max;
  if (vc.text !== undefined) c.text = vc.text;
  if (vc.renamed !== undefined) c.renamedFrom = vc.renamed;
  if (prev && prev.replaces !== undefined) c.replaces = prev.replaces;
  if (prev && prev.note !== undefined) c.note = prev.note;
  return c;
}
// The fields the vendor owns; replaces/note are ours and are kept.
const classicCore = (c) =>
  c && JSON.stringify([c.status, c.tree, c.tier, c.col, c.maxRank, c.text, c.renamedFrom]);

const idMap = [];
const report = [];
for (const file of fs.readdirSync(path.join(repo, "data/talents"))) {
  const fp = path.join(repo, "data/talents", file);
  const before = fs.readFileSync(fp, "utf8");
  const ours = JSON.parse(before);
  const className = file[0].toUpperCase() + file.slice(1, -5);
  const vendor = snap.talents[className];
  if (!vendor) throw new Error("no vendor class " + className);

  // Class-wide lookup by name: [treeIndex, talent].
  const byName = new Map();
  ours.trees.forEach((t, ti) => t.talents.forEach((x) => byName.set(x.name, [ti, x])));
  const prevClassic = new Map();
  for (const pt of prevSnap.talents[className].trees) for (const p of pt.talents) prevClassic.set(p.name, JSON.stringify(p.classic));
  const vendorMax = new Map();
  for (const vt of vendor.trees) for (const v of vt.talents) vendorMax.set(v.name, v.max);

  const kept = new Set(); // our talent objects still present
  const appended = ours.trees.map(() => []);
  const resolved = new Map(); // vendor name -> our object (for prereq ids)

  vendor.trees.forEach((vt) => {
    const ti = ours.trees.findIndex((t) => t.name === vt.name);
    if (ti < 0) throw new Error(`${className}: no tree ${vt.name}`);
    const prefix = ours.trees[ti].talents[0].id.split("_")[0];
    for (const v of vt.talents) {
      let hit = byName.get(v.name);
      let renamed = false;
      if (!hit && v.classic && v.classic.renamed && byName.has(v.classic.renamed)) {
        hit = byName.get(v.classic.renamed);
        renamed = true;
      }
      let obj;
      if (hit && hit[0] === ti && !renamed) {
        obj = hit[1]; // update in place
      } else {
        const prev = hit ? hit[1] : null;
        obj = {
          id: `${prefix}_${snake(v.name)}`,
          name: v.name,
          tier: 0, col: 0, maxRank: 0, ranks: [],
          confidence: prev ? prev.confidence : "confirmed",
          prereq: null,
          status: "",
          icon: "",
          classic: prev ? prev.classic : undefined,
          passive: false,
        };
        if (prev && prev.reqText !== undefined) obj.reqText = prev.reqText;
        appended[ti].push(obj);
        idMap.push(`${className}: ${prev ? prev.id : "(new)"} -> ${obj.id}${prev ? (renamed ? " (renamed)" : " (moved tree)") : ""}`);
      }
      kept.add(obj);
      resolved.set(v.name, obj);
      obj.name = v.name;
      obj.tier = v.row;
      obj.col = v.col;
      obj.maxRank = v.max;
      obj.ranks = v.desc;
      obj.status = statusMap(v.classic ? v.classic.status : obj.status);
      obj.icon = v.icon;
      obj.passive = v.passive;
      if (v.cost !== undefined) obj.cost = v.cost;
      else delete obj.cost;
      const nc = mapClassic(v.classic, obj.classic);
      const vendorClassicChanged = prevClassic.get(v.name) !== JSON.stringify(v.classic);
      if (vendorClassicChanged && classicCore(nc) !== classicCore(obj.classic)) obj.classic = nc;
      obj._req = v.req;
    }
  });

  ours.trees.forEach((t, ti) => {
    const gone = t.talents.filter((x) => !kept.has(x));
    for (const g of gone) if (!idMap.some((m) => m.startsWith(`${className}: ${g.id} ->`))) idMap.push(`${className}: ${g.id} -> null (removed)`);
    t.talents = t.talents.filter((x) => kept.has(x)).concat(appended[ti]);
    for (const x of t.talents) {
      if (x._req) {
        const r = resolved.get(x._req);
        if (!r) throw new Error(`${className}: prereq ${x._req} unresolved`);
        x.prereq = { id: r.id, ranks: vendorMax.get(x._req) };
      } else x.prereq = null;
      delete x._req;
      if (x.classic === undefined) delete x.classic;
    }
  });

  const after = JSON.stringify(ours, null, 2) + "\n";
  if (after !== before) {
    report.push(`${file}: changed`);
    if (write) fs.writeFileSync(fp, after);
  }
}
console.log(idMap.join("\n") || "(no id changes)");
console.log(report.join("\n") || "(no file changes)");
