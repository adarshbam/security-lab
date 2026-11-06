import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';
import { sourceRegion } from '../../../client/source.js';
import { accessManifest } from '../manifest.js';
import routerSource from '../server/router.ts?raw';
import stateSource from '../server/state.ts?raw';

const lessons: Record<string, Omit<ExperimentDefinition, 'id' | 'title' | 'summary'>> = {
  'access-files': {
    startingConditions: ['Alex and Sam each own a fictional file.', 'The vulnerable and protected worlds begin with separate identical data.', 'Alex is an ordinary member in both worlds.'],
    understandMarkdown: '### Change the file ID\nSign in as Alex. Read `file-alex` as a positive control, then request `file-sam`. Repeat in the protected world. Sign in as Sam separately to verify the protected owner can read it.',
    predictionPrompt: 'Can Alex read Sam’s file by changing the ID?',
    predictionOptions: [
      { id: 'no', label: 'Both worlds deny it because Sam’s file is absent from Alex’s list.', isCorrect: false, explanation: 'The list is only a UI view. The read route must check ownership itself.' },
      { id: 'yes', label: 'The vulnerable world returns it; the protected world denies Alex and allows Sam.', isCorrect: true, explanation: 'The vulnerable lookup omits ownership. The protected lookup checks the current actor against the file owner.' },
    ],
    learnMarkdown: '### Horizontal access\nAn object ID is not permission. The protected route returns the same 404 for missing and unowned files and permits the true owner. The vulnerable route trusts only the ID.\n\n### Challenge\nRead Alex’s file as Alex, Sam’s as Sam, and Sam’s as Alex. Compare the server decisions.',
    codeSnippets: [sourceRegion(routerSource, 'file-read', 'Actual file read and owner check')],
  },
  'access-delete-file': {
    startingConditions: ['Both worlds start with Alex’s and Sam’s fictional files.', 'DELETE requires a current session, exact app Origin and CSRF token.', 'Neither world requires an admin role for a member’s own file.'],
    understandMarkdown: '### A destructive direct request\nSign in as Alex. First delete `file-alex` as a legitimate control, then reset and target `file-sam`. The vulnerable world deletes it. The protected world denies Alex; a Sam session can delete Sam’s file. Read the file again to verify state.',
    predictionPrompt: 'Can Alex delete Sam’s file by sending DELETE with its ID?',
    predictionOptions: [
      { id: 'no', label: 'No; only admins can delete files.', isCorrect: false, explanation: 'Members may delete their own files. The missing check is ownership of the specific target.' },
      { id: 'yes', label: 'The vulnerable world deletes it; the protected world requires Sam’s ownership.', isCorrect: true, explanation: 'A CSRF token authenticates the request but does not authorize this file ID.' },
    ],
    learnMarkdown: '### Check every destructive target\nThe vulnerable DELETE checks authentication and CSRF but then deletes by ID without matching the owner. The protected route returns 404 for another member’s file and preserves state. A real owner can delete it.\n\n### Challenge\nTry the same file ID in both worlds, then read it again. Does a 404 alone tell you whether the file exists?',
    codeSnippets: [sourceRegion(routerSource, 'resource-delete', 'Actual file and folder delete routes'), sourceRegion(stateSource, 'resource-delete', 'Actual ownership checks before deletion')],
  },
  'access-delete-folder': {
    startingConditions: ['Each fictional folder contains one file.', 'The vulnerable and protected worlds have independent resource state.', 'Deleting a folder removes its contained file in that world.'],
    understandMarkdown: '### Ownership must hold for folders too\nSign in as Alex and target `folder-sam`. The vulnerable route removes Sam’s folder and its file. In the protected world Alex is denied; Sam can delete their own folder. Read `/folders/folder-sam` and `/files/file-sam` afterward to confirm the state.',
    predictionPrompt: 'Does protecting file DELETE alone prevent deleting another member’s folder and its contents?',
    predictionOptions: [
      { id: 'yes', label: 'Yes; the file owner check also protects every parent folder.', isCorrect: false, explanation: 'A folder is a separate target and needs its own authorization check.' },
      { id: 'no', label: 'No; the folder route must check ownership before cascading to files.', isCorrect: true, explanation: 'The protected route verifies the folder owner before removing either the folder or its contents.' },
    ],
    learnMarkdown: '### Authorize the parent before cascading\nA folder delete can affect more than one object. The protected route checks the folder owner before removing it and contained files. The vulnerable route accepts the ID alone after authentication. Reset restores both worlds.\n\n### Challenge\nCompare Sam’s file and folder after Alex’s vulnerable delete and after Alex’s protected denial. Then use Sam’s protected session as a positive control.',
    codeSnippets: [sourceRegion(routerSource, 'resource-delete', 'Actual folder delete route'), sourceRegion(stateSource, 'resource-delete', 'Actual cascade and owner check')],
  },
};
export const accessExperiments: Record<string, ExperimentDefinition> = Object.fromEntries(accessManifest.experiments.map(meta => [meta.id, { ...meta, ...lessons[meta.id] }]));
for (const experiment of Object.values(accessExperiments)) {
  experiment.defenderReplay = 'The vulnerable and protected worlds have separate copies of the same fictional resources. Sign in as the same member in the protected world, send the same file or folder request, and inspect the status and before/after state. Then use the owner account for a legitimate control. Selecting a world chooses an executable implementation; it does not edit live source.';
}
