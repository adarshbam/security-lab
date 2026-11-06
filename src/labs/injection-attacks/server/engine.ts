import { DatabaseSync } from 'node:sqlite';
import { Query } from 'mingo/query';
import { Context } from 'mingo/core';
import { $eq, $ne } from 'mingo/operators/query';

export type Engine = 'sql' | 'nosql' | 'coercion';
export type World = 'vulnerable' | 'protected';
export type Actor = { id: string; username: string };
const documents = [
  { id: 'alex', username: 'alex', password: 'paper-lantern' },
  { id: 'sam', username: 'sam', password: 'cedar-path' },
];
const context = Context.init({ query: { $eq, $ne } });
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT, password TEXT)');
for (const user of documents) db.prepare('INSERT INTO users VALUES (?, ?, ?)').run(user.id, user.username, user.password);
db.exec('PRAGMA query_only = ON');
const publicActor = (user: Actor | undefined): Actor | null => user ? { id: user.id, username: user.username } : null;
export const typeOf = (value: unknown): string => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
function strings(username: unknown, password: unknown): username is string {
  return typeof username === 'string' && typeof password === 'string' && username.length > 0 && password.length > 0 && username.length <= 256 && password.length <= 256;
}
// This is an intentionally bounded query-language lesson, not arbitrary MongoDB.
function supported(value: unknown): boolean {
  return typeof value === 'string' || (value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === 1 && Object.entries(value).every(([key, operand]) => ['$ne', '$eq'].includes(key) && typeof operand === 'string'));
}
export function evaluateLogin(engine: Engine, world: World, body: unknown): { actor: Actor | null; status: number; decision: string; queryStructure: string; types: Record<string, string> } {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const { username, password } = input;
  const types = { username: typeOf(username), password: typeOf(password) };
  const invalid = (decision: string) => ({ actor: null, status: 400, decision, queryStructure: 'Not evaluated', types });
  if (Object.keys(input).some(key => !['username', 'password'].includes(key))) return invalid('Only username and password fields are accepted');
  if ((engine === 'sql' || world === 'protected') && !strings(username, password)) return invalid('Nonempty strings of at most 256 characters required');
  let actor: Actor | null = null;
  let queryStructure = '';
  try {
    // #region sql-login
    if (engine === 'sql') {
      // Both variants validate strings. Validation alone does not prevent SQL injection.
      const sql = world === 'vulnerable'
        ? `SELECT id, username FROM users WHERE username = '${username}' AND password = '${password}' ORDER BY id LIMIT 1`
        : 'SELECT id, username FROM users WHERE username = ? AND password = ? ORDER BY id LIMIT 1';
      const statement = db.prepare(sql);
      const row = world === 'vulnerable' ? statement.get() : statement.get(username as string, password as string);
      // Never reflect attacker-controlled SELECT projections as an account or credential.
      actor = publicActor(documents.find(user => user.id === row?.id));
      // Literal contents and comment contents never enter persisted inspector evidence.
      queryStructure = world === 'vulnerable'
        ? "SELECT id, username FROM users WHERE username = '<concatenated input redacted>' AND password = '<concatenated input redacted>' ORDER BY id LIMIT 1 (construction template; actual input may change parsing)"
        : 'SELECT id, username FROM users WHERE username = ? AND password = ? ORDER BY id LIMIT 1; bindings: [REDACTED], [REDACTED]';
    }
    // #endregion sql-login
    // #region nosql-login
    if (engine === 'nosql') {
      if (!supported(username) || !supported(password)) return invalid('This bounded engine accepts strings or one $eq/$ne string operand per field');
      const criteria = world === 'vulnerable' ? { username, password }
        : { username: { $eq: username }, password: { $eq: password } };
      // Real Mongo-style predicate evaluation; script operators are unavailable.
      const query = new Query(criteria, { context, scriptEnabled: false });
      actor = publicActor(documents.find(user => query.test(user)));
      queryStructure = JSON.stringify(criteria, (_key, value) => typeof value === 'string' ? '[REDACTED]' : value);
    }
    // #endregion nosql-login
    // #region coercion-login
    if (engine === 'coercion') {
      // Deliberately weak fictional PIN demonstrates JS equality, not SQL or PHP semantics.
      const user = { id: 'pin-demo', username: 'pin-demo', password: '0' };
      const matches = world === 'vulnerable'
        ? username == user.username && password == user.password
        : username === user.username && password === user.password;
      actor = matches ? publicActor(user) : null;
      queryStructure = world === 'vulnerable' ? 'username == storedUsername && password == storedPassword'
        : 'validated strings: username === storedUsername && password === storedPassword';
    }
    // #endregion coercion-login
  } catch {
    return { actor: null, status: 400, decision: 'Query rejected by engine; no identity established', queryStructure: 'Query error (details omitted to avoid credential disclosure)', types };
  }
  return { actor, status: actor ? 200 : 401, decision: actor ? 'Credential predicate matched a fictional identity' : 'No credential match', queryStructure, types };
}
