import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { demoUsers } from '../fixtures/accounts.js';

export const ISSUER = 'https://app.security-lab.test:8443/jwt-lab';
export const AUDIENCE = 'security-lab-jwt-bearer';
export const COOKIE_AUDIENCE = 'security-lab-jwt-cookie';
export type Claims = JwtPayload & { sub: string; role: 'user' | 'admin'; epoch: string; jti: string };

export class JwtLabState {
  private keys = this.makeKeys();
  secret = randomBytes(32).toString('hex');
  epoch = randomUUID();
  adminReads = 0;
  profileReads = 0;
  preference = 'blue';
  csrfTokens = new Map<string, string>();

  private makeKeys() {
    return generateKeyPairSync('rsa', { modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  }
  get publicKey() { return this.keys.publicKey; }
  reset() {
    this.keys = this.makeKeys(); this.secret = randomBytes(32).toString('hex');
    this.epoch = randomUUID(); this.adminReads = 0; this.profileReads = 0;
    this.preference = 'blue'; this.csrfTokens.clear();
  }
  snapshot() { return { adminReads: this.adminReads, profileReads: this.profileReads, preference: this.preference }; }

  // #region signing
  issue(username: string, algorithm: 'HS256' | 'RS256', padding = 0, ttl = 300, audience = AUDIENCE) {
    const user = demoUsers.find(u => u.username === username)!;
    const jti = randomUUID();
    const token = jwt.sign({ role: user.role, epoch: this.epoch, ...(padding && { profileNotes: 'x'.repeat(padding) }) },
      algorithm === 'RS256' ? this.keys.privateKey : this.secret,
      { algorithm, subject: user.username, issuer: ISSUER, audience, jwtid: jti, expiresIn: ttl });
    return { token, jti, user: { username: user.username, role: user.role } };
  }
  // #endregion signing

  validateClaims(value: unknown): Claims {
    const p = value as Claims | null;
    if (!p || typeof p !== 'object' || !demoUsers.some(u => u.username === p.sub) ||
      !['user', 'admin'].includes(p.role) || p.epoch !== this.epoch || typeof p.jti !== 'string' ||
      typeof p.exp !== 'number' || p.exp <= Math.floor(Date.now() / 1000)) throw new Error('Invalid, expired or reset lab claims');
    return p;
  }
  // #region verified-claims
  verify(token: string, algorithm: 'HS256' | 'RS256', audience = AUDIENCE) {
    return this.validateClaims(jwt.verify(token, algorithm === 'RS256' ? this.publicKey : this.secret,
      { algorithms: [algorithm], issuer: ISSUER, audience }));
  }
  // #endregion verified-claims

  // This is application-data access AFTER authentication, not a session database lookup.
  profile(claims: Claims, admin = false) {
    this.profileReads++;
    const project = (u: typeof demoUsers[number]) => ({ username: u.username, role: u.role, email: `${u.username}@example.test` });
    if (admin) { this.adminReads++; return demoUsers.map(project); }
    return [project(demoUsers.find(u => u.username === claims.sub)!)];
  }
}
export const jwtState = new JwtLabState();
