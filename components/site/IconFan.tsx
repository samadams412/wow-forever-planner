import { mediumIconUrl } from "@/lib/wow-data";

// Generic overlapping icon stack used as a compact summary for a collapsible
// section that has several sub-items (races, trees, etc) -- pass the icon of
// whichever sub-item is representative (e.g. "first N sub-items' first
// child"), 2 to 4 of them. The first icon leans counterclockwise, the last
// leans clockwise, and anything in between sits flat on top.
export default function IconFan({
  icons,
  size = 28,
  className = "",
}: {
  icons: string[];
  size?: number;
  className?: string;
}) {
  const n = icons.length;

  return (
    <div className={`flex items-center ${className}`} style={{ paddingRight: size * 0.35 }}>
      {icons.map((icon, i) => {
        const isEdge = i === 0 || i === n - 1;
        const rotate = i === 0 ? -12 : i === n - 1 ? 12 : 0;
        const dip = isEdge ? size * 0.14 : 0;

        return (
          <img
            key={icon + i}
            // eslint-disable-next-line @next/next/no-img-element
            src={mediumIconUrl(icon)}
            alt=""
            className="shrink-0 rounded-sm border-2 border-background object-cover"
            style={{
              width: size,
              height: size,
              marginLeft: i === 0 ? 0 : -size * 0.4,
              transform: `rotate(${rotate}deg) translateY(${dip}px)`,
              position: "relative",
              zIndex: isEdge ? 10 : 20 + i,
            }}
          />
        );
      })}
    </div>
  );
}
