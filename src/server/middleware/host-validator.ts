import type { Request, Response, NextFunction } from 'express';

const ALLOWED_AUTHORITIES = new Set([
  'app.security-lab.test:8443', 'sibling.security-lab.test:8443',
  'attacker.csrf-lab.test:8443', 'app.security-lab.test:8080',
]);

export function hostValidatorMiddleware(req: Request, res: Response, next: NextFunction) {
  if (Object.keys(req.headers).some(name => name === 'forwarded' || name.startsWith('x-forwarded-'))) {
    res.status(400).json({ error: 'Proxy headers rejected' });
    return;
  }
  const authority = req.headers.host?.toLowerCase();
  if (!authority || !ALLOWED_AUTHORITIES.has(authority)) {
    res.status(400).json({ error: 'Invalid Host header' });
    return;
  }
  const port = req.socket?.localPort;
  if (port && !authority.endsWith(`:${port}`)) {
    res.status(400).json({ error: 'Invalid listener port' });
    return;
  }
  next();
}
