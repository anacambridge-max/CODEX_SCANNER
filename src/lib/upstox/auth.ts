import type { UpstoxTokenPayload } from "@/lib/upstox/types";

const AUTH_BASE = "https://api-v2.upstox.com";

export function getOAuthConfig() {
  const clientId = process.env.UPSTOX_CLIENT_ID;
  const clientSecret = process.env.UPSTOX_CLIENT_SECRET;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI;

  return {
    clientId,
    clientSecret,
    redirectUri,
    ready: Boolean(clientId && clientSecret && redirectUri),
  };
}

export function buildUpstoxLoginUrl(state?: string): string {
  const { clientId, redirectUri } = getOAuthConfig();
  if (!clientId || !redirectUri) {
    throw new Error("Upstox OAuth is not configured.");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  if (state) {
    params.set("state", state);
  }

  return `${AUTH_BASE}/login/authorization/dialog?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<UpstoxTokenPayload> {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Upstox OAuth environment variables are incomplete.");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(`${AUTH_BASE}/login/authorization/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed with status ${response.status}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const obtainedAt = new Date();
  const expiresAt =
    typeof json.expires_in === "number"
      ? new Date(obtainedAt.getTime() + json.expires_in * 1000).toISOString()
      : null;

  return {
    accessToken: json.access_token,
    expiresAt,
    obtainedAt: obtainedAt.toISOString(),
  };
}
