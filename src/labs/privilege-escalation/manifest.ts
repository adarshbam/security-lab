import type { LabManifest } from '../../shared/contracts/lab.js';

export const privilegeManifest: LabManifest = {
  id: 'privilege-escalation', title: 'Privilege Escalation',
  description: 'Alex, an ordinary team member, tests whether an extra profile field can grant admin access and let them delete Sam’s account. Taylor is the legitimate admin control.',
  objectives: ['Distinguish a profile field from a privileged role.', 'Prove a changed role persists across fresh requests.', 'Test admin deletion before and after escalation with legitimate controls.'],
  experiments: [
    { id: 'privilege-role', title: '1. Make yourself admin', summary: 'Submit an extra role field in a profile update.' },
    { id: 'privilege-delete', title: '2. Delete other accounts', summary: 'Test the admin gate before and after role escalation.' },
  ],
  references: [
    { title: 'OWASP Mass Assignment Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html' },
    { title: 'OWASP Authorization Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html' },
  ],
};
