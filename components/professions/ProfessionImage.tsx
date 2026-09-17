import Image from "next/image";

// Same figure/caption shape as guides' GuideImage, but without its hardcoded
// "official Blizzard reveal screenshot" credit line -- profession images are
// concept art for hypothetical recipes/items, not press stills, so that
// credit would be a false attribution here. No credit line at all rather
// than guessing at a real one.
export default function ProfessionImage({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <figure className="my-6">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
        <Image src={src} alt={alt} fill priority={priority} sizes="(min-width: 768px) 700px, 100vw" className="object-cover" />
      </div>
    </figure>
  );
}
