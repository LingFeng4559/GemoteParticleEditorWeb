import test from 'node:test';
import assert from 'node:assert/strict';
import {
    evaluateLayerParticles,
    evaluateLayerTransform,
    evaluateLayerVisibility,
    evaluateTrack,
    mapLayerTick,
    normalizeModifiers,
    normalizeTiming,
    normalizeTracks,
    normalizeTransform,
    transformPoint
} from '../js/animation/AnimationModel.js';

const close = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);

test('null animation fields normalize to safe defaults', () => {
    assert.deepEqual(normalizeTransform(null), {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        pivot: { x: 0, y: 0, z: 0 }
    });
    assert.equal(normalizeTiming(null).duration, 80);
    assert.deepEqual(normalizeTracks([null]), [{
        id: 'track-0', property: 'position.x', enabled: true, keyframes: []
    }]);
    assert.equal(normalizeModifiers([null])[0].enabled, true);
});

test('pivot rotation preserves pivot and rotates around it', () => {
    const point = transformPoint({ x: 2, y: 0, z: 0 }, {
        pivot: { x: 1, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 90 }
    });
    close(point.x, 1);
    close(point.y, 1);
    close(point.z, 0);
});

test('opposite 360 degree spins overlap at half time and retain direction', () => {
    const makeLayer = (id, to) => ({
        id,
        particles: [{ x: 1, y: 0, z: 0 }],
        modifiers: [{ type: 'spin', axis: 'Y', from: 0, to, startTick: 0, duration: 80 }]
    });
    const a = makeLayer('a', -360);
    const b = makeLayer('b', 360);
    const layers = [a, b];
    const pa = evaluateLayerParticles(a, layers, 40)[0];
    const pb = evaluateLayerParticles(b, layers, 40)[0];
    close(pa.x, -1);
    close(pb.x, -1);
    close(pa.z, pb.z);
    assert.equal(evaluateLayerTransform(a, 20).rotation.y, -90);
    assert.equal(evaluateLayerTransform(b, 20).rotation.y, 90);
});

test('child transform is evaluated before parent transform', () => {
    const parent = { id: 'parent', transform: { position: { x: 5, y: 0, z: 0 } } };
    const child = { id: 'child', parentId: 'parent', particles: [{ x: 1, y: 0, z: 0 }], transform: { rotation: { x: 0, y: 0, z: 90 } } };
    const point = evaluateLayerParticles(child, [parent, child], 0)[0];
    close(point.x, 5);
    close(point.y, 1);
});

test('keyframe tracks interpolate without normalizing multi-turn rotations', () => {
    const track = { property: 'rotation.y', keyframes: [{ tick: 0, value: 0 }, { tick: 80, value: 720 }] };
    assert.equal(evaluateTrack(track, 20), 180);
    assert.equal(evaluateLayerTransform({ tracks: [track], timing: { duration: 80, loopMode: 'once' } }, 60).rotation.y, 540);
});

test('once, repeat and ping-pong map ticks deterministically', () => {
    assert.equal(mapLayerTick(120, { duration: 80, loopMode: 'once' }), 80);
    assert.equal(mapLayerTick(100, { duration: 80, loop: 2, loopMode: 'repeat' }), 20);
    assert.equal(mapLayerTick(100, { duration: 80, loop: 2, loopMode: 'ping-pong' }), 60);
});

test('visibility step tracks and orbit modifiers are evaluated', () => {
    const layer = {
        visible: true,
        timing: { duration: 80, loopMode: 'once' },
        tracks: [{ property: 'visible', keyframes: [{ tick: 0, value: true, interpolation: 'step' }, { tick: 20, value: false }] }],
        modifiers: [{ type: 'orbit', axis: 'Y', radius: 2, from: 0, to: 360, duration: 80 }]
    };
    assert.equal(evaluateLayerVisibility(layer, 30), false);
    const atQuarter = evaluateLayerTransform(layer, 20);
    close(atQuarter.position.x, 0);
    close(atQuarter.position.z, 2);
});

test('wave and seeded noise modifiers compose deterministically', () => {
    const layer = { timing: { duration: 80, loopMode: 'once' }, modifiers: [
        { type: 'wave', axis: 'Y', amplitude: 2, cycles: 1, duration: 80 },
        { type: 'noise', amplitude: { x: 0.1, y: 0, z: 0 }, frequency: 1, seed: 42 }
    ] };
    const first = evaluateLayerTransform(layer, 20);
    const second = evaluateLayerTransform(layer, 20);
    close(first.position.y, 2);
    close(first.position.x, second.position.x);
});
