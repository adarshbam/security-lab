import { randomBytes } from 'node:crypto';

export type WorldName = 'vulnerable' | 'protected';
export type DemoUser = { id: string; displayName: string; role: 'member' | 'admin' };
export type DemoFolder = { id: string; ownerId: string; title: string };
export type DemoFile = { id: string; folderId: string; ownerId: string; title: string; content: string };
type Session = { userId: string; csrf: string };

const users: DemoUser[] = [
  { id: 'alex', displayName: 'Alex Rivera', role: 'member' },
  { id: 'sam', displayName: 'Sam Lee', role: 'member' },
  { id: 'jordan', displayName: 'Jordan Patel', role: 'member' },
  { id: 'morgan', displayName: 'Morgan Chen', role: 'member' },
  { id: 'taylor', displayName: 'Taylor Admin', role: 'admin' },
];
const folders: DemoFolder[] = [
  { id: 'folder-alex', ownerId: 'alex', title: 'Alex’s workspace' },
  { id: 'folder-sam', ownerId: 'sam', title: 'Sam’s private folder' },
  { id: 'folder-jordan', ownerId: 'jordan', title: 'Jordan’s workspace' },
  { id: 'folder-morgan', ownerId: 'morgan', title: 'Morgan’s workspace' },
];
const files: DemoFile[] = [
  { id: 'file-alex', folderId: 'folder-alex', ownerId: 'alex', title: 'Alex’s project notes', content: 'Draft agenda for Alex’s fictional project.' },
  { id: 'file-sam', folderId: 'folder-sam', ownerId: 'sam', title: 'Sam’s private plan', content: 'Sam’s fictional private launch plan.' },
  { id: 'file-jordan', folderId: 'folder-jordan', ownerId: 'jordan', title: 'Jordan’s checklist', content: 'Jordan’s fictional review checklist.' },
  { id: 'file-morgan', folderId: 'folder-morgan', ownerId: 'morgan', title: 'Morgan’s outline', content: 'Morgan’s fictional outline.' },
];

export function ownsResource(actor: DemoUser, resource: { ownerId: string }): boolean { return resource.ownerId === actor.id; }

export class AccessWorld {
  readonly name: WorldName;
  private users = new Map<string, DemoUser>();
  private folders = new Map<string, DemoFolder>();
  private files = new Map<string, DemoFile>();
  private sessions = new Map<string, Session>();
  constructor(name: WorldName) { this.name = name; this.reset(); }
  reset(): void {
    this.users = new Map(users.map(user => [user.id, { ...user }]));
    this.folders = new Map(folders.map(folder => [folder.id, { ...folder }]));
    this.files = new Map(files.map(file => [file.id, { ...file }]));
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
  file(id: string): DemoFile | undefined { return this.files.get(id); }
  folder(id: string): DemoFolder | undefined { return this.folders.get(id); }
  filesFor(userId: string): DemoFile[] { return [...this.files.values()].filter(file => file.ownerId === userId); }
  foldersFor(userId: string): DemoFolder[] { return [...this.folders.values()].filter(folder => folder.ownerId === userId); }
  // #region resource-delete
  deleteFile(actor: DemoUser, id: string): boolean {
    const file = this.files.get(id);
    if (!file || (this.name === 'protected' && !ownsResource(actor, file))) return false;
    this.files.delete(id);
    return true;
  }
  deleteFolder(actor: DemoUser, id: string): boolean {
    const folder = this.folders.get(id);
    if (!folder || (this.name === 'protected' && !ownsResource(actor, folder))) return false;
    this.folders.delete(id);
    for (const [fileId, file] of this.files) if (file.folderId === id) this.files.delete(fileId);
    return true;
  }
  // #endregion resource-delete
  snapshot(): { files: { id: string; ownerId: string; folderId: string; title: string }[]; folders: DemoFolder[] } {
    return {
      files: [...this.files.values()].map(({ id, ownerId, folderId, title }) => ({ id, ownerId, folderId, title })),
      folders: [...this.folders.values()].map(folder => ({ ...folder })),
    };
  }
}
export const accessWorlds = { vulnerable: new AccessWorld('vulnerable'), protected: new AccessWorld('protected') };
export function resetAccessWorlds(): void { accessWorlds.vulnerable.reset(); accessWorlds.protected.reset(); }
