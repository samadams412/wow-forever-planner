// Fetches one item's live page from foreverchanges.pro and extracts its
// full Forever-beta tooltip as an array of strings in the same format
// data/sources/foreverchanges/items/new.json's/changed.json's own "x"
// arrays use (tab-separated "Slot\tType" for the combined line, plain
// strings for everything else) -- so the result can drop straight into a
// raw item record's `x` field and fcItemToUnified renders it exactly like
// a real new/changed item's tooltip, no separate code path.
//
// There is no JSON API for this (confirmed: zero XHR/fetch requests on an
// item page's Network tab) -- this is plain SSR HTML, same as the dungeon
// quest scrape.

const FLAG_LINE = /^(Binds when (equipped|picked up|used)|Unique(\s*\(\d+\))?|Quest Item)$/i;

function cleanText(inner) {
  return inner.replace(/<!-- -->/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim();
}

async function fetchItemTooltip(itemId) {
  const res = await fetch(`https://foreverchanges.pro/item/${itemId}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) return { ok: false, status: res.status };
  const html = await res.text();

  const foreverIdx = html.indexOf('it-label">Forever beta');
  if (foreverIdx === -1) return { ok: false, status: "no-forever-pane" };

  // The Forever pane's it-body runs from its own opening tag to the closing
  // of that pane's outer wrapper -- bounded by the next "it-tip" (there is
  // none after the second pane) or "it-foot" marker.
  const bodyStart = html.indexOf('it-body', foreverIdx);
  if (bodyStart === -1) {
    // "No Forever data yet." (item not yet touched by the beta client) --
    // not an error, just nothing to enrich.
    return { ok: true, noData: true };
  }
  const bodyEnd = html.indexOf("it-foot", bodyStart);
  const bodyHtml = html.slice(bodyStart, bodyEnd === -1 ? undefined : bodyEnd);

  const lineRe = /it-line it-\w+">(.*?)<\/div>/g;
  const lines = [];
  let match;
  while ((match = lineRe.exec(bodyHtml))) {
    const inner = match[1];
    const spanMatches = [...inner.matchAll(/<span>([^<]*)<\/span>/g)];
    if (spanMatches.length >= 2) {
      lines.push(`${cleanText(spanMatches[0][1])}\t${cleanText(spanMatches[1][1])}`);
    } else {
      const text = cleanText(inner);
      if (text) lines.push(text);
    }
  }

  return { ok: true, lines: lines.length ? lines : null };
}

module.exports = { fetchItemTooltip, FLAG_LINE };
