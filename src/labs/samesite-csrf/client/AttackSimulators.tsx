import { ActionExplanation } from '../../../client/components/ActionExplanation.js';

export function AttackSimulators({ activeExperimentId }: { activeExperimentId: string }) {
  return <section className="panel space-y-4">
    <h3 className="text-lg font-semibold">Open the request source</h3>
    <ActionExplanation title="Before opening a request source">
      <p>These links navigate to local source pages; they do not run an attack or copy credentials. The attacker has a different site and origin. The sibling shares the app’s site but has a different origin, so SameSite and exact-Origin checks can give different outcomes.</p>
      <p>On either page you choose a form POST, top-level GET, credentialed fetch or iframe probe. The browser decides cookie inclusion for that request context. Forms supply a dummy email without a CSRF token; the fetch uses credentials: include but cannot override SameSite rules. A response-read error from CORS does not prove the server blocked the operation. Inspect Network in the source/result tab, return here, and compare the server inspector with the actual preferences.</p>
    </ActionExplanation>
    <div className="flex flex-wrap gap-3">
      <a className="action" href={'https://attacker.csrf-lab.test:8443/?experimentId=' + activeExperimentId}
        target="_blank" rel="noopener">Open Cross-Site Attacker Console</a>
      <a className="action secondary" href={'https://sibling.security-lab.test:8443/?experimentId=' + activeExperimentId}
        target="_blank" rel="noopener">Open Same-Site Sibling Console</a>
    </div>
    <p className="text-sm text-slate-400">Attacker: csrf-lab.test · Sibling and app: security-lab.test</p>
  </section>;
}
