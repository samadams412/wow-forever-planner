import Image from "next/image";

// Same figure/caption shape as guides' GuideImage, but without its hardcoded
// "official Blizzard reveal screenshot" credit line -- profession images are
// concept art for hypothetical recipes/items, not press stills, so that
// credit would be a false attribution here. No credit line at all rather
// than guessing at a real one.
//
// `variant` distinguishes a full-bleed standalone image (the default; same
// sizing as before this prop existed) from a small tile inside
// <GuideImageGrid>: "grid" drops the standalone vertical margin (the grid
// container owns spacing via its own gap) and tightens the `sizes` hint so
// next/image doesn't fetch a 700px-wide image for a ~220px tile.
export default function ProfessionImage({
  src,
  alt,
  priority,
  variant = "full",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  variant?: "full" | "grid";
}) {
  return (
    <figure className={variant === "grid" ? "" : "my-6"}>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={variant === "grid" ? "(min-width: 640px) 220px, 45vw" : "(min-width: 768px) 700px, 100vw"}
          className="object-cover"
        />
      </div>
    </figure>
  );
}
