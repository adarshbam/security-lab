import { timingSafeEqual } from 'node:crypto';

export function tokenMatches(candidate: unknown, expected: string): boolean {
  if (typeof candidate !== 'string') return false;
  const supplied = Buffer.from(candidate);
  const wanted = Buffer.from(expected);
  return supplied.length === wanted.length && timingSafeEqual(supplied, wanted);
}
