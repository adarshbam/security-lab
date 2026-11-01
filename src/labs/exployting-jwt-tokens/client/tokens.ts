// These operations run in the learner's browser, using only local fictional tokens.
export function encodePart(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
export function decodePart(part: string): Record<string, unknown> {
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(normalized), c => c.charCodeAt(0))));
}
export function inspectToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Expected three JWT segments');
  return { header: decodePart(parts[0]), payload: decodePart(parts[1]), signaturePresent: Boolean(parts[2]) };
}
// #region browser-tamper
export function editClaims(token: string, payload: Record<string, unknown>) {
  const [header, , signature] = token.split('.');
  return `${header}.${encodePart(payload)}.${signature || ''}`;
}
export function unsignedToken(token: string, payload: Record<string, unknown>) {
  const header = inspectToken(token).header;
  return `${encodePart({ ...header, alg: 'none' })}.${encodePart(payload)}.`;
}
// #endregion browser-tamper

// #region browser-confusion
export async function signWithPublicKey(token: string, payload: Record<string, unknown>, publicPem: string) {
  // Actual WebCrypto HMAC in the browser. Exact downloaded PEM bytes matter.
  const input = `${encodePart({ ...inspectToken(token).header, alg: 'HS256' })}.${encodePart(payload)}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(publicPem),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input));
  const encoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return input + '.' + encoded;
}
// #endregion browser-confusion
