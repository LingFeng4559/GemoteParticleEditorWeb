import test from 'node:test';
import assert from 'node:assert/strict';
import { applySpinDirection, buildOrbitModifier, buildSpinModifier, buildTransformFromValues, calculateParticleCenter, removeKeyframesAtTick, removeModifierByType, removeTimelineItem, replaceModifierByType, spinDirection, upsertTransformKeyframes } from '../js/animation/TimelineControlModel.js';

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

test('spin direction is explicit and preserves the configured turn count', () => {
    assert.equal(spinDirection(30, -690), 'left');
    assert.equal(spinDirection(30, 750), 'right');
    assert.equal(applySpinDirection(30, 750, 'left'), -690);
    assert.equal(applySpinDirection(30, -690, 'right'), 750);
});

test('removing spin leaves every other modifier intact', () => {
    const modifiers = removeModifierByType([
        { type: 'wave', id: 'wave' }, { type: 'spin', id: 'spin' }, { type: 'orbit', id: 'orbit' }
    ], 'spin');
    assert.deepEqual(modifiers.map(item => item.id), ['wave', 'orbit']);
});

test('a timeline row can be removed by id without deleting sibling rows', () => {
    const rows = removeTimelineItem([
        { type: 'wave', id: 'wave-1' }, { type: 'wave', id: 'wave-2' }, { type: 'spin', id: 'spin-1' }
    ], 'wave-1');
    assert.deepEqual(rows.map(item => item.id), ['wave-2', 'spin-1']);
});

test('particle center can be used as a deterministic pivot', () => {
    assert.deepEqual(calculateParticleCenter([{ x: -2, y: 1, z: 4 }, { x: 2, y: 3, z: 0 }]), { x: 0, y: 2, z: 2 });
    assert.deepEqual(calculateParticleCenter([]), { x: 0, y: 0, z: 0 });
});

test('transform keyframes are inserted, replaced and removed at a tick', () => {
    let sequence = 0;
    const ids = () => `id-${sequence++}`;
    let tracks = upsertTransformKeyframes([], { rotation: { x: 0, y: 90, z: 0 } }, 20, ids);
    assert.equal(tracks.length, 9);
    assert.equal(tracks.find(track => track.property === 'rotation.y').keyframes[0].value, 90);
    tracks = upsertTransformKeyframes(tracks, { rotation: { x: 0, y: -360, z: 0 } }, 20, ids);
    assert.equal(tracks.find(track => track.property === 'rotation.y').keyframes.length, 1);
    assert.equal(tracks.find(track => track.property === 'rotation.y').keyframes[0].value, -360);
    assert.ok(removeKeyframesAtTick(tracks, 20).every(track => track.keyframes.length === 0));
});

test('orbit controls preserve direction, radius and path facing', () => {
    const orbit = buildOrbitModifier(null, { enabled: true, axis: 'z', radius: '2.5', to: '-720', facePath: true }, () => 'orbit-1');
    assert.equal(orbit.axis, 'Z'); assert.equal(orbit.radius, 2.5); assert.equal(orbit.to, -720); assert.equal(orbit.facePath, true);
});
