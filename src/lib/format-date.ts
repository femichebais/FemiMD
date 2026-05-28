// All app-facing timestamps render in EST (America/New_York), since this is
// what users expect. Without an explicit timeZone the formatter inherits the
// Node server's TZ (UTC in prod), which produced wrong-day-of-week reports.

const TZ = "America/New_York";

export const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: TZ,
});

export const shortDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: TZ,
});

export function formatDateTime(d: Date | string | number): string {
  return dateTimeFmt.format(new Date(d));
}

export function formatShortDate(d: Date | string | number): string {
  return shortDateFmt.format(new Date(d));
}
