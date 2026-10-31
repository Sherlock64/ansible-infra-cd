export type SyncStatus = "synced" | "out_of_sync" | "error" | "unknown";

export interface Target {
  id: number;
  name: string;
  kind: "aap" | "awx";
  url: string;
  verify_tls: boolean;
  token_set: boolean;
  last_ping_at: string | null;
  last_ping_ok: boolean | null;
  last_ping_message: string;
}

export interface Repository {
  id: number;
  target: number;
  target_name: string;
  name: string;
  git_url: string;
  branch: string;
  config_path: string;
  sync_status: SyncStatus;
  last_commit: string;
  last_synced_at: string | null;
  drift_summary: string;
}

export interface SyncRun {
  id: number;
  repository: number;
  repository_name: string;
  status: "pending" | "running" | "success" | "failed";
  commit: string;
  summary: string;
  started_at: string;
  finished_at: string | null;
}

export interface Overview {
  health: "healthy" | "degraded" | "error" | "unknown";
  target: Target | null;
  totals: { repositories: number; synced: number; out_of_sync: number; error: number; unknown: number };
  avg_sync_seconds: number | null;
  success_rate_7d: { date: string; percent: number | null }[];
  needs_attention: Repository[];
  activity: SyncRun[];
  system: { status: string; checks: Record<string, boolean> };
}

export interface Page<T> {
  results: T[];
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function csrfToken(): string {
  const match = document.cookie.split("; ").find((c) => c.startsWith("csrftoken="));
  return match ? decodeURIComponent(match.split("=")[1]) : "";
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = init.method ?? "GET";
  const response = await fetch(`/api/v1${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" ? { "X-CSRFToken": csrfToken() } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail ?? Object.entries(data).map(([k, v]) => `${k}: ${v}`).join("; ");
    throw new ApiError(response.status, detail || response.statusText);
  }
  return data as T;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 90) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hr ago`;
  return `${Math.round(seconds / 86400)} d ago`;
}
