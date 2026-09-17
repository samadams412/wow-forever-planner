import Image from "next/image";

const DEFAULT_CREDIT = "Image: Official World of Warcraft: Forever reveal screenshot, courtesy of Blizzard Entertainment";

export default function GuideImage({
  src,
  alt,
  priority,
  credit,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  credit?: string;
}) {
  const displayCredit = credit !== undefined ? credit : DEFAULT_CREDIT;

  return (
    <figure className="my-6">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
        <Image src={src} alt={alt} fill priority={priority} sizes="(min-width: 768px) 700px, 100vw" className="object-cover" />
      </div>
      {displayCredit && (
        <figcaption className="mt-1.5 text-center text-[11px] text-foreground-muted/60">
          {displayCredit}
        </figcaption>
      )}
    </figure>
  );
}