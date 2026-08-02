import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import StateManager from '../js/StateManager.js';

test('new and blank projects default to GemoteParticle.yml', async () => {
    const state = new StateManager();
    assert.equal(state.getState().skillId, 'GemoteParticle');
    state.setSkillId('CustomEffect');
    state.loadProject({ name: 'Blank' });
    assert.equal(state.getState().skillId, 'GemoteParticle');

    const generator = await readFile(new URL('../js/CodeGenerator.js', import.meta.url), 'utf8');
    assert.match(generator, /\|\| 'GemoteParticle'/);
    assert.match(generator, /download\(`\$\{skillId\}\.yml`/);
});

test('legacy default skill IDs migrate while custom IDs remain unchanged', () => {
    for (const legacyId of ['MyDrawingSkill', 'MyDrawingEmote', 'MyGemoteEmote']) {
        const state = new StateManager();
        state.loadProject({ settings: { skillId: legacyId } });
        assert.equal(state.getState().skillId, 'GemoteParticle');
    }

    const custom = new StateManager();
    custom.loadProject({ settings: { skillId: 'MyCustomSkill' } });
    assert.equal(custom.getState().skillId, 'MyCustomSkill');
});
