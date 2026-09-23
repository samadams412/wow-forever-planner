// Parses foreverchanges.pro's own /professions/<slug> page HTML (plain SSR,
// no JSON API -- confirmed the same way as the item pages) into the same
// leveling_section/favor_section shape data/professions/
// alchemy_leveling_and_merchants.json already uses (a [min,max] range
// tuple, singular "requirement", tier text with the skill range embedded --
// scripts/build-professions.js already normalizes this shape and
// Blacksmithing's differently-shaped one, so matching Alchemy's is enough).

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

function parseLevelingSection(html) {
  const chapterIdx = html.indexOf('id="leveling"');
  if (chapterIdx === -1) return null;
  const olStart = html.indexOf('<ol class="en3-lv">', chapterIdx);
  if (olStart === -1) return null;
  const olEnd = html.indexOf("</ol>", olStart);
  const olHtml = html.slice(olStart, olEnd);

  // A step's class is sometimes "en3-lv-step en3-lv-rod" (the one-time
  // "Make a Runed Copper Rod" prerequisite step every enchanting leveling
  // path starts with) -- match on the leading class only, not an exact
  // full-attribute match, or that step silently drops entirely.
  const liRe = /<li class="(en3-lv-rank|en3-lv-step)(?:\s[^"]*)?">([\s\S]*?)<\/li>/g;
  const ranks = [];
  let current = null;
  let match;
  while ((match = liRe.exec(olHtml))) {
    const [, kind, inner] = match;
    if (kind === "en3-lv-rank") {
      const rankName = cleanText(inner.match(/<strong>(.*?)<\/strong>/)?.[1] ?? "");
      const requirement = cleanText(inner.replace(/<strong>.*?<\/strong>/, ""));
      current = { rank: rankName, requirement, steps: [] };
      ranks.push(current);
    } else if (kind === "en3-lv-step" && current) {
      const rangeText = cleanText(inner.match(/<span class="en3-lv-range"><b>(.*?)<\/b>/)?.[1] ?? "");
      const [min, max] = rangeText.split(/[–-]/).map((n) => parseInt(n.trim(), 10));

      const whatMatch = inner.match(/<span class="en3-lv-what">([\s\S]*?)<\/span>(?=<span class="en3-lv-count")/);
      const whatHtml = whatMatch?.[1] ?? "";
      const madeMatch = whatHtml.match(/<a href="([^"]+)" class="en3-lv-made"><strong>(.*?)<\/strong><\/a>/);
      // Enchanting's leveling steps make an enchant, not a craftable item --
      // no en3-lv-made link at all, just a bare <strong> ("Enchant Bracer -
      // Inferior Stamina"). Keep the name with a null url rather than
      // dropping the step: resolveItemByName in build-professions.js
      // correctly won't find a real item match for enchant text and falls
      // back to the same unresolved-item treatment used elsewhere on the
      // site, which is the right outcome here, not a bug to work around.
      const item = madeMatch
        ? { name: cleanText(madeMatch[2]), url: absUrl(madeMatch[1]) }
        : { name: cleanText(whatHtml.match(/<strong>(.*?)<\/strong>/)?.[1] ?? ""), url: null };
      const source = cleanText(whatHtml.match(/<small>([\s\S]*?)<\/small>/)?.[1] ?? "");

      const count = cleanText(inner.match(/<span class="en3-lv-count">([\s\S]*?)<\/span>/)?.[1] ?? "");

      const mats = [];
      const matsBlock = inner.match(/<span class="cr-mats">([\s\S]*?)<\/span>\s*<\/li>|<span class="cr-mats">([\s\S]*)$/);
      const matsHtml = (matsBlock?.[1] ?? matsBlock?.[2]) ?? inner;
      // A reagent needing more than 1 renders a small overlay badge on its
      // icon (real WoW UI convention -- a qty-1 reagent gets no badge at
      // all): <a class="cr-mat" aria-label="5 Light Leather"><img .../>
      // <b>5</b></a>. The aria-label's own leading number always matches
      // the <b> value (checked directly), but <b> is the cleaner field to
      // read -- no risk of a false match against a reagent whose real NAME
      // starts with a digit. Capture the whole anchor, not just its
      // opening tag, so the optional <b> is visible to parse.
      const matRe = /<a href="([^"]+)" class="cr-mat" aria-label="([^"]*)">([\s\S]*?)<\/a>/g;
      let matMatch;
      while ((matMatch = matRe.exec(matsHtml))) {
        const [, href, ariaLabel, anchorInner] = matMatch;
        const badgeMatch = anchorInner.match(/<b>(\d+)<\/b>/);
        let quantity = 1;
        let name = cleanText(ariaLabel);
        if (badgeMatch) {
          quantity = parseInt(badgeMatch[1], 10);
          // Strip the same leading number off the aria-label to get the
          // clean item name -- e.g. "5 Light Leather" -> "Light Leather".
          name = name.replace(new RegExp(`^${quantity}\\s+`), "");
        } else {
          // Defensive fallback in case a future pull has a reagent with no
          // <b> badge but the aria-label still carries a leading count
          // (not observed so far -- every qty-1 reagent has neither).
          const leadingNum = name.match(/^(\d+)\s+(.+)/);
          if (leadingNum) {
            quantity = parseInt(leadingNum[1], 10);
            name = leadingNum[2];
          }
        }
        mats.push({ name, quantity, url: absUrl(href) });
      }

      current.steps.push({
        range: [min, max],
        item,
        source,
        count,
        mats,
      });
    }
  }
  return ranks;
}

