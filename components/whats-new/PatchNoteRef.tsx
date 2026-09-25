"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import { claimActiveTooltip, releaseActiveTooltip, useIsActiveTooltip } from "@/lib/active-tooltip";
import { TooltipCard, TooltipName, TooltipRank, TooltipType, TooltipDescription } from "@/components/planner/TooltipCard";
import { mediumIconUrl } from "@/lib/wow-data";
import type { ResolvedRef } from "@/lib/patch-notes";

const TOOLTIP_WIDTH = 280;

// A talent/spell/racial named in a patch note: icon + name linking to where
// it lives on the site, with the same hover tooltip card (and single-
// tooltip-owner claim, lib/active-tooltip.ts) the planner and spellbook use.
// The tooltip shows the thing's CURRENT text -- the before -> after for the
// change itself is rendered next to the entry, not in here.
export default function PatchNoteRef({
  refData,
  label,
  tooltipId,
}: {
  refData: ResolvedRef;
  label?: string;
  tooltipId: string;
}) {
  const { ref, tooltipRef, pos, show, hide } = useHoverTooltip<HTMLSpanElement>(TOOLTIP_WIDTH, "below", 160);
  const isClaimed = useIsActiveTooltip(tooltipId);

  function handleShow() {
    claimActiveTooltip(tooltipId);
    show();
  }
  function handleHide() {
    releaseActiveTooltip(tooltipId);
    hide();
  }

  // Same scroll-dismiss approach as LootItemPill/the spellbook tooltip.
  const hideRef = useRef(handleHide);
  useEffect(() => {
    hideRef.current = handleHide;
  });
  useEffect(() => {
    function handleScroll() {
      hideRef.current();
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <span
      ref={ref}
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleShow}
      onBlur={handleHide}
      className="inline-flex items-center gap-1.5 rounded border border-border bg-surface/60 px-1.5 py-1 text-sm transition-colors hover:border-accent"
    >
      {refData.icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediumIconUrl(refData.icon)} alt="" className="h-5 w-5 shrink-0 rounded-sm" />
      )}
      <Link href={refData.href} className="font-medium text-foreground hover:underline">
        {label ?? refData.name}
      </Link>
      {pos &&
        isClaimed &&
        createPortal(
          <TooltipCard divRef={tooltipRef} style={{ top: pos.top, left: pos.left, width: pos.width ?? TOOLTIP_WIDTH }}>
            <TooltipName>{refData.name}</TooltipName>
            <TooltipRank>{refData.subtitle}</TooltipRank>
            {refData.typeLine && <TooltipType>{refData.typeLine}</TooltipType>}
            <TooltipDescription>{refData.description}</TooltipDescription>
          </TooltipCard>,
          document.body
        )}
    </span>
  );
}
