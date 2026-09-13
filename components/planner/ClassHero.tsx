import { mediumIconUrl } from "@/lib/wow-data";

// Standard WoW class colors.
const CLASS_COLORS: Record<string, string> = {
  warrior: "#C79C6E",
  paladin: "#F58CBA",
  hunter: "#ABD473",
  rogue: "#FFF569",
  priest: "#FFFFFF",
  shaman: "#0070DE",
  mage: "#69CCF0",
  warlock: "#9482C9",
  druid: "#FF7D0A",
};

function label(classId: string): string {
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

export default function ClassHero({ classId }: { classId: string }) {
  const color = CLASS_COLORS[classId] ?? "var(--accent)";

  return (
    <div
      className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
      style={{
        borderColor: `${color}55`,
        borderBottomWidth: 3,
        borderBottomColor: color,
        background: `linear-gradient(90deg, ${color}22, transparent 80%)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediumIconUrl(`class_${classId}`)} alt="" className="h-9 w-9 rounded" />
      <h2 className="font-heading text-lg font-semibold tracking-wide" style={{ color }}>
        {label(classId)}
      </h2>
    </div>
  );
}
