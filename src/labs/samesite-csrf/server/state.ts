import { randomBytes } from 'node:crypto';
import { generateCsrfToken } from './csrf.js';

export interface ProfilePreferences {
  email: string; newsletter: boolean; theme: string; lastUpdatedBy: string; lastUpdatedAt: string;
}
export type SameSiteMode = 'lax' | 'strict' | 'none';
export class SameSiteCsrfLabState {
  public preferences = this.getInitialPreferences();
  public cookieMode: SameSiteMode = 'lax';
  public sessions = new Map<string, { csrfToken: string; expiresAt: number }>();
  getInitialPreferences(): ProfilePreferences {
    return { email: 'learner@security-lab.test', newsletter: true, theme: 'dark',
      lastUpdatedBy: 'initial_state', lastUpdatedAt: new Date().toISOString() };
  }
  reset() { this.preferences = this.getInitialPreferences(); this.cookieMode = 'lax'; this.sessions.clear(); }
  createSession() {
    const sessionToken = 'sess_csrf_' + randomBytes(32).toString('hex');
    const csrfToken = generateCsrfToken();
    this.sessions.set(sessionToken, { csrfToken, expiresAt: Date.now() + 600_000 });
    return { sessionToken, csrfToken };
  }
  getSession(token?: string) {
    const session = token ? this.sessions.get(token) : undefined;
    return session && session.expiresAt > Date.now() ? session : undefined;
  }
  updatePreferences(updates: Partial<ProfilePreferences>, updatedBy: string) {
    this.preferences = { ...this.preferences, ...updates, lastUpdatedBy: updatedBy, lastUpdatedAt: new Date().toISOString() };
  }
}
export const labState = new SameSiteCsrfLabState();
