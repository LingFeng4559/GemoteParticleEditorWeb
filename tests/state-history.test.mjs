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
