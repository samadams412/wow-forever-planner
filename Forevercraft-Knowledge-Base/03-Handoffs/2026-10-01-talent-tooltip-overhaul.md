---
type: handoff
created: 2026-10-01
tags: [forevercraft, planner, talents, tooltips]
status: active
detail: full-log
---

# Talent tree and tooltip comparison handoff

Branch: `main` · Date: 2026-10-01

## Current State

Talent tree comparison now follows Talents Forever's observed behavior: the full Forever tree stays in its Forever positions and remains interactive, new/changed/moved nodes receive colored status dots, unchanged nodes dim, and Classic talents removed from Forever appear in a footer below each tree. The legend explains the states, comparison styling transitions in, and reduced-motion preferences are honored.

Talent tooltips include Classic name, rank count, original tree position and Classic text where source data provides them. Unchanged talents repeat their current effect as their Classic text. Changed wording is shown as Classic and Forever text with Forever additions highlighted. Spellbook ability tooltips share the charcoal/gold layout; Viper Sting's tooltip was opened in the local browser and showed Classic mana/range/cast stats plus “Added 15 sec cooldown.” The spellbook Compare to Classic button was toggled off and on in the browser, and the planner toggle followed both state changes.

The shared tooltip titles use the 2002 font asset. The compare button uses a gold filled active state and an outlined inactive state.

The latest tooltip refinement adds a gold Ctrl keycap callout, larger framed icons on talent-linked spell cards (all 443 link entries have icons), interactive tooltip cards for removed Classic talents, and the explicit “Same as Classic” status. Hovering a talent now highlights its prerequisite arrow and node in gold; abilities named in its text highlight their matching talent nodes in violet. Berserk in the Druid Feral tree links to Primal Bite, and its prerequisite data points to Leader of the Pack. Arrows brighten and glow along the hovered prerequisite connection.

Same-as-Classic talent cards no longer repeat their effect text in the comparison section. Tooltip typography and the Ctrl detail prompt have been reduced slightly. Talent tooltips now choose among the four sides of the hovered node, clamp to the viewport, and favor placements that avoid covering the active talent grid; the hook repositions after the tooltip's real height is measured and when expanded content changes its size.

Removed Classic abilities present in Forever's spellbook are identified from the reference spellbook data and marked in green with a muted “· baseline” suffix (including Nature's Grasp, Omen of Clarity, Divine Spirit, Consecration and Blessing of Kings). Removed-talent tooltips now use the same global active-tooltip claim as talent and spellbook tooltips, so only one can remain visible at once and stale close events cannot dismiss another tooltip.

Validation completed: local ESLint passed for modified TSX files; `next build` completed successfully, including TypeScript and static page generation; `git diff --check` passed. `npm run lint` and `npm run build` could not start because this environment's global npm CLI path is broken, so the repository-local ESLint and Next.js binaries were invoked directly.

## Active Context

The reference compare mode retains the Forever layout; it does not swap to Classic positions. It colors new/changed/moved talents, dims unchanged talents, adds Classic details to talent tooltips, and lists removed Classic talents below each tree. The reference also shows a “Replay the moves” button beside its legend. Clicking it left the final tree unchanged in the captured state, so its transient animation was not confirmed. The local implementation currently does not include that control.

The local implementation uses `data/talents` metadata for retained talent comparisons and the `talentsforever-2026-10-01.json` `removed` arrays for footer entries. Removed-source rows do not consistently include icons, so each footer entry opens a Classic detail tooltip with ranks, row, and source description. Reference inspection confirmed the Druid compare view shows the full Forever tree, removed-talent footer, and Classic state legend; Berserk is the Feral example linking Leader of the Pack as a prerequisite and Primal Bite from its description.

## Files Modified

- `app/globals.css` — comparison fades and reduced-motion styles; existing 2002 font-face points to `assets/fonts/2002b.ttf`.
- `app/planner/[[...slug]]/PlannerClient.tsx` — comparison legend/instructions and spellbook callback into shared toggle state.
- `components/planner/CompareClassicToggle.tsx` — shared gold active/inactive compare button.
- `components/planner/CompareLegend.tsx` — reference status labels and colors.
- `components/planner/PlannerControls.tsx` — shared compare button in planner toolbar.
- `components/planner/TalentNode.tsx` — unchanged-node dimming/status dots and richer Classic comparisons in talent tooltips.
- `components/planner/TalentTreeGrid.tsx` — full Forever tree stays visible; removed-talent footer uses single-owner Classic detail tooltips and marks source-confirmed baseline abilities; hovering a talent highlights its prerequisite path and linked ability talents.
- `components/planner/TooltipCard.tsx` — shared tooltip appearance, compact typography and Ctrl prompt, enlarged linked-spell icons, “Same as Classic” status, spell stat comparisons, and word-level talent Classic/Forever comparison.
- `lib/use-hover-tooltip.ts` — smart viewport placement that scores candidate sides against the active talent grid.
- `components/planner/TalentNode.tsx` — talent tooltips and compare status plus hover relationship highlights.
- `components/reference/SpellbookBook.tsx` — spellbook comparison control and ability tooltip comparisons.
- `lib/talent-status.ts` — green status color for new-in-Forever talents.

## Next Steps

1. Consider a local “Replay the moves” control if its transient reference animation is later inspected clearly.
2. Add verified Classic metadata to `data/talents/<class>.json` when additional retained talents lack old text or position details.