function parseFavorSection(html) {
  const chapterIdx = html.indexOf('id="favor"');
  if (chapterIdx === -1) return null;
  const nextChapterIdx = html.indexOf('class="dgx-chapter"', chapterIdx + 20);
  const chapterHtml = html.slice(chapterIdx, nextChapterIdx === -1 ? undefined : nextChapterIdx);

  const tierRe = /<div class="en3-tier">([\s\S]*?)<\/div>\s*(?=<div class="en3-tier">|<p class="en3|$)/g;
  const tiers = [];
  let match;
  while ((match = tierRe.exec(chapterHtml))) {
    const inner = match[1];
    const h3Match = inner.match(/<h3 class="en3-h3">(.*?)<\/h3>/);
    if (!h3Match) continue;
    const h3Inner = h3Match[1];
    const smallMatch = h3Inner.match(/<small>(.*?)<\/small>/);
    const tierTitle = cleanText(h3Inner.replace(/<small>.*?<\/small>/, ""));
    const skillRange = smallMatch ? cleanText(smallMatch[1]) : "";
    const tierText = skillRange ? `${tierTitle} (${skillRange})` : tierTitle;

    const items = [];
    const itemRe = /<li><a href="([^"]+)">[\s\S]*?<span class="q\d">(.*?)<\/span>[\s\S]*?<span class="en3-skill[^"]*">(\d+)<\/span>/g;
    let itemMatch;
    while ((itemMatch = itemRe.exec(inner))) {
      items.push({
        name: cleanText(itemMatch[2]),
        url: absUrl(itemMatch[1]),
        skill_threshold: parseInt(itemMatch[3], 10),
      });
    }
    tiers.push({ tier: tierText, items });
  }
  return tiers;
}

