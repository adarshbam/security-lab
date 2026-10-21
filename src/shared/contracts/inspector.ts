export interface CookieObservation {
  name: string;
  present: boolean;
  redactedValue: string;
}

export interface AuthResult {
  authenticated: boolean;
  identity?: string;
  reason?: string;
}

export interface ProtectionDecision {
  allowed: boolean;
  decision: 'allowed' | 'rejected';
  reason?: string;
  ruleApplied?: string;
}

export interface ExperimentObservation {
  id: string;
  experimentId: string;
  timestamp: string;
  method: string;
  url: string;
  host: string;
  path: string;
  origin: string | null;
  referer: string | null;
  secFetchSite: string | null;
  secFetchMode: string | null;
  secFetchDest: string | null;
  cookies: CookieObservation[];
  authResult: AuthResult;
  protectionDecision: ProtectionDecision;
  stateBefore: Record<string, any>;
  stateAfter: Record<string, any>;
  status: number;
  clientReportedError?: string;
}
