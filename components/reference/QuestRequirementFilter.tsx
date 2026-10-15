"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { requirementSlug } from "@/lib/quest-requirements";

// One Class / Race / Profession dropdown for /reference/quests. Same URL-param
// pattern as QuestDungeonFilter: every other param is kept, paging resets.
export default function QuestRequirementFilter({
  param,
  label,
  options,
  value,
}: {
  param: "class" | "race" | "profession";
  label: string;
  options: string[];
  // The selected option's slug, or "" when this filter is off.
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(param, next);
    else params.delete(param);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label
      className={`inline-flex items-center rounded border border-border bg-surface px-2 py-1.5 text-xs transition-colors ${
        value ? "border-accent/60 text-accent" : "text-foreground-muted hover:text-foreground"
      }`}
    >
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="cursor-pointer bg-transparent text-xs focus:outline-none [&_option]:bg-surface [&_option]:text-foreground"
      >
        {/* Picking the label itself clears the filter. */}
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option} value={requirementSlug(option)}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
