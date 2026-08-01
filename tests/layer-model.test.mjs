import assert from 'node:assert/strict';
import {
    getLayerAncestors,
    getLayerDescendantIds,
    isLayerEffectivelyExported,
    isLayerEffectivelyVisible,
    normalizeLayers
} from '../js/LayerModel.js';

const layers = normalizeLayers([
    { id: 'root', type: 'layer-group', name: 'Root' },
    { id: 'a', type: 'image', parentId: 'root', name: 'A' },
    { id: 'nested', type: 'layer-group', parentId: 'root', name: 'Nested', exportEnabled: false },
    { id: 'b', type: 'image', parentId: 'nested', name: 'B' }
]);

assert.deepEqual(getLayerDescendantIds('root', layers), ['a', 'nested', 'b']);
assert.deepEqual(getLayerAncestors('b', layers).map(layer => layer.id), ['nested', 'root']);
assert.equal(isLayerEffectivelyVisible('a', layers), true);
assert.equal(isLayerEffectivelyExported('a', layers), true);
assert.equal(isLayerEffectivelyExported('b', layers), false);

const hiddenParent = layers.map(layer => layer.id === 'root' ? { ...layer, visible: false } : layer);
assert.equal(isLayerEffectivelyVisible('a', hiddenParent), false);

const soloA = layers.map(layer => layer.id === 'a' ? { ...layer, solo: true } : layer);
assert.equal(isLayerEffectivelyVisible('a', soloA), true);
assert.equal(isLayerEffectivelyVisible('b', soloA), false);

const orphan = normalizeLayers([{ id: 'x', parentId: 'missing' }]);
assert.equal(orphan[0].parentId, null);

console.log('layer-model tests passed');
