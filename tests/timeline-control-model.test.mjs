import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSpinModifier, buildTransformFromValues, calculateParticleCenter, replaceModifierByType } from '../js/animation/TimelineControlModel.js';

test('timeline controls preserve negative and multi-turn spin angles', () => {
    const negative = buildSpinModifier(null, { enabled: true, axis: 'y', from: '0', to: '-360', duration: '80' }, () => 'spin-a');
    const multiTurn = buildSpinModifier(negative, { to: '1080' }, () => 'unused');
    assert.equal(negative.axis, 'Y');
    assert.equal(negative.to, -360);
    assert.equal(multiTurn.id, 'spin-a');
    assert.equal(multiTurn.to, 1080);
});

test('transform controls retain unspecified values and accept zero', () => {
    const result = buildTransformFromValues({ position: { x: 5, y: 6, z: 7 }, scale: { x: 2, y: 2, z: 2 } }, {
        'position.x': '0', 'scale.y': '0.5'
    });
    assert.equal(result.position.x, 0);
    assert.equal(result.position.y, 6);
    assert.equal(result.scale.y, 0.5);
});

test('replacing spin leaves other modifier types intact', () => {
    const modifiers = replaceModifierByType([{ type: 'orbit', id: 'orbit' }, { type: 'spin', id: 'old' }], { type: 'spin', id: 'new' });
    assert.deepEqual(modifiers.map(item => item.id), ['orbit', 'new']);
});

test('particle center can be used as a deterministic pivot', () => {
    assert.deepEqual(calculateParticleCenter([{ x: -2, y: 1, z: 4 }, { x: 2, y: 3, z: 0 }]), { x: 0, y: 2, z: 2 });
    assert.deepEqual(calculateParticleCenter([]), { x: 0, y: 0, z: 0 });
});
