import { mediumIconUrl, CLASS_COLOR } from "@/lib/wow-data";

function label(classId: string): string {
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

export default function ClassHero({ classId }: { classId: string }) {
  const color = CLASS_COLOR[classId] ?? "var(--accent)";

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
