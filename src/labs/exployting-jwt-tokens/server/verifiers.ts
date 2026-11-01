import jwt from 'jsonwebtoken';
// Intentional historical dependencies; only this local module imports them.
import jwt2015 from 'jsonwebtoken-2015';
import jwt2022 from 'jsonwebtoken-2022';
import { jwtState, ISSUER, AUDIENCE } from './state.js';

export const scenarios = ['decode', 'confusion', 'none'] as const;
export type Scenario = typeof scenarios[number];
export function verifyExperiment(token: string, scenario: Scenario, variant: 'vulnerable' | 'protected') {
  if (variant === 'protected') return jwtState.verify(token, scenario === 'confusion' ? 'RS256' : 'HS256');
  let payload: unknown;
  // #region decode-misuse
  if (scenario === 'decode') {
    // Deliberately unsafe even in 9.0.3: decode never authenticates a signature.
    payload = jwt.decode(token);
  }
  // #endregion decode-misuse
  // #region historical-confusion
  else if (scenario === 'confusion') {
    // Actual jsonwebtoken 4.0.0 verification, NOT a hand-written simulation.
    // It trusts the supplied alg and accepts public PEM text as an HMAC secret.
    payload = jwt2015.verify(token, jwtState.publicKey, { issuer: ISSUER, audience: AUDIENCE });
  }
  // #endregion historical-confusion
  // #region historical-none
  else {
    // Exact CVE-2022-23540 preconditions: unsigned token, falsy key, no algorithms.
    // Models a missing verification-key configuration. Signed tokens fail here too.
    payload = jwt2022.verify(token, null);
  }
  // #endregion historical-none
  return jwtState.validateClaims(payload);
}
export function implementation(scenario: Scenario, variant: string) {
  if (variant === 'protected') return { library: 'jsonwebtoken 9.0.3', rule: 'Signature + fixed algorithm + issuer + audience + claims' };
  return scenario === 'decode' ? { library: 'jsonwebtoken 9.0.3', rule: 'UNSAFE: decode only; no signature verification' }
    : scenario === 'confusion' ? { library: 'jsonwebtoken 4.0.0', rule: 'UNSAFE: no algorithm restriction' }
      : { library: 'jsonwebtoken 8.5.1', rule: 'UNSAFE: null verification key and no algorithm restriction' };
}
