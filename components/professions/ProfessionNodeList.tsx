import LootItemPill from "@/components/reference/LootItemPill";
import ProfessionSkillColors from "@/components/professions/ProfessionSkillColors";
import { mediumIconUrl } from "@/lib/wow-data";
import type { GatheringNode } from "@/lib/gathering-professions";

// Matches foreverchanges.pro/professions/<id>#nodes's own layout for the
// two gathering professions that have named nodes (Mining's "Ore by
// skill", Herbalism's "Herbs by skill") -- a flat list, no category
// sidebar at all (gathering professions don't have the crafting
// professions' slot-based category concept, confirmed live before
// assuming otherwise). Each node's own icon/name/zones come straight off
// the source page rather than through LootItemPill, since a node isn't
// itself an item -- what it yields (ore/herb + rare bonus drops) is, and
// those render through the same shared item pill as everywhere else.
export default function ProfessionNodeList({ nodes, professionId }: { nodes: GatheringNode[]; professionId: string }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-[11px] uppercase tracking-wide text-foreground-muted">
            <th className="px-3 py-2 font-semibold">Node</th>
            <th className="px-3 py-2 font-semibold">Yields</th>
            <th className="px-3 py-2 font-semibold">Zones</th>
            <th className="px-3 py-2 font-semibold">Skill</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node, i) => (
            <tr key={i} className="border-b border-border/60 last:border-b-0 even:bg-surface/40">
              <td className="px-3 py-1.5">
                <span className="inline-flex items-center gap-1.5">
                  {node.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediumIconUrl(node.icon)} alt="" className="h-5 w-5 shrink-0 rounded-sm" />
                  )}
                  {node.name}
                </span>
              </td>
              <td className="px-3 py-1.5">
                <div className="flex flex-wrap gap-1">
                  {node.items.map((item, j) => (
                    <LootItemPill key={j} item={item} tooltipId={`prof:${professionId}:node:${i}:${j}`} context="catalog" />
                  ))}
                </div>
              </td>
              <td className="px-3 py-1.5 text-xs text-foreground-muted">{node.zones}</td>
              <td className="px-3 py-1.5">{node.skills ? <ProfessionSkillColors skills={node.skills} /> : "--"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
