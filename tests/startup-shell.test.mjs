import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('workspace localization cannot replace the body and startup always releases its loader', async () => {
    const workspace = await readFile(new URL('../js/WorkspaceShell.js', import.meta.url), 'utf8');
    const main = await readFile(new URL('../main.js', import.meta.url), 'utf8');
    assert.match(workspace, /\.workspace-switcher \[data-workspace="draw"\]/);
    assert.doesNotMatch(workspace, /text\('\[data-workspace="draw"\]'/);
    assert.match(main, /finally\s*\{[\s\S]*classList\.remove\('app-loading'\)/);
});

test('startup loader is animated and contains no language-specific message', async () => {
    const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');
    const loaderBlock = css.match(/body\.app-loading::after\s*\{([\s\S]*?)\}/)?.[1] || '';
    assert.match(loaderBlock, /content:\s*''/);
    assert.match(loaderBlock, /animation:/);
    assert.doesNotMatch(loaderBlock, /[\u3400-\u9fff]/);
});
