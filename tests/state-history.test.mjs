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
