import { normalizeTransform } from './AnimationModel.js';
import { buildSpinModifier, buildTransformFromValues, replaceModifierByType } from './TimelineControlModel.js';

class TimelinePanel {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.lastFrame = 0;
        this.commitTimers = new Map();
        this.build();
        this.stateManager.subscribe(state => this.update(state));
        requestAnimationFrame(time => this.animate(time));
    }

    build() {
        this.root = document.createElement('section');
        this.root.className = 'timeline-panel';
        this.root.innerHTML = `
            <div class="timeline-head"><strong>時間軸 / 圖層動畫</strong><span data-role="selection">請選取圖層</span></div>
            <div class="timeline-row">
                <button type="button" data-action="play">▶</button><button type="button" data-action="stop">■</button>
                <input data-role="scrubber" type="range" min="0" max="80" value="0" step="1">
                <input data-role="tick" type="number" min="0" value="0"><span>tick</span>
                <label>總長 <input data-role="duration" type="number" min="1" value="80"></label>
            </div>
            <div class="timeline-editor" data-role="editor">
                <fieldset><legend>Transform</legend>
                    <label>位置 X <input data-transform="position.x" type="number" step="0.1"></label>
                    <label>Y <input data-transform="position.y" type="number" step="0.1"></label>
                    <label>Z <input data-transform="position.z" type="number" step="0.1"></label>
                    <label>Pivot X <input data-transform="pivot.x" type="number" step="0.1"></label>
                    <label>Y <input data-transform="pivot.y" type="number" step="0.1"></label>
                    <label>Z <input data-transform="pivot.z" type="number" step="0.1"></label>
                </fieldset>
                <fieldset><legend>Spin 旋轉修改器</legend>
                    <label><input data-spin="enabled" type="checkbox"> 啟用</label>
                    <label>軸 <select data-spin="axis"><option>X</option><option selected>Y</option><option>Z</option></select></label>
                    <label>起始° <input data-spin="from" type="number" value="0"></label>
                    <label>結束° <input data-spin="to" type="number" value="360"></label>
                    <label>開始 tick <input data-spin="startTick" type="number" min="0" value="0"></label>
                    <label>長度 <input data-spin="duration" type="number" min="1" value="80"></label>
                    <label>緩動 <select data-spin="easing"><option value="linear">線性</option><option value="ease-in-out">慢入慢出</option><option value="ease-in">慢入</option><option value="ease-out">慢出</option></select></label>
                </fieldset>
            </div>`;
        const style = document.createElement('style');
        style.textContent = `.timeline-panel{position:fixed;left:12px;right:340px;bottom:12px;z-index:40;padding:10px 12px;border:1px solid #475569;border-radius:10px;background:rgba(15,23,42,.94);color:#e2e8f0;font:12px system-ui;box-shadow:0 8px 30px #0008}.timeline-head,.timeline-row{display:flex;align-items:center;gap:8px}.timeline-head{justify-content:space-between;margin-bottom:7px}.timeline-row [data-role=scrubber]{flex:1}.timeline-panel input[type=number]{width:62px;background:#0f172a;color:#fff;border:1px solid #475569;border-radius:4px;padding:3px}.timeline-panel button,.timeline-panel select{background:#1e293b;color:#fff;border:1px solid #64748b;border-radius:4px;padding:3px 7px}.timeline-editor{display:flex;gap:8px;margin-top:8px}.timeline-editor fieldset{display:flex;align-items:center;gap:7px;border:1px solid #334155;border-radius:6px}.timeline-editor label{white-space:nowrap}@media(max-width:900px){.timeline-panel{right:12px}.timeline-editor{overflow-x:auto}}`;
        document.head.appendChild(style);
        document.body.appendChild(this.root);
        this.root.querySelector('[data-action="play"]').addEventListener('click', () => this.stateManager.setTimelinePlaying(!this.stateManager.timelinePlaying));
        this.root.querySelector('[data-action="stop"]').addEventListener('click', () => { this.stateManager.setTimelinePlaying(false); this.stateManager.setTimelineTick(0); });
        this.root.querySelector('[data-role="scrubber"]').addEventListener('input', event => this.stateManager.setTimelineTick(event.target.value));
        this.root.querySelector('[data-role="tick"]').addEventListener('input', event => this.stateManager.setTimelineTick(event.target.value));
        this.root.querySelector('[data-role="duration"]').addEventListener('change', event => this.stateManager.setTimelineDuration(event.target.value));
        this.root.querySelectorAll('[data-transform]').forEach(input => {
            input.addEventListener('input', () => this.scheduleCommit('transform'));
            input.addEventListener('change', () => this.commitTransform());
        });
        this.root.querySelectorAll('[data-spin]').forEach(input => {
            input.addEventListener('input', () => this.scheduleCommit('spin'));
            input.addEventListener('change', () => this.commitSpin());
        });
    }

    scheduleCommit(kind) {
        clearTimeout(this.commitTimers.get(kind));
        this.commitTimers.set(kind, setTimeout(() => {
            this.commitTimers.delete(kind);
            kind === 'spin' ? this.commitSpin() : this.commitTransform();
        }, 120));
    }

    selectedLayer() {
        return this.stateManager.drawingGroups.find(layer => layer.id === this.stateManager.selectedGroup?.id);
    }

    commitTransform() {
        const layer = this.selectedLayer();
        if (!layer) return;
        const values = {};
        this.root.querySelectorAll('[data-transform]').forEach(input => {
            values[input.dataset.transform] = input.value;
        });
        const transform = buildTransformFromValues(layer.transform, values);
        this.stateManager.updateLayerAnimation(layer.id, { transform });
    }

    commitSpin() {
        const layer = this.selectedLayer();
        if (!layer) return;
        const read = key => this.root.querySelector(`[data-spin="${key}"]`);
        const current = layer.modifiers?.find(item => item.type === 'spin');
        const modifier = buildSpinModifier(current, {
            enabled: read('enabled').checked, axis: read('axis').value,
            from: read('from').value, to: read('to').value,
            startTick: read('startTick').value, duration: read('duration').value,
            easing: read('easing').value
        });
        const modifiers = replaceModifierByType(layer.modifiers, modifier);
        this.stateManager.updateLayerAnimation(layer.id, { modifiers });
    }

    update(state) {
        const layer = state.drawingGroups.find(item => item.id === state.selectedGroup?.id);
        this.root.querySelector('[data-role="selection"]').textContent = layer ? `編輯：${layer.name}` : '請選取圖層';
        this.root.querySelector('[data-role="editor"]').style.opacity = layer ? '1' : '.45';
        this.root.querySelector('[data-role="scrubber"]').max = state.timelineDuration;
        this.root.querySelector('[data-role="scrubber"]').value = state.timelineTick;
        this.root.querySelector('[data-role="tick"]').max = state.timelineDuration;
        this.root.querySelector('[data-role="tick"]').value = Math.round(state.timelineTick * 10) / 10;
        this.root.querySelector('[data-role="duration"]').value = state.timelineDuration;
        this.root.querySelector('[data-action="play"]').textContent = state.timelinePlaying ? '❚❚' : '▶';
        if (!layer) return;
        const transform = normalizeTransform(layer.transform);
        this.root.querySelectorAll('[data-transform]').forEach(input => {
            if (document.activeElement === input || this.commitTimers.has('transform')) return;
            const [group, key] = input.dataset.transform.split('.'); input.value = transform[group][key];
        });
        const spin = layer.modifiers?.find(item => item.type === 'spin');
        const set = (key, value) => {
            const input = this.root.querySelector(`[data-spin="${key}"]`);
            if (document.activeElement === input || this.commitTimers.has('spin')) return;
            if (input.type === 'checkbox') input.checked = !!value; else input.value = value;
        };
        set('enabled', spin?.enabled); set('axis', spin?.axis || 'Y'); set('from', spin?.from ?? 0); set('to', spin?.to ?? 360);
        set('startTick', spin?.startTick ?? 0); set('duration', spin?.duration ?? state.timelineDuration); set('easing', spin?.easing || 'linear');
    }

    animate(time) {
        if (this.stateManager.timelinePlaying) {
            if (!this.lastFrame) this.lastFrame = time;
            const deltaTicks = (time - this.lastFrame) / 50;
            if (deltaTicks >= 0.2) {
                const next = this.stateManager.timelineTick + deltaTicks;
                this.stateManager.setTimelineTick(next >= this.stateManager.timelineDuration ? 0 : next);
                this.lastFrame = time;
            }
        } else this.lastFrame = time;
        requestAnimationFrame(next => this.animate(next));
    }
}

export default TimelinePanel;
