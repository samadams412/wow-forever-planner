#!/usr/bin/env node
// Builds data/talent-spell-links.json: for every talent, which other
// spells/talents its description names by name (the "Ctrl-hold" reference
// on talentsforever.com -- e.g. Bloodthrill mentioning Rend and Overpower,
// Healing Light mentioning Holy Light/Flash of Light/Holy Shock).
//
// This is a generated file, regenerate it with:
//   node scripts/build-talent-spell-links.js
// after data/talents/*.json or data/spellbooks.json changes, or after a
// fresh vendor snapshot adds/renames spells.
//
// Matching is plain name-scanning: for each class, build the set of names
// a talent's description could plausibly reference -- every trainer spell
// in that class's spellbook (data/spellbooks.json) and every other talent
// name in that class -- and find which of those literal names appear in
// the talent's own (max-rank) description text. This is a heuristic, not
// a vendor-provided linkage (talentsforever.com's own data has no explicit
// "modifies" field either, as far as this project's ingested snapshots
// show) -- ambiguous or clearly-wrong matches should be fixed by adding to
// EXCLUDE_PAIRS below rather than by hand-editing the generated JSON.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CLASSES = ["warrior", "paladin", "hunter", "rogue", "priest", "shaman", "mage", "warlock", "druid"];

// Talent name -> spell name it should NOT link to, because the plain-text
// match is a false positive (a common word, or a substring collision).
// Add `"<TalentName>": ["<SpellOrTalentName>", ...]` entries here as they're
// found; keep this list -- don't silently change the matching algorithm to
// paper over a specific bad match.
const EXCLUDE_PAIRS = {};

function classLabel(classId) {
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

function loadSpellbook(classId) {
  const sb = require(path.join(ROOT, "data", "spellbooks.json"));
  const byName = new Map();
  for (const tab of sb.classes[classId].tabs) {
    for (const s of tab.spells) if (!byName.has(s.name)) byName.set(s.name, s);
  }
  return byName;
}

function loadTalents(classId) {
  return require(path.join(ROOT, "data", "talents", `${classId}.json`));
}

// Vendor's spell_desc keys are "Class|Spell|<Rank N | Passive | other>".
// Picks the highest numbered rank available for a spell; falls back to
// whatever single entry exists if none of its keys are numbered.
function highestRankEntry(spellDesc, classId, spellName) {
  const prefix = `${classLabel(classId)}|${spellName}|`;
  let best = null;
  let bestRank = -1;
  for (const [key, entry] of Object.entries(spellDesc)) {
    if (!key.startsWith(prefix)) continue;
    const suffix = key.slice(prefix.length);
    const m = suffix.match(/Rank (\d+)/);
    const rank = m ? parseInt(m[1], 10) : 0;
    if (rank > bestRank) {
      bestRank = rank;
      best = entry;
    }
  }
  return best ? { rank: bestRank > 0 ? bestRank : null, entry: best } : null;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// One combined alternation, longest name first, matched with matchAll --
// deliberately the exact same approach lib/talent-spell-links.ts's runtime
// splitTextWithLinks() uses. Matching each candidate name independently
// against the full text (the previous approach) double-counted a shorter
// name that's a word-boundary-valid prefix of a longer one also present at
// the same spot -- e.g. "Bane" is its own \b...\b match inside "Bane of
// Agony", so both got recorded as separate links even though there's only
// one real mention in the text. A single ordered alternation only ever
// consumes each span once, so a name fully absorbed into a longer match
// never shows up a second time -- and this guarantees build-time linkage
// and runtime highlighting always agree on what actually got matched.
function findMentions(text, candidateNames) {
  if (candidateNames.size === 0) return [];
  const sorted = [...candidateNames].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${sorted.map(escapeRegExp).join("|")})\\b`, "g");
  const found = [];
  const seen = new Set();
  for (const match of text.matchAll(pattern)) {
    if (!seen.has(match[0])) {
      seen.add(match[0]);
      found.push(match[0]);
    }
  }
  return found;
}

function build() {
  const links = {};
  let spellDescSnapshot;
  try {
    spellDescSnapshot = require(path.join(
      ROOT,
      "data",
      "sources",
      "talentsforever",
      "talentsforever-2026-09-18-v3-spelldesc.json"
    ));
  } catch {
    console.error("Missing fresh vendor snapshot with full per-rank spell_desc; aborting.");
    process.exit(1);
  }

  for (const classId of CLASSES) {
    const classData = loadTalents(classId);
    const spellbook = loadSpellbook(classId);
    const talentsByName = new Map(classData.trees.flatMap((t) => t.talents.map((tal) => [tal.name, { tree: t, talent: tal }])));
    const candidateNames = new Set([...spellbook.keys(), ...talentsByName.keys()]);

    for (const tree of classData.trees) {
      for (const talent of tree.talents) {
        candidateNames.delete(talent.name); // never link a talent to itself
        const maxRankText = talent.ranks[talent.ranks.length - 1];
        const excluded = new Set(EXCLUDE_PAIRS[talent.name] ?? []);
        const mentions = findMentions(maxRankText, candidateNames).filter((n) => !excluded.has(n));
        candidateNames.add(talent.name);

        if (mentions.length === 0) continue;

        const entries = [];
        for (const name of mentions) {
          if (talentsByName.has(name)) {
            const linked = talentsByName.get(name);
            entries.push({
              name,
              kind: "talent",
              source: `Talent · ${linked.tree.name}, row ${linked.talent.tier}`,
              description: linked.talent.ranks[linked.talent.ranks.length - 1],
              icon: linked.talent.icon,
            });
          } else {
            const found = highestRankEntry(spellDescSnapshot.spell_desc, classId, name);
            if (!found) continue; // in spellbook but no spell_desc text available -- skip rather than guess
            entries.push({
              name,
              kind: "spell",
              source: found.rank ? `${classLabel(classId)} spell, rank ${found.rank}` : `${classLabel(classId)} spell`,
              description: found.entry.d,
              icon: spellbook.get(name)?.icon,
            });
          }
        }
        // Namespaced by class, not just talent.id -- a handful of talent
        // ids collide across classes (e.g. "protection_shield_specialization"
        // exists for both Warrior and Paladin, since ids are generated from
        // tree+name without a class prefix). A flat talent.id key silently
        // let one class's entry leak into another's lookup whenever the
        // second class produced zero links of its own for the same id.
        if (entries.length > 0) links[`${classId}:${talent.id}`] = entries;
      }
    }
  }

  const outPath = path.join(ROOT, "data", "talent-spell-links.json");
  fs.writeFileSync(outPath, JSON.stringify(links, null, 2) + "\n", "utf8");
  console.log(`Wrote ${Object.keys(links).length} talents with linked spells to ${path.relative(ROOT, outPath)}`);
}

build();
