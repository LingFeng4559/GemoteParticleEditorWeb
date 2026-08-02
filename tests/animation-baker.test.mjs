import test from 'node:test';
import assert from 'node:assert/strict';
import { bakeParticleEvents } from '../js/animation/AnimationBaker.js';

test('quality limits reduce particles without changing the configured frame interval', () => {
    const layer = (id, to) => ({ id, particles: [{ x: 1, y: 0, z: 0, particleType: 'flame' }], visible: true, exportEnabled: true, modifiers: [{ type: 'spin', enabled: true, axis: 'Y', from: 0, to, duration: 80 }] });
    const state = { particlePoints: [], drawingGroups: [layer('a', -360), layer('b', 360)], timelineDuration: 80 };
    const baked = bakeParticleEvents(state, { maxCommands: 20 });
    assert.equal(baked.limited, true);
    assert.equal(baked.bakeStep, 1);
    assert.equal(baked.particleStride, 2);
    assert.equal(baked.events.length, 80);
    const atEnd = baked.events.filter(event => event.tick === 79);
    assert.equal(atEnd.length, 1);
});

test('unlimited export bakes every timeline tick without downsampling', () => {
    const layer = { id: 'all', particles: [{ x: 1, y: 0, z: 0, particleType: 'flame' }], visible: true, exportEnabled: true, modifiers: [{ type: 'spin', enabled: true, axis: 'Y', from: 0, to: 360, duration: 4 }] };
    const baked = bakeParticleEvents({ particlePoints: [], drawingGroups: [layer], timelineDuration: 4 }, { maxCommands: Infinity });
    assert.equal(baked.bakeStep, 1);
    assert.equal(baked.limited, false);
    assert.deepEqual(baked.events.map(event => event.tick), [0, 1, 2, 3]);
});

test('global frame interval and frame count determine every exported image tick', () => {
    const layer = { id: 'timed', particles: [{ x: 1, y: 0, z: 0, particleType: 'flame' }], visible: true, exportEnabled: true, modifiers: [{ type: 'spin', enabled: true, axis: 'Y', from: 0, to: 360, duration: 25 }] };
    const baked = bakeParticleEvents({ particlePoints: [], drawingGroups: [layer], timelineDuration: 20, timelineFrameInterval: 5, timelineFrameCount: 5 }, { maxCommands: Infinity });
    assert.equal(baked.frameInterval, 5);
    assert.equal(baked.frameCount, 5);
    assert.equal(baked.bakeStep, 5);
    assert.deepEqual(baked.events.map(event => event.tick), [0, 5, 10, 15, 20]);
});

test('an 8 tick interval stays 8 under a restrictive command budget', () => {
    const particles = Array.from({ length: 100 }, (_, index) => ({ x: index, y: 0, z: 0, particleType: 'flame' }));
    const layer = { id: 'interval-8', particles, visible: true, exportEnabled: true, modifiers: [{ type: 'spin', enabled: true, axis: 'Y', from: 0, to: 360, duration: 96 }] };
    const baked = bakeParticleEvents({ particlePoints: [], drawingGroups: [layer], timelineDuration: 96, timelineFrameInterval: 8, timelineFrameCount: 12 }, { maxCommands: 12 });
    assert.equal(baked.bakeStep, 8);
    assert.deepEqual(baked.events.map(event => event.tick), [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88]);
});

test('a 360 frame rotation exports 0 through 359 degrees without duplicating frame zero', () => {
    const layer = { id: 'exclusive', particles: [{ x: 1, y: 0, z: 0, particleType: 'flame' }], visible: true, exportEnabled: true, modifiers: [{ type: 'spin', enabled: true, axis: 'Y', from: 0, to: 360, duration: 360 }] };
    const baked = bakeParticleEvents({ particlePoints: [], drawingGroups: [layer], timelineDuration: 360, timelineFrameInterval: 1, timelineFrameCount: 360 }, { maxCommands: Infinity });
    assert.equal(baked.events.length, 360);
    assert.equal(baked.events.at(-1).tick, 359);
    assert.ok(Math.abs(baked.events.at(-1).point.z) > 0.01);
});
