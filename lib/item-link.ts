// Shared helper for every link to /items/[itemId] on the site, so the item
// page can always render a "Back to {page the user came from}" link instead
// of a generic one. Pair with components/reference/ItemLinkSource.tsx, which
// supplies the `from`/`fromLabel` values via context so deeply-nested item
// renderers (LootItemPill) don't need them threaded through every
// intermediate component's props.
export type ItemLinkSource = { from: string; fromLabel: string };

export function buildItemHref(itemId: number, source?: ItemLinkSource | null): string {
  if (!source) return `/items/${itemId}`;
  const params = new URLSearchParams({ from: source.from, fromLabel: source.fromLabel });
  return `/items/${itemId}?${params.toString()}`;
}
