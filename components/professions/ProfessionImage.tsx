import Image from "next/image";

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
  const isGrid = variant === "grid";

  if (isGrid) {
    return (
      <figure className="m-0 flex items-center justify-center overflow-hidden rounded-lg border border-border bg-background/50 p-2">
        <div className="relative w-full">
          {/* Using a regular img or Next.js Image with intrinsic scaling via unoptimized or layout auto */}
          <Image
            src={src}
            alt={alt}
            width={600}
            height={800}
            priority={priority}
            sizes="(min-width: 640px) 350px, 100vw"
            className="h-auto w-full rounded object-contain transition-transform duration-200 hover:scale-[1.02]"
          />
        </div>
      </figure>
    );
  }

  // Default Full-Bleed view
  return (
    <figure className="my-6">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-background/50">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(min-width: 768px) 700px, 100vw"
          className="object-contain"
          
        />
      </div>
    </figure>
  );
}