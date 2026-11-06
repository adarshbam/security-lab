import type { LabManifest } from '../../shared/contracts/lab.js';

export const accessManifest: LabManifest = {
  id: 'broken-access-control',
  title: 'Broken Access Control',
  description: 'Alex, an ordinary team member, tests whether direct requests can read or delete Sam’s private files and folders by changing an ID.',
  objectives: [
    'Verify object ownership on every file read.',
    'Require ownership before deleting a file.',
    'Require ownership before deleting a folder and its contents.',
  ],
  experiments: [
    { id: 'access-files', title: '1. Read a colleague’s file', summary: 'Change a file ID and compare ownership checks.' },
    { id: 'access-delete-file', title: '2. Delete a colleague’s file', summary: 'Compare direct DELETE requests for owned and unowned files.' },
    { id: 'access-delete-folder', title: '3. Delete a colleague’s folder', summary: 'Test a folder delete that also removes its contents.' },
  ],
  references: [
    { title: 'OWASP Authorization Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html' },
    { title: 'OWASP IDOR Prevention', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html' },
  ],
};
