export type MarketSession = "PRE_MARKET" | "OPEN" | "CLOSED";

const OPEN_TIME = "09:15";
const CLOSE_TIME = "15:30";

export function getIstNowParts(date = new Date()) {
  const formattedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);

  return { formattedDate, time };
}

export function getMarketSession(now = new Date()): MarketSession {
  const { time } = getIstNowParts(now);

  if (time < OPEN_TIME) return "PRE_MARKET";
  if (time >= OPEN_TIME && time <= `${CLOSE_TIME}:59`) return "OPEN";
  return "CLOSED";
}

export function getRefreshMeta(generatedAtIso: string, freshnessSecThreshold = 180) {
  const generatedAt = new Date(generatedAtIso);
  const now = new Date();
  const ageSec = Math.max(0, Math.round((now.getTime() - generatedAt.getTime()) / 1000));

  const dataFreshness = ageSec <= freshnessSecThreshold ? "FRESH" : "STALE";
  const nextRefreshAt = new Date(generatedAt.getTime() + freshnessSecThreshold * 1000).toISOString();

  return { dataFreshness, nextRefreshAt, ageSec } as const;
}
