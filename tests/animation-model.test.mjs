import test from 'node:test';
import assert from 'node:assert/strict';
import {
    evaluateLayerParticles,
    evaluateLayerTransform,
    transformPoint
} from '../js/animation/AnimationModel.js';

const close = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);

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
