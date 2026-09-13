export default function GoldRule({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-px w-full ${className}`} aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--accent) 15%, var(--accent) 85%, transparent)",
        }}
      />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-accent" />
    </div>
  );
}
