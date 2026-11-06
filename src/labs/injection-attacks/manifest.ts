import type { LabManifest } from '../../shared/contracts/lab.js';

export const injectionManifest: LabManifest = {
  id: 'injection-attacks', title: 'Injection Attacks',
  description: 'Investigate three fictional logins: SQL text, document query operators, and JavaScript type coercion. Compare real requests with isolated protected implementations.',
  objectives: ['Separate SQL syntax from bound values.', 'Keep document query operators under server control.', 'Distinguish strict validation from authentication and query safety.'],
  experiments: [
    { id: 'injection-sql', title: 'SQL concatenation and parameters', summary: 'SQLite executes concatenated text and a parameterized statement.' },
    { id: 'injection-nosql', title: 'Object-shaped query operators', summary: 'Mingo evaluates Mongo-style $ne and $eq predicates over fictional documents.' },
    { id: 'injection-coercion', title: 'Coerced credential comparisons', summary: 'Compare JavaScript loose equality with validated string equality.' },
  ],
  references: [
    { title: 'Node SQLite parameter binding', url: 'https://nodejs.org/docs/latest-v24.x/api/sqlite.html' },
    { title: 'Mingo query engine and operator contexts', url: 'https://kofrasa.github.io/mingo/' },
    { title: 'OWASP SQL Injection Prevention', url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html' },
    { title: 'JavaScript equality semantics', url: 'https://tc39.es/ecma262/multipage/abstract-operations.html#sec-islooselyequal' },
  ],
};
