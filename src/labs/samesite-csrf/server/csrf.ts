import { randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { LEGITIMATE_ORIGIN } from '../../../server/middleware/admin-guard.js';

export function generateCsrfToken() { return randomBytes(32).toString('hex'); }

// #region origin-check
export function validateOrigin(req: Pick<Request, 'headers'>): { valid: boolean; reason?: string } {
  return req.headers.origin === LEGITIMATE_ORIGIN
    ? { valid: true }
    : { valid: false, reason: 'Origin must exactly match the legitimate application; missing and null origins fail closed.' };
}
// #endregion origin-check
