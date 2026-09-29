import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

function storage() {
 const values = new Map();
 return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), clear: () => values.clear() };
}
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.window = new EventTarget();
const source = await readFile(new URL('../src/services/organizationService.js', import.meta.url), 'utf8');
const { organizationService: service } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('unknown and corrupt workspace selections never resolve to a different organization', () => {
 service.setAccount('validation');
 assert.equal(service.getOrganization('missing'), null);
 assert.equal(service.setActiveWorkspace({ id: 'missing', type: 'organization' }).type, 'personal');
 sessionStorage.setItem('vaultchain_active_workspace:validation', '{broken');
 assert.equal(service.getActiveWorkspace().type, 'personal');
 localStorage.setItem('vaultchain_organizations:validation', 'null');
 assert.ok(Array.isArray(service.getOrganizations()));
});

test('organization changes and selection are scoped to the signed-in account', () => {
 service.setAccount('alice');
 const org = service.createOrganization({ name: 'Alice Studio' });
 service.setActiveWorkspace({ id: org.id, type: 'organization' });
 assert.equal(service.getActiveWorkspace().name, 'Alice Studio');
 service.setAccount('bob');
 assert.equal(service.getOrganization(org.id), null);
 assert.equal(service.getActiveWorkspace().type, 'personal');
 service.setAccount('alice');
 assert.equal(service.getActiveWorkspace().id, org.id);
});

test('workspace selection is tab-local and refreshed from the organization record', () => {
 service.setAccount('tabs');
 const org = service.createOrganization({ name: 'Original' });
 service.setActiveWorkspace({ id: org.id, type: 'organization', name: 'Forged name' });
 assert.equal(service.getActiveWorkspace().name, 'Original');
 assert.equal(localStorage.getItem('vaultchain_active_workspace:tabs'), null);
 sessionStorage.clear();
 assert.equal(service.getActiveWorkspace().type, 'personal');
});

test('creation validates inputs and notifies all workspace consumers', () => {
 service.setAccount('creation');
 let updates = 0;
 const listener = () => updates++;
 window.addEventListener('vaultchain:organizations_changed', listener);
 assert.throws(() => service.createOrganization({ name: '  ' }));
 assert.throws(() => service.createOrganization({ name: 'Team', splitPercent: 120 }));
 const org = service.createOrganization({ name: ' New Team ' });
 assert.equal(org.name, 'New Team');
 assert.equal(org.verified, false);
 assert.equal(updates, 1);
 window.removeEventListener('vaultchain:organizations_changed', listener);
});
