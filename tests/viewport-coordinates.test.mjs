import test from 'node:test';
import assert from 'node:assert/strict';
import { clientToNdc, projectedToClient } from '../js/ViewportCoordinates.js';

const rect = { left: 320, top: 52, width: 630, height: 642 };

test('canvas center maps to NDC origin even when editor docks offset the canvas', () => {
    assert.deepEqual(clientToNdc(635, 373, rect), { x: 0, y: 0 });
});

test('canvas corners map to normalized device coordinate corners', () => {
    assert.deepEqual(clientToNdc(320, 52, rect), { x: -1, y: 1 });
    assert.deepEqual(clientToNdc(950, 694, rect), { x: 1, y: -1 });
});

test('projection and pointer conversion share the same client coordinate space', () => {
    const client = projectedToClient(.25, -.4, rect);
    const ndc = clientToNdc(client.x, client.y, rect);
    assert.ok(Math.abs(ndc.x - .25) < 1e-12);
    assert.ok(Math.abs(ndc.y + .4) < 1e-12);
});
