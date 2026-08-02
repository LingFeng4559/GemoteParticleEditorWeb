import test from 'node:test';
import assert from 'node:assert/strict';
import en from '../js/lang/en.js';
import zhTw from '../js/lang/zh_tw.js';
import zhCn from '../js/lang/zh_cn.js';

const editorKeys = [
    'workspace_draw', 'workspace_animate', 'workspace_preview', 'workspace_export',
    'workspace_tools', 'workspace_layers', 'workspace_assets', 'workspace_frame_status',
    'workspace_quick_start_title', 'workspace_export_yml', 'timeline_title',
    'timeline_frame_interval', 'timeline_frame_count', 'timeline_spin', 'timeline_orbit',
    'timeline_direction', 'timeline_left', 'timeline_right', 'timeline_delete_spin'
];

test('professional workspace and timeline have English and Chinese translations', () => {
    for (const key of editorKeys) {
        assert.equal(typeof en[key], 'string', `English is missing ${key}`);
        assert.equal(typeof zhTw[key], 'string', `Traditional Chinese is missing ${key}`);
        assert.equal(typeof zhCn[key], 'string', `Simplified Chinese is missing ${key}`);
        assert.notEqual(en[key], key);
    }
});
