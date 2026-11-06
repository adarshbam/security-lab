export const XSS_ORIGIN = 'https://attacker.csrf-lab.test:8444';
export const SHELL_ORIGIN = 'https://app.security-lab.test:8443';
export const payloads = {
  handler: { label: 'SVG event handler', html: '<svg onload="mark(\'attacker\')"></svg>' },
  script: { label: 'Script element', html: '<script>mark(\'attacker\')</script>' },
  format: { label: 'Legitimate emphasis', html: '<strong>Fictional release notes</strong>' },
} as const;
export type Payload = keyof typeof payloads;
export type Rendering = 'vulnerable' | 'protected' | 'sanitized';
export type Policy = 'absent' | 'unsafe' | 'report' | 'enforce';
export type Vector = 'reflected' | 'stored' | 'dom';
export interface RunView {
  id: string; experimentId: string; vector: Vector; rendering: Rendering; policy: Policy; payload: Payload;
  visits: number; attacker: number; legitimate: number; mutations: number;
  reports: { directive: string; disposition: string }[];
}
