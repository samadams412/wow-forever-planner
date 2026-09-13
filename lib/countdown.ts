const LAUNCH_TIME_ZONE = "America/Chicago";

// How far `timeZone`'s wall clock reads from UTC at `instant`, in ms
// (negative west of UTC, e.g. -6h for America/Chicago in CST). Reads the
// live offset via Intl.DateTimeFormat so it reflects whatever DST rule is
// in effect at that instant, rather than a hardcoded offset.
function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - instant.getTime();
}

// Resolves a wall-clock date/time in `timeZone` to the correct UTC instant,
// so DST transitions (e.g. CDT vs. CST) are handled by the platform's tz
// database instead of a hardcoded offset.
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMs = getTimeZoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess - offsetMs);
}

const ONE_HOUR_MS = 60 * 60 * 1000;

// Manual correction: the resolved instant below still ran an hour ahead of
// Blizzard's own countdown when compared directly, so it's shifted back an
// hour here rather than in the timezone math above.
export const LAUNCH_DATE = new Date(
  zonedTimeToUtc(2026, 11, 4, 18, 0, 0, LAUNCH_TIME_ZONE).getTime() - ONE_HOUR_MS
);

export type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

export function getCountdown(target: Date, now: Date = new Date()): Countdown {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  const totalSeconds = Math.floor(diffMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: false,
  };
}
