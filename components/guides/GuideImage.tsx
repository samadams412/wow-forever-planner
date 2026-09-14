import Image from "next/image";

const CREDIT = "Image: Official World of Warcraft: Forever reveal screenshot, courtesy of Blizzard Entertainment";

export default function GuideImage({
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
      <figcaption className="mt-1.5 text-center text-[11px] text-foreground-muted/60">{CREDIT}</figcaption>
    </figure>
  );
}
