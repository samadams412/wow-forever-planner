const CORNER_POSITION_CLASS = {
  tl: "-top-[3px] -left-[3px] border-t-2 border-l-2",
  tr: "-top-[3px] -right-[3px] border-t-2 border-r-2",
  bl: "-bottom-[3px] -left-[3px] border-b-2 border-l-2",
  br: "-bottom-[3px] -right-[3px] border-b-2 border-r-2",
} as const;

export default function CornerBracket({ position }: { position: keyof typeof CORNER_POSITION_CLASS }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute h-3 w-3 border-accent ${CORNER_POSITION_CLASS[position]}`}
    />
  );
}
