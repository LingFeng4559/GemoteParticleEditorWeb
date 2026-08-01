import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEditorAnnotationLines, buildParticleAnnotation, parseAnnotatedYml } from '../js/yaml/EditorAnnotations.js';

test('annotation round-trip restores hierarchy, transforms and particles', () => {
    const state = { timelineDuration: 120, drawingGroups: [
        { id: 'folder', type: 'layer-group', layerKind: 'group', name: '雙環', parentId: null, transform: { position: { x: 1, y: 0, z: 0 } } },
        { id: 'a', type: 'image', layerKind: 'content', name: 'A 左旋', parentId: 'folder', modifiers: [{ type: 'spin', axis: 'Y', to: -360 }] }
    ] };
    const text = [
        'loop: 2', 'head: true', ...buildEditorAnnotationLines(state), 'pattern:',
        `  ${buildParticleAnnotation('a')}`,
        '- "particle:redstone delay:0 repeat:1 amount:1 xoffset:-1.25 yoffset:2.00 zoffset:3.00 extra:1 data:255:0:128"'
    ].join('\n');
    const project = parseAnnotatedYml(text);
    assert.equal(project.settings.timelineDuration, 120);
    assert.equal(project.settings.loop, 2);
    assert.equal(project.settings.head, true);
    assert.equal(project.groups[1].parentId, 'folder');
    assert.equal(project.groups[1].modifiers[0].to, -360);
    assert.equal(project.groups[1].particles[0].x, 1.25);
    assert.equal(project.groups[1].particles[0].color, '#ff0080');
});
