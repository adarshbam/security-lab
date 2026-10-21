export function AttackSimulators({ activeExperimentId }: { activeExperimentId: string }) {
  return <section className="panel space-y-4">
    <h3 className="text-lg font-semibold">Open the request source</h3>
    <p>Open a real source page, run its forms, links, fetch or embedded probe, then return here.
      All request results appear in the inspector. Opening a console alone does not unlock the answer.</p>
    <div className="flex flex-wrap gap-3">
      <a className="action" href={'https://attacker.csrf-lab.test:8443/?experimentId=' + activeExperimentId}
        target="_blank" rel="noopener">Open Cross-Site Attacker Console</a>
      <a className="action secondary" href={'https://sibling.security-lab.test:8443/?experimentId=' + activeExperimentId}
        target="_blank" rel="noopener">Open Same-Site Sibling Console</a>
    </div>
    <p className="text-sm text-slate-400">Attacker: csrf-lab.test · Sibling and app: security-lab.test</p>
  </section>;
}
