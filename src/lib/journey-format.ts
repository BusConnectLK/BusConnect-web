const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "02:20:00" or "02:20" → "2:20 AM". */
export function formatTime(t: string | null | undefined): string {
  if (!t) return "—";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h)) return t;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function recurrenceLabel(recurrence: "daily" | "weekly", weekdays: number[]): string {
  if (recurrence === "daily") return "Daily";
  if (!weekdays.length) return "Weekly";
  if (weekdays.length === 7) return "Daily";
  return [...weekdays].sort((a, b) => a - b).map((d) => DAYS[d]).join(", ");
}

/** Minutes between two HH:MM(:SS) clock times, honouring a same-day/next-day arrival. */
export function durationLabel(
  departTime: string,
  arriveTime: string,
  arriveDayOffset: number,
): string {
  const mins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let total = mins(arriveTime) - mins(departTime) + arriveDayOffset * 24 * 60;
  if (total < 0) total += 24 * 60;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export const WEEKDAYS = DAYS;
