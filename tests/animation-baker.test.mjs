import test from 'node:test';
import assert from 'node:assert/strict';
import { bakeParticleEvents } from '../js/animation/AnimationBaker.js';

test('baker emits opposite spin frames and caps large exports', () => {
    const layer = (id, to) => ({ id, particles: [{ x: 1, y: 0, z: 0, particleType: 'flame' }], visible: true, exportEnabled: true, modifiers: [{ type: 'spin', enabled: true, axis: 'Y', from: 0, to, duration: 80 }] });
    const state = { particlePoints: [], drawingGroups: [layer('a', -360), layer('b', 360)], timelineDuration: 80 };
    const baked = bakeParticleEvents(state, { maxCommands: 20 });
    assert.equal(baked.limited, true);
    assert.ok(baked.events.length <= 24);
    const atEnd = baked.events.filter(event => event.tick === 80);
    assert.equal(atEnd.length, 2);
    assert.ok(Math.abs(atEnd[0].point.x - 1) < 1e-9);
    assert.ok(Math.abs(atEnd[1].point.x - 1) < 1e-9);
});

test('unlimited export bakes every timeline tick without downsampling', () => {
    const layer = { id: 'all', particles: [{ x: 1, y: 0, z: 0, particleType: 'flame' }], visible: true, exportEnabled: true, modifiers: [{ type: 'spin', enabled: true, axis: 'Y', from: 0, to: 360, duration: 4 }] };
    const baked = bakeParticleEvents({ particlePoints: [], drawingGroups: [layer], timelineDuration: 4 }, { maxCommands: Infinity });
    assert.equal(baked.bakeStep, 1);
    assert.equal(baked.limited, false);
    assert.deepEqual(baked.events.map(event => event.tick), [0, 1, 2, 3, 4]);
});

test('global frame interval and frame count determine every exported image tick', () => {
    const layer = { id: 'timed', particles: [{ x: 1, y: 0, z: 0, particleType: 'flame' }], visible: true, exportEnabled: true, modifiers: [{ type: 'spin', enabled: true, axis: 'Y', from: 0, to: 360, duration: 20 }] };
    const baked = bakeParticleEvents({ particlePoints: [], drawingGroups: [layer], timelineDuration: 20, timelineFrameInterval: 5, timelineFrameCount: 5 }, { maxCommands: Infinity });
    assert.equal(baked.frameInterval, 5);
    assert.equal(baked.frameCount, 5);
    assert.equal(baked.bakeStep, 5);
    assert.deepEqual(baked.events.map(event => event.tick), [0, 5, 10, 15, 20]);
});
