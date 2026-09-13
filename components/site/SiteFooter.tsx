export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center text-xs text-foreground-muted sm:flex-row sm:justify-between sm:text-left">
        <p>Forevercraft is a free, fan-made project and is not affiliated with Blizzard Entertainment.</p>
        <a
          href="https://github.com/samadams412/wow-forever-planner"
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
