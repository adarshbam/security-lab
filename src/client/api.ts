export const controlHeaders = { 'X-Security-Lab-Admin': 'true' };

export async function jsonRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`);
  return data;
}

export function controlRequest(url: string, body: object = {}) {
  return jsonRequest(url, {
    method: 'POST',
    headers: { ...controlHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
