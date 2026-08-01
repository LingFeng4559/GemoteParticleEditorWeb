import assert from 'node:assert/strict';
import { migrateProject, PROJECT_SCHEMA_VERSION } from '../js/ProjectSchema.js';

const legacy = migrateProject({
    name: 'legacy',
    version: '2.1',
    particles: [{ id: 'p1' }],
    groups: [{ id: 'g1' }],
    settings: { particleDensity: 2, planeOffset: { x: 3, z: 4 } },
    customFutureField: { keep: true }
});

assert.equal(legacy.version, PROJECT_SCHEMA_VERSION);
assert.equal(legacy.settings.particleDensity, 2);
assert.deepEqual(legacy.settings.planeOffset, { x: 3, z: 4 });
assert.deepEqual(legacy.settings.mirrorPivot, { x: 0, y: 0, z: 0 });
assert.deepEqual(legacy.customFutureField, { keep: true });

const minimal = migrateProject({});
assert.equal(minimal.name, '未命名專案');
assert.deepEqual(minimal.particles, []);
assert.deepEqual(minimal.groups, []);
assert.equal(minimal.settings.characterMode, 'opaque');

assert.throws(() => migrateProject(null), TypeError);

console.log('project-schema tests passed');
