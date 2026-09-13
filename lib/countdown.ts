const LAUNCH_TIME_ZONE = "America/Chicago";

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
  const asIfUtc = new Date(guess);
  const utcString = asIfUtc.toLocaleString("en-US", { timeZone: "UTC" });
  const zonedString = asIfUtc.toLocaleString("en-US", { timeZone });
  const offset = new Date(utcString).getTime() - new Date(zonedString).getTime();
  return new Date(guess + offset);
}

export const LAUNCH_DATE = zonedTimeToUtc(2026, 11, 4, 18, 0, 0, LAUNCH_TIME_ZONE);

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
