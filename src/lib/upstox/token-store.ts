import { promises as fs } from "node:fs";
import path from "node:path";
import type { UpstoxTokenPayload, UpstoxSessionStatus } from "@/lib/upstox/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const TOKEN_FILE = path.join(DATA_DIR, "upstox-token.json");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_TABLE = process.env.SUPABASE_UPSTOX_TOKEN_TABLE ?? "upstox_tokens";

interface SupabaseRow {
  id: string;
  access_token: string;
  expires_at: string | null;
  obtained_at: string;
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function loadUpstoxToken(): Promise<UpstoxTokenPayload | null> {
  if (hasSupabaseConfig()) {
    const token = await loadFromSupabase();
    if (token) return token;
  }

  return loadFromLocalFile();
}

export async function saveUpstoxToken(token: UpstoxTokenPayload): Promise<void> {
  if (hasSupabaseConfig()) {
    try {
      await saveToSupabase(token);
      return;
    } catch {
      // Fall back to local file for resilience in development.
    }
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TOKEN_FILE, JSON.stringify(token, null, 2), "utf8");
}

export async function getUpstoxSessionStatus(): Promise<UpstoxSessionStatus> {
  const token = await loadUpstoxToken();

  if (!token) {
    return {
      connected: false,
      expired: false,
      expiresAt: null,
      source: hasSupabaseConfig() ? "SUPABASE" : "NONE",
      message: "Upstox token not found.",
    };
  }

  const expired = isExpired(token.expiresAt);

  return {
    connected: !expired,
    expired,
    expiresAt: token.expiresAt,
    source: hasSupabaseConfig() ? "SUPABASE" : "LOCAL_FILE",
    message: expired ? "Upstox token has expired." : "Upstox session is active.",
  };
}

async function loadFromLocalFile(): Promise<UpstoxTokenPayload | null> {
  try {
    const content = await fs.readFile(TOKEN_FILE, "utf8");
    const parsed = JSON.parse(content) as UpstoxTokenPayload;
    if (!parsed.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function loadFromSupabase(): Promise<UpstoxTokenPayload | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=*&order=obtained_at.desc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  const rows = (await response.json()) as SupabaseRow[];
  const row = rows[0];
  if (!row?.access_token) return null;

  return {
    accessToken: row.access_token,
    expiresAt: row.expires_at,
    obtainedAt: row.obtained_at,
  };
}

async function saveToSupabase(token: UpstoxTokenPayload): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: "primary",
      access_token: token.accessToken,
      expires_at: token.expiresAt,
      obtained_at: token.obtainedAt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase token persistence failed with status ${response.status}`);
  }
}
