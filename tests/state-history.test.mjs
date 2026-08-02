import test from 'node:test';
import assert from 'node:assert/strict';
import StateManager from '../js/StateManager.js';

test('undo and redo restore layer creation and animation edits', () => {
    const state = new StateManager();
    state.addGroup({ id: 'layer', type: 'image', name: 'Layer', particles: [{ id: 'p', x: 1, y: 0, z: 0 }] });
    state.updateLayerAnimation('layer', { modifiers: [{ id: 'spin', type: 'spin', enabled: true, axis: 'Y', to: -360 }] });
    assert.equal(state.drawingGroups[0].modifiers[0].to, -360);
    assert.equal(state.undo(), true);
    assert.equal(state.drawingGroups[0].modifiers.length, 0);
    assert.equal(state.undo(), true);
    assert.equal(state.drawingGroups.length, 0);
    assert.equal(state.redo(), true);
    assert.equal(state.drawingGroups.length, 1);
    assert.equal(state.redo(), true);
    assert.equal(state.drawingGroups[0].modifiers[0].to, -360);
});

test('new edits clear redo history and history is bounded', () => {
    const state = new StateManager();
    for (let index = 0; index < 55; index++) state.addPoint({ id: `p-${index}`, x: index, y: 0, z: 0 });
    assert.equal(state.undoStack.length, 50);
    state.undo();
    state.addPoint({ id: 'replacement', x: 0, y: 0, z: 0 });
    assert.equal(state.redo(), false);
});

test('global frame settings calculate duration and clamp the playhead', () => {
    const state = new StateManager();
    state.setTimelineTick(80);
    state.setTimelineFrameSettings(5, 10);
    assert.equal(state.timelineFrameInterval, 5);
    assert.equal(state.timelineFrameCount, 10);
    assert.equal(state.timelineDuration, 45);
    assert.equal(state.timelineTick, 45);
});

test('changing total frames retimes modifiers and keyframes to change the whole animation speed', () => {
    const state = new StateManager();
    state.addGroup({
        id: 'animated', type: 'image', particles: [],
        modifiers: [{ id: 'spin', type: 'spin', enabled: true, startTick: 0, duration: 80, from: 0, to: 360 }, { id: 'noise', type: 'noise', enabled: true, frequency: 0.5 }],
        tracks: [{ id: 'track', property: 'position.x', enabled: true, keyframes: [{ id: 'a', tick: 0, value: 0 }, { id: 'b', tick: 40, value: 1 }, { id: 'c', tick: 80, value: 2 }] }]
    });
    state.setTimelineFrameSettings(1, 161);
    assert.equal(state.timelineDuration, 160);
    assert.equal(state.drawingGroups[0].modifiers[0].duration, 160);
    assert.equal(state.drawingGroups[0].modifiers[1].frequency, 0.25);
    assert.deepEqual(state.drawingGroups[0].tracks[0].keyframes.map(key => key.tick), [0, 80, 160]);
});

test('changing frame interval preserves poses per frame while extending tick duration', () => {
    const state = new StateManager();
    state.addGroup({ id: 'spin-layer', type: 'image', particles: [], modifiers: [{ id: 'spin', type: 'spin', enabled: true, duration: 80, from: 0, to: 360 }] });
    state.setTimelineFrameSettings(4, 81);
    assert.equal(state.timelineDuration, 320);
    assert.equal(state.drawingGroups[0].modifiers[0].duration, 320);
});

test('loading pre-retiming frame settings expands legacy modifier ranges to the full timeline', () => {
    const state = new StateManager();
    state.loadProject({
        version: '3.0', name: 'legacy-frame-cache', particles: [],
        settings: { timelineDuration: 216, timelineFrameInterval: 2, timelineFrameCount: 109 },
        groups: [{ id: 'legacy', type: 'image', particles: [], modifiers: [
            { id: 'orbit', type: 'orbit', enabled: true, startTick: 0, duration: 80 },
            { id: 'wave', type: 'wave', enabled: true, startTick: 0, duration: 80 },
            { id: 'spin', type: 'spin', enabled: true, startTick: 0, duration: 80 }
        ] }]
    });
    assert.equal(state.timelineDuration, 216);
    assert.deepEqual(state.drawingGroups[0].modifiers.map(modifier => modifier.duration), [216, 216, 216]);
    assert.equal(state.timelineRetimingVersion, 1);
});

test('solo is exclusive, reversible and cleared for newly added layers', () => {
    const state = new StateManager();
    state.addGroup({ id: 'a', type: 'image', particles: [{ id: 'pa', x: 0, y: 0, z: 0 }] });
    state.addGroup({ id: 'b', type: 'image', particles: [{ id: 'pb', x: 1, y: 0, z: 0 }] });
    state.toggleLayerSolo('a');
    assert.deepEqual(state.drawingGroups.map(layer => layer.solo), [true, false]);
    state.toggleLayerSolo('b');
    assert.deepEqual(state.drawingGroups.map(layer => layer.solo), [false, true]);
    state.toggleLayerSolo('b');
    assert.deepEqual(state.drawingGroups.map(layer => layer.solo), [false, false]);
    state.toggleLayerSolo('a');
    state.addGroup({ id: 'c', type: 'image', particles: [{ id: 'pc', x: 2, y: 0, z: 0 }] });
    assert.deepEqual(state.drawingGroups.map(layer => layer.solo), [false, false, false]);
});

test('loading a project clears persisted legacy solo flags', () => {
    const state = new StateManager();
    state.loadProject({ groups: [{ id: 'legacy', type: 'image', solo: true, particles: [] }] });
    assert.equal(state.drawingGroups[0].solo, false);
});
