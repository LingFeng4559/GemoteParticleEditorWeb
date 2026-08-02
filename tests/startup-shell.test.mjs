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

test('quick start asks for language before choosing a project action', async () => {
    const workspace = await readFile(new URL('../js/WorkspaceShell.js', import.meta.url), 'utf8');
    const languagePosition = workspace.indexOf('id="quick-start-language"');
    const actionsPosition = workspace.indexOf('class="quick-start-actions"');
    assert.ok(languagePosition > 0, 'quick-start language selector is missing');
    assert.ok(actionsPosition > languagePosition, 'language must appear before project actions');
    assert.match(workspace, /quick-start-language[^]*lang\.setLanguage/);
});

test('topbar project name supports inline editing and uses the canonical state field', async () => {
    const workspace = await readFile(new URL('../js/WorkspaceShell.js', import.meta.url), 'utf8');
    assert.match(workspace, /data-role="project-name-editor"/);
    assert.match(workspace, /startProjectNameEdit\(\)/);
    assert.match(workspace, /finishProjectNameEdit\(save\)/);
    assert.match(workspace, /stateManager\.setProjectName\(name\)/);
    assert.match(workspace, /state\.currentProjectName \|\| lang\.get\('unnamed_project'\)/);
});

test('project name display and editor occupy the same fixed layout slot', async () => {
    const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');
    assert.match(css, /\.app-identity > div[^}]*height:\s*36px[^}]*grid-template-rows:\s*16px 20px/);
    assert.match(css, /\.project-name-button\[hidden\][^}]*display:\s*none\s*!important/);
    assert.match(css, /\.project-name-button[^}]*height:\s*20px/);
    assert.match(css, /\.project-name-editor[^}]*height:\s*20px/);
});