// One <li> from either "Legacy points and title" (plain <ol class="pr-
// milestones">) or "At camp" (<ol class="pr-milestones pr-camp">) -- same
// per-<li> shape either way: an icon, a name (plain <strong> text, or a
// linked <strong><a> when the milestone is a real item -- the Certification
// title and every camp object are; the skill-rank milestones aren't), a
// description line, and a trailing reward -- "+1 Legacy point" for a
// milestone, or "Skill N[ <a>Blueprint</a>]" for a camp object/the
// Certification entry.
function parseMilestoneItems(olHtml) {
  const items = [];
  const liRe = /<li>([\s\S]*?)<\/li>/g;
  let match;
  while ((match = liRe.exec(olHtml))) {
    const inner = match[1];
    // The row's own icon -- for a skill-rank milestone (Journeyman/Expert/
    // Artisan) this is the profession's trade icon, not any real item's
    // icon (those milestones have no item at all); kept separately from
    // any resolved item so the UI doesn't need to fake an item icon for a
    // row that isn't one.
    const iconMatch = inner.match(/<img src="\/icon\/([^".]+)\.jpg"/);
    const icon = iconMatch ? iconMatch[1] : null;
    const nameMatch = inner.match(/<strong>(?:<a href="([^"]+)">)?(.*?)(?:<\/a>)?<\/strong>/);
    const name = cleanText(nameMatch?.[2] ?? "");
    const itemUrl = nameMatch?.[1] ? absUrl(nameMatch[1]) : null;
    const descMatch = inner.match(/<\/strong><span>([\s\S]*?)<\/span><\/span>/);
    const description = cleanText(descMatch?.[1] ?? "");

    const pointsMatch = inner.match(/<span class="pr-points">([\s\S]*?)<\/span>/);
    const skillMatch = inner.match(/<span class="pr-camp-skill">Skill (\d+)(?:<!-- -->\s*<a href="([^"]+)">Blueprint<\/a>)?<\/span>/);

    items.push({
      name,
      icon,
      item_url: itemUrl,
      description,
      legacy_points: pointsMatch ? cleanText(pointsMatch[1]) : null,
      skill: skillMatch ? parseInt(skillMatch[1], 10) : null,
      blueprint_url: skillMatch?.[2] ? absUrl(skillMatch[2]) : null,
    });
  }
  return items;
}

// The "Camp, skill rewards and perks" chapter (id="camp") has two <ol>
// lists (Legacy milestones, then camp objects) plus a "Legacy perks" list
// that is NOT parsed here -- studied live across multiple professions
// (Leatherworking, Tailoring) and confirmed byte-for-byte identical prose/
// values on every profession's page (same 3 "Professions" Legacy tree
// perks, same descriptions, same /legacy-perks#perk= anchors) -- it's not
// profession-specific content, just the same generic tree shown on every
// page. That data already exists in data/legacy-perks.json from an earlier
// session; the build step reuses it by id instead of re-scraping the same
// 3 perks 8 times.
function parseCampSection(html) {
  const chapterIdx = html.indexOf('id="camp"');
  if (chapterIdx === -1) return null;
  // Camp is the last chapter on the page (confirmed live -- no further
  // "<section id=" follows it, unlike every earlier chapter), so there's
  // no next-chapter marker to bound against; the page footer is the
  // reliable end-of-content boundary instead.
  const footerIdx = html.indexOf("<footer", chapterIdx);
  const chapterHtml = html.slice(chapterIdx, footerIdx === -1 ? undefined : footerIdx);

  const milestonesMatch = chapterHtml.match(/<ol class="pr-milestones">([\s\S]*?)<\/ol>/);
  const campMatch = chapterHtml.match(/<ol class="pr-milestones pr-camp">([\s\S]*?)<\/ol>/);

  return {
    milestones: milestonesMatch ? parseMilestoneItems(milestonesMatch[1]) : [],
    camp_objects: campMatch ? parseMilestoneItems(campMatch[1]) : [],
  };
}

async function fetchProfessionPage(slug) {
  const res = await fetch(`${BASE}/professions/${slug}`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return { ok: false, status: res.status };
  const html = await res.text();
  return {
    ok: true,
    leveling_section: parseLevelingSection(html),
    favor_section: parseFavorSection(html),
    camp_section: parseCampSection(html),
  };
}

module.exports = { fetchProfessionPage, parseLevelingSection, parseFavorSection, parseCampSection };
