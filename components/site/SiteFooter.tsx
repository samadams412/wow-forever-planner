export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center text-xs sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2 font-heading font-semibold tracking-wide text-accent">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/gold-talent-tree-transparent.svg" alt="" className="h-5 w-5" />
          Forevercraft
        </div>
        <p className="text-foreground-muted">
          Forevercraft is a free, fan-made project and is not affiliated with Blizzard Entertainment.
        </p>
      </div>
    </footer>
  );
}
