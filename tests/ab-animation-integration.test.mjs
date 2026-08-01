import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { migrateProject } from '../js/ProjectSchema.js';
import { normalizeLayers } from '../js/LayerModel.js';
import { evaluateLayerParticles } from '../js/animation/AnimationModel.js';
import { bakeParticleEvents } from '../js/animation/AnimationBaker.js';
import { buildEditorAnnotationLines, buildParticleAnnotation, parseAnnotatedYml } from '../js/yaml/EditorAnnotations.js';

const fixtureUrl = new URL('./fixtures/ab-counter-rotation.gemote3d', import.meta.url);
const close = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);

async function loadFixture() {
    const project = migrateProject(JSON.parse(await readFile(fileURLToPath(fixtureUrl), 'utf8')));
    project.groups = normalizeLayers(project.groups);
    return project;
}

test('A/B fixture survives project JSON save and reload without losing spin direction', async () => {
    const project = await loadFixture();
    const reloaded = migrateProject(JSON.parse(JSON.stringify(project)));
    reloaded.groups = normalizeLayers(reloaded.groups);
    assert.equal(reloaded.groups.find(layer => layer.id === 'ring-a').modifiers[0].to, -360);
    assert.equal(reloaded.groups.find(layer => layer.id === 'ring-b').modifiers[0].to, 360);
    assert.equal(reloaded.groups.find(layer => layer.id === 'ring-a').parentId, 'rings');
});

test('A/B preview positions keep opposite directions and overlap at half time', async () => {
    const project = await loadFixture();
    const a = project.groups.find(layer => layer.id === 'ring-a');
    const b = project.groups.find(layer => layer.id === 'ring-b');
    const a20 = evaluateLayerParticles(a, project.groups, 20)[0];
    const b20 = evaluateLayerParticles(b, project.groups, 20)[0];
    close(a20.x, 0); close(b20.x, 0);
    assert.ok(a20.z > 0);
    assert.ok(b20.z < 0);
    const a40 = evaluateLayerParticles(a, project.groups, 40)[0];
    const b40 = evaluateLayerParticles(b, project.groups, 40)[0];
    close(a40.x, -1); close(b40.x, -1); close(a40.z, b40.z);
});

test('A/B bake and annotated YML round-trip preserve groups and modifiers', async () => {
    const project = await loadFixture();
    const state = { particlePoints: [], drawingGroups: project.groups, timelineDuration: 80 };
    const baked = bakeParticleEvents(state, { maxCommands: 1000 });
    assert.equal(baked.limited, false);
    assert.equal(baked.events.filter(event => event.tick === 40).length, 2);
    const lines = ['loop: 0', 'head: false', ...buildEditorAnnotationLines(state), 'pattern:'];
    for (const event of baked.events) {
        lines.push(`  ${buildParticleAnnotation(event.layerId)}`);
        lines.push(`- "particle:${event.point.particleType} delay:0 repeat:1 amount:1 xoffset:${-event.point.x} yoffset:${event.point.y} zoffset:${event.point.z} extra:1"`);
    }
    const parsed = parseAnnotatedYml(lines.join('\n'));
    assert.equal(parsed.groups.find(layer => layer.id === 'ring-a').modifiers[0].to, -360);
    assert.equal(parsed.groups.find(layer => layer.id === 'ring-b').modifiers[0].to, 360);
    assert.equal(parsed.groups.find(layer => layer.id === 'ring-a').parentId, 'rings');
});
