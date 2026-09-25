"use client";

import { useRouter } from "next/navigation";

// Plain continent switcher -- navigates between /reference/map/[continent]
// routes. No zone filtering or other sidebar content yet; this is the
// minimal placeholder for where a real left sidebar (zone list, filters)
// goes later, see components/map/MapSidebar.tsx.
export default function ContinentSelect({
  continents,
  current,
}: {
  continents: { id: string; name: string }[];
  current: string;
}) {
  const router = useRouter();

  return (
    <select
      value={current}
      onChange={(e) => router.push(`/reference/map/${e.target.value}`)}
      className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
    >
      {continents.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
