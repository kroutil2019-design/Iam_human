export const API_BASE = '';

const getHeaders = (adminKey?: string) => ({
  'Content-Type': 'application/json',
  ...(adminKey ? { 'x-admin-key': adminKey } : {}),
});

export async function apiGet<T>(path: string, adminKey: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: getHeaders(adminKey),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  adminKey: string
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: getHeaders(adminKey),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
