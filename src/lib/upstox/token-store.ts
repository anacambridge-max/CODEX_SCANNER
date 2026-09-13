import type { UpstoxTokenPayload, UpstoxSessionStatus } from "@/lib/upstox/types";

function getAnalyticsToken(): string | null {
  const token = process.env.UPSTOX_ANALYTICS_TOKEN?.trim();
  return token || null;
}

export async function loadUpstoxToken(): Promise<UpstoxTokenPayload | null> {
  const accessToken = getAnalyticsToken();
  if (!accessToken) return null;
  return { accessToken, expiresAt: null, obtainedAt: new Date().toISOString() };
}

export async function saveUpstoxToken(_token: UpstoxTokenPayload): Promise<void> {
  throw new Error("Analytics-token mode does not persist tokens. Configure UPSTOX_ANALYTICS_TOKEN in deployment secrets.");
}

export async function getUpstoxSessionStatus(): Promise<UpstoxSessionStatus> {
  const token = await loadUpstoxToken();
  return {
    connected: Boolean(token),
    expired: false,
    expiresAt: null,
    source: token ? "SUPABASE" : "NONE",
    message: token ? "Upstox Analytics Token is configured." : "UPSTOX_ANALYTICS_TOKEN is not configured.",
  };
}
