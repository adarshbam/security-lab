import type { CodeSnippetItem } from '../shared/contracts/lab.js';

export function sourceRegion(source: string, name: string, title: string): CodeSnippetItem {
  const start = '// #region ' + name;
  const end = '// #endregion ' + name;
  if (!source.includes(start) || !source.includes(end)) throw new Error('Missing executable source region: ' + name);
  return { title, language: 'typescript', code: source.split(start)[1].split(end)[0].trim() };
}
