import test from 'node:test';
import assert from 'node:assert/strict';
import en from '../js/lang/en.js';
import zhTw from '../js/lang/zh_tw.js';
import zhCn from '../js/lang/zh_cn.js';
import { readFile } from 'node:fs/promises';

const editorKeys = [
    'workspace_draw', 'workspace_animate', 'workspace_preview', 'workspace_export',
    'workspace_tools', 'workspace_layers', 'workspace_assets', 'workspace_frame_status',
    'workspace_quick_start_title', 'workspace_export_yml', 'timeline_title',
    'timeline_frame_interval', 'timeline_frame_count', 'timeline_spin', 'timeline_orbit',
    'timeline_direction', 'timeline_left', 'timeline_right', 'timeline_delete_spin',
    'layers_groups', 'add_group', 'rename_hint', 'layer_empty', 'image_particles',
    'load_images', 'load_folder', 'color_mode', 'current_particle_settings', 'source_colors',
    'inspector_new_stroke_title', 'inspector_new_stroke_description', 'inspector_particle_summary',
    'quality_all', 'command_limit', 'export_estimate', 'asset_search_placeholder'
];

test('professional workspace and timeline have English and Chinese translations', () => {
    for (const key of editorKeys) {
        assert.equal(typeof en[key], 'string', `English is missing ${key}`);
        assert.equal(typeof zhTw[key], 'string', `Traditional Chinese is missing ${key}`);
        assert.equal(typeof zhCn[key], 'string', `Simplified Chinese is missing ${key}`);
        assert.notEqual(en[key], key);
    }
});

test('every translation marker in index.html exists in all language dictionaries', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const keys = [...html.matchAll(/data-i18n(?:-placeholder|-title)?="([^"]+)"/g)].map(match => match[1]);
    for (const key of new Set(keys)) {
        for (const [name, dictionary] of Object.entries({ en, zhTw, zhCn })) {
            assert.equal(typeof dictionary[key], 'string', `${name} is missing ${key}`);
        }
    }
});
