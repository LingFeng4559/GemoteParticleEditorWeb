import test from 'node:test';
import assert from 'node:assert/strict';
import { bakeParticleEvents } from '../js/animation/AnimationBaker.js';

test('10K animated particles remain bounded by the server-safe export budget', { timeout: 5000 }, () => {
    const particles = Array.from({ length: 10000 }, (_, index) => ({ x: index / 100, y: 0, z: 0, particleType: 'flame' }));
    const layer = { id: 'large', visible: true, exportEnabled: true, particles, modifiers: [{ type: 'spin', enabled: true, axis: 'Y', to: 360, duration: 80 }] };
    const started = performance.now();
    const result = bakeParticleEvents({ drawingGroups: [layer], particlePoints: [], timelineDuration: 80 }, { maxCommands: 12000 });
    assert.ok(result.estimatedCommands <= 20000);
    assert.equal(result.limited, true);
    assert.ok(performance.now() - started < 4000);
});
