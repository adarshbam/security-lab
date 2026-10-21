import { randomBytes } from 'node:crypto';

export interface UserProfile {
  id: string; username: string; displayName: string; email: string;
}
interface SessionRecord { expiresAt: number; csrfToken: string }
export class CookieStorageLabState {
  public user = this.getInitialUser();
  public sessions = new Map<string, SessionRecord>();
  public bearerTokens = new Map<string, number>();

  getInitialUser(): UserProfile {
    return { id: 'user_101', username: 'alice', displayName: 'Alice Fictional', email: 'alice@security-lab.test' };
  }
  reset() { this.user = this.getInitialUser(); this.sessions.clear(); this.bearerTokens.clear(); }
  createSession(ttlSeconds = 600) {
    const token = 'opaque_' + randomBytes(32).toString('hex');
    this.sessions.set(token, { expiresAt: Date.now() + ttlSeconds * 1000, csrfToken: randomBytes(32).toString('hex') });
    return token;
  }
  createBearerToken() {
    const token = 'bearer_' + randomBytes(32).toString('hex');
    this.bearerTokens.set(token, Date.now() + 600_000);
    return token;
  }
  getSession(token?: string) {
    const session = token ? this.sessions.get(token) : undefined;
    return session && session.expiresAt > Date.now() ? session : undefined;
  }
  isSessionValid(token?: string) { return Boolean(this.getSession(token)); }
  isBearerValid(token?: string) { return Boolean(token && (this.bearerTokens.get(token) || 0) > Date.now()); }
  revokeSession(token?: string) { if (token) this.sessions.delete(token); }
}
export const labState = new CookieStorageLabState();
