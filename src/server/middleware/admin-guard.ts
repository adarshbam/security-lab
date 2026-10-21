import type { Request, Response, NextFunction } from 'express';

export const LEGITIMATE_ORIGIN = 'https://app.security-lab.test:8443';

// All control calls use POST so the browser supplies an Origin header.
export function adminGuard(req: Request, res: Response, next: NextFunction) {
  if (req.headers['x-security-lab-admin'] !== 'true') {
    res.status(403).json({ error: 'Forbidden', reason: 'missing_admin_header' });
    return;
  }
  if (req.headers.origin !== LEGITIMATE_ORIGIN) {
    res.status(403).json({ error: 'Forbidden', reason: 'invalid_origin' });
    return;
  }
  next();
}
