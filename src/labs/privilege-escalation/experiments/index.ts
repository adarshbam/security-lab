import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';
import { sourceRegion } from '../../../client/source.js';
import { privilegeManifest } from '../manifest.js';
import stateSource from '../server/state.ts?raw';

const lessons: Record<string, Omit<ExperimentDefinition, 'id' | 'title' | 'summary'>> = {
  'privilege-role': {
    startingConditions: ['Alex is an ordinary team member in both independent worlds.', 'A displayName edit is allowed.', 'Roles are read from server state on every request.'],
    understandMarkdown: '### Send an extra field\nSign in as Alex. Send an ordinary `displayName` update, then include `role: "admin"`. Request `/me` again and ask for `/admin/users`. Repeat in the protected world, then sign in as Taylor for a legitimate admin control.',
    predictionPrompt: 'Can an extra role field in PATCH /me grant Alex lasting admin access?',
    predictionOptions: [
      { id: 'no', label: 'No; the profile form never displays a role control.', isCorrect: false, explanation: 'A caller can send JSON fields the form does not display. The server must decide which fields may change.' },
      { id: 'yes', label: 'The vulnerable world persists admin; the protected world rejects the extra field.', isCorrect: true, explanation: 'Mass assignment changes a stored role. The protected update accepts only displayName.' },
    ],
    learnMarkdown: '### Vertical privilege escalation\nThe vulnerable profile endpoint merges untrusted JSON into the persisted user. A new `/me` request and admin-directory request prove the role has changed and now affects authorization. The protected endpoint explicitly allows only a nonempty `displayName`. It rejects `role`, `id` and ownership fields.\n\n### Challenge\nTry a protected update with `id` or `ownerId`, then verify Alex remains a member. Sign in as Taylor and verify a legitimate protected admin can read the directory.',
    codeSnippets: [sourceRegion(stateSource, 'profile-update', 'Actual profile update and field allowlist')],
  },
  'privilege-delete': {
    startingConditions: ['Deleting a user requires the current server-side admin role.', 'Alex begins as a member; Taylor begins as an admin.', 'Deleting a fictional user revokes that user’s sessions.'],
    understandMarkdown: '### Follow the permission chain\nSend `DELETE /admin/users/sam` as Alex before escalation. Change Alex’s role through the vulnerable profile endpoint, refresh `/me`, and retry. Use the confirmation control to delete each remaining fictional account separately. In the protected world, Alex stays denied and Taylor succeeds.',
    predictionPrompt: 'Why can Alex delete users after the vulnerable role edit?',
    predictionOptions: [
      { id: 'button', label: 'The browser revealed a delete button, so the server allows it.', isCorrect: false, explanation: 'The button does not grant authority. The server checks the stored role.' },
      { id: 'role', label: 'The delete gate trusts a stored role that Alex was allowed to change.', isCorrect: true, explanation: 'The role check is real, but mass assignment corrupted the source of that role.' },
    ],
    learnMarkdown: '### A gate can trust bad state\nThe admin route checks the current role, forbids self-deletion, and revokes deleted accounts’ sessions. The vulnerable earlier update lets a member write the role this gate reads. The protected world keeps that role outside the profile update allowlist. A direct protected DELETE remains denied, regardless of which buttons the frontend shows.\n\n### Challenge\nDelete every other demo account in the vulnerable world, then read the directory again. Try self-deletion. Reset the lab and verify everyone returns.',
    codeSnippets: [sourceRegion(stateSource, 'admin-delete', 'Actual role check, self guard and revocation')],
  },
};
export const privilegeExperiments: Record<string, ExperimentDefinition> = Object.fromEntries(privilegeManifest.experiments.map(meta => [meta.id, { ...meta, ...lessons[meta.id] }]));
for (const experiment of Object.values(privilegeExperiments)) {
  experiment.defenderReplay = 'The protected world starts with a separate copy of the fictional team. Sign in as Alex there and retry the same profile update or admin request. Refresh /me to verify the stored role, then sign in as Taylor to prove a legitimate admin action still works. Selecting a world chooses an executable implementation; it does not edit live source.';
}
