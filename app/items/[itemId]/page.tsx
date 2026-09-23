import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import ItemTooltipBody from "@/components/reference/ItemTooltipBody";
import { getItemById } from "@/lib/items";
import { mediumIconUrl, itemQualityColor, itemQualityName } from "@/lib/wow-data";
import type { LootItem } from "@/lib/dungeon-loot";

// Not statically generated -- 21,458 items would mean 21,458 pages built up
// front for a page most visitors reach one at a time (from a dungeon drop,
// a quest reward, or the catalog table). lib/items.ts's getItemById reads
// data/items.json through the same module-level cache queryItems already
// uses, so each render after the first is just a Map lookup.

const STATUS_CALLOUT: Record<NonNullable<LootItem["status"]>, { border: string; bg: string; text: string; label: string }> = {
  new: {
    border: "border-green-500/40",
    bg: "bg-green-500/5",
    text: "text-green-400",
    label: "New in Forever: the Classic Era client has no item with this id.",
  },
  changed: {
    border: "border-sky-400/40",
    bg: "bg-sky-400/5",
    text: "text-sky-300",
    label: "Changed from Classic: the tooltip differs on the highlighted lines below.",
  },
  same: {
    border: "border-border",
    bg: "bg-surface/40",
    text: "text-foreground-muted",
    label: "Same as Classic: the tooltip reads the same in both clients.",
  },
  missing: {
    border: "border-amber-400/40",
    bg: "bg-amber-400/5",
    text: "text-amber-300",
    label: "No Forever data yet: the beta client hasn't touched this Classic item.",
  },
};

function parseItemId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ itemId: string }>;
}): Promise<Metadata> {
  const { itemId } = await params;
  const id = parseItemId(itemId);
  const item = id !== null ? getItemById(id) : undefined;
  if (!item) return {};
  return {
    title: item.name,
    description: `${item.name} -- ${itemQualityName(item.quality)}${item.slot ? `, ${item.slot}` : ""} item data for World of Warcraft: Forever, sourced from foreverchanges.pro.`,
  };
}

export default async function ItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const id = parseItemId(itemId);
  const item = id !== null ? getItemById(id) : undefined;
  if (!item) notFound();

  const qualityColor = itemQualityColor(item.quality);
  const metaParts = [itemQualityName(item.quality), item.slot, item.type, item.itemLevel ? `item level ${item.itemLevel}` : null].filter(
    Boolean
  );
  const callout = item.status ? STATUS_CALLOUT[item.status] : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-3 py-8 sm:px-4">
      <Breadcrumbs
        items={[
          { label: "Reference", href: "/reference" },
          { label: "Items", href: "/reference/items" },
          { label: item.name, truncate: true },
        ]}
      />

      <div className="flex items-center gap-3">
        {item.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediumIconUrl(item.icon)} alt="" className="h-10 w-10 shrink-0 rounded border border-border" />
        )}
        <h1 className="font-heading text-2xl font-semibold tracking-wide" style={{ color: qualityColor }}>
          {item.name}
        </h1>
      </div>
      <p className="mt-1 text-sm text-foreground-muted">
        {metaParts.join(", ")}
        {item.itemId !== null ? `, item ${item.itemId}` : ""}
      </p>

      {callout && (
        <div className={`mt-4 rounded border ${callout.border} ${callout.bg} px-3 py-2.5 text-xs`}>
          <span className={`font-semibold ${callout.text}`}>{callout.label}</span>
        </div>
      )}

      <div className="mt-4 rounded border border-[#c8aa6e]/80 bg-[#0a0f1a]/95 p-4 text-left shadow-lg [--quality-common:#ffffff]">
        <ItemTooltipBody item={item} context="catalog" />
      </div>
    </main>
  );
}
