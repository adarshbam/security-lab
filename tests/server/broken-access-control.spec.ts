import assert from 'node:assert/strict';
import test from 'node:test';
import { AccessWorld, ownsResource } from '../../src/labs/broken-access-control/server/state.js';

test('protected world scopes file and folder access to the owner', () => {
  const world = new AccessWorld('protected');
  const alex = world.user('alex')!;
  assert.equal(ownsResource(alex, world.file('file-alex')!), true);
  assert.equal(ownsResource(alex, world.file('file-sam')!), false);
  assert.equal(ownsResource(alex, world.folder('folder-sam')!), false);
  assert.equal(world.deleteFile(alex, 'file-sam'), false);
  assert.equal(world.deleteFolder(alex, 'folder-sam'), false);
  assert.ok(world.file('file-sam'));
  assert.ok(world.folder('folder-sam'));
  assert.equal(world.deleteFile(alex, 'file-alex'), true);
});

test('vulnerable folder deletion cascades; reset restores resources and revokes sessions', () => {
  const vulnerable = new AccessWorld('vulnerable');
  const protectedWorld = new AccessWorld('protected');
  const token = vulnerable.login('alex')!;
  const alex = vulnerable.actor(token)!;
  assert.equal(vulnerable.deleteFolder(alex, 'folder-sam'), true);
  assert.equal(vulnerable.folder('folder-sam'), undefined);
  assert.equal(vulnerable.file('file-sam'), undefined);
  assert.ok(protectedWorld.file('file-sam'));
  vulnerable.reset();
  assert.equal(vulnerable.actor(token), undefined);
  assert.ok(vulnerable.file('file-sam'));
  assert.ok(vulnerable.folder('folder-sam'));
});
