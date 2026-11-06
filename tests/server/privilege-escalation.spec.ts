import assert from 'node:assert/strict';
import test from 'node:test';
import { AccessWorld, allowedProfileFields } from '../../src/labs/privilege-escalation/server/state.js';
test('protected updates allow only a valid display name', () => {
  const world = new AccessWorld('protected');
  const alex = world.user('alex')!;
  assert.equal(allowedProfileFields({ displayName: 'A. Rivera' }), true);
  assert.equal(world.updateProfile(alex, { displayName: 'A. Rivera' })?.displayName, 'A. Rivera');
  for (const key of ['role', 'id', 'ownerId']) {
    assert.equal(world.updateProfile(alex, { displayName: 'New', [key]: 'admin' }), null);
  }
  assert.equal(alex.role, 'member');
});
test('current role is persisted, deletion revokes sessions, reset isolates worlds', () => {
  const vulnerable = new AccessWorld('vulnerable');
  const protectedWorld = new AccessWorld('protected');
  const alexToken = vulnerable.login('alex')!;
  const samToken = vulnerable.login('sam')!;
  assert.equal(vulnerable.actor(alexToken)?.role, 'member');
  assert.equal(vulnerable.deleteUser(vulnerable.actor(alexToken)!, 'sam'), false);
  vulnerable.updateProfile(vulnerable.actor(alexToken)!, { role: 'admin' });
  assert.equal(vulnerable.actor(alexToken)?.role, 'admin');
  assert.equal(vulnerable.deleteUser(vulnerable.actor(alexToken)!, 'alex'), false);
  vulnerable.updateProfile(vulnerable.actor(alexToken)!, { id: 'renamed-in-payload' });
  assert.equal(vulnerable.deleteUser(vulnerable.actor(alexToken)!, 'alex'), false);
  assert.equal(vulnerable.deleteUser(vulnerable.actor(alexToken)!, 'sam'), true);
  assert.equal(vulnerable.actor(samToken), undefined);
  assert.equal(protectedWorld.user('sam')?.id, 'sam');
  vulnerable.reset();
  assert.equal(vulnerable.actor(alexToken), undefined);
  assert.equal(vulnerable.user('sam')?.id, 'sam');
});

