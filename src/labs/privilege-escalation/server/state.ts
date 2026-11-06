import { randomBytes } from 'node:crypto';

export type WorldName = 'vulnerable' | 'protected';
export type DemoUser = { id: string; displayName: string; role: 'member' | 'admin' };
type Session = { userId: string; csrf: string };

const users: DemoUser[] = [
  { id: 'alex', displayName: 'Alex Rivera', role: 'member' },
  { id: 'sam', displayName: 'Sam Lee', role: 'member' },
  { id: 'jordan', displayName: 'Jordan Patel', role: 'member' },
  { id: 'morgan', displayName: 'Morgan Chen', role: 'member' },
  { id: 'taylor', displayName: 'Taylor Admin', role: 'admin' },
];
export function allowedProfileFields(body: Record<string, unknown>): boolean {
  return Object.keys(body).every(key => key === 'displayName') &&
    typeof body.displayName === 'string' && body.displayName.trim().length > 0 && body.displayName.length <= 80;
}

export class AccessWorld {
  readonly name: WorldName;
  private users = new Map<string, DemoUser>();
  private sessions = new Map<string, Session>();
  constructor(name: WorldName) { this.name = name; this.reset(); }
  reset(): void {
    this.users = new Map(users.map(user => [user.id, { ...user }]));
    this.sessions.clear();
  }
  login(userId: string): string | null {
    if (!this.users.has(userId)) return null;
    const token = randomBytes(32).toString('hex');
    this.sessions.set(token, { userId, csrf: randomBytes(32).toString('hex') });
    return token;
  }
  logout(token: string): void { this.sessions.delete(token); }
  session(token: string): Session | undefined { return this.sessions.get(token); }
  actor(token: string): DemoUser | undefined {
    const session = this.sessions.get(token);
    return session && this.users.get(session.userId);
  }
  user(id: string): DemoUser | undefined { return this.users.get(id); }
  allUsers(): DemoUser[] { return [...this.users.values()].map(user => ({ ...user })); }
  // #region profile-update
  updateProfile(actor: DemoUser, body: Record<string, unknown>): DemoUser | null {
    if (this.name === 'protected') {
      if (!allowedProfileFields(body)) return null;
      actor.displayName = body.displayName as string;
    } else {
      // Deliberate mass assignment: a submitted role is stored on the current user.
      Object.assign(actor, body);
    }
    return { ...actor };
  }
  // #endregion profile-update
  // #region admin-delete
  deleteUser(actor: DemoUser, targetId: string): boolean {
    const stableActorId = [...this.users].find(([, user]) => user === actor)?.[0];
    if (actor.role !== 'admin' || stableActorId === targetId || !this.users.has(targetId)) return false;
    this.users.delete(targetId);
    for (const [token, session] of this.sessions) if (session.userId === targetId) this.sessions.delete(token);
    return true;
  }
  // #endregion admin-delete
  snapshot(): { users: DemoUser[] } {
    return { users: this.allUsers() };
  }
}

export const accessWorlds = { vulnerable: new AccessWorld('vulnerable'), protected: new AccessWorld('protected') };
export function resetAccessWorlds(): void { accessWorlds.vulnerable.reset(); accessWorlds.protected.reset(); }
