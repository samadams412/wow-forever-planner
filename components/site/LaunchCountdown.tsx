"use client";

import { useEffect, useState } from "react";
import { LAUNCH_DATE, getCountdown, type Countdown } from "@/lib/countdown";

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-heading text-2xl font-bold tabular-nums text-accent sm:text-4xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-foreground-muted sm:text-xs">{label}</span>
    </div>
  );
}

export default function LaunchCountdown() {
  const [countdown, setCountdown] = useState<Countdown | null>(null);

  useEffect(() => {
    const tick = () => setCountdown(getCountdown(LAUNCH_DATE));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const c = countdown ?? { days: 0, hours: 0, minutes: 0, seconds: 0, done: false };

  return (
    <div className="w-full rounded-xl border border-accent/50 bg-background/50 px-4 py-4 shadow-gold-glow backdrop-blur-sm sm:px-6">
      <p className="text-center text-sm font-medium text-foreground sm:text-base">
        {c.done
          ? "World of Warcraft: Forever is here!"
          : "World of Warcraft: Forever is coming November 4th!"}
      </p>
      {!c.done && (
        <div className="mt-3 flex items-center justify-center gap-2 sm:gap-5">
          <Unit value={c.days} label="Days" />
          <span className="pb-4 text-xl font-bold text-accent/50 sm:text-2xl">:</span>
          <Unit value={c.hours} label="Hours" />
          <span className="pb-4 text-xl font-bold text-accent/50 sm:text-2xl">:</span>
          <Unit value={c.minutes} label="Min" />
          <span className="pb-4 text-xl font-bold text-accent/50 sm:text-2xl">:</span>
          <Unit value={c.seconds} label="Sec" />
        </div>
      )}
    </div>
  );
}