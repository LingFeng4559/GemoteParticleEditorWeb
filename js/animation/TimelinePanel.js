import { normalizeTransform } from './AnimationModel.js';
import { applySpinDirection, buildOrbitModifier, buildSpinModifier, buildTransformFromValues, calculateParticleCenter, removeKeyframesAtTick, removeModifierByType, removeTimelineItem, replaceModifierByType, spinDirection, upsertTransformKeyframes } from './TimelineControlModel.js';

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
            <div class="timeline-head">
                <div class="timeline-title"><span class="timeline-title-icon">◆</span><strong>時間軸 / 圖層動畫</strong><span data-role="selection">請選取圖層</span></div>
                <button type="button" class="timeline-collapse" data-action="collapse" aria-expanded="true" title="收合時間軸">⌄</button>
            </div>
            <div class="timeline-row">
                <button type="button" data-action="play">▶</button><button type="button" data-action="stop">■</button>
                <input data-role="scrubber" type="range" min="0" max="80" value="0" step="1">
                <input data-role="tick" type="number" min="0" value="0"><span>tick</span>
                <label>總長 <input data-role="duration" type="number" min="1" value="80"></label>
            </div>
            <div class="timeline-tracks" data-role="tracks" aria-label="關鍵影格軌道"></div>
            <div class="timeline-editor" data-role="editor">
                <fieldset><legend>Transform</legend>
                    <div class="vector-row"><strong>Position</strong><label>X <input data-transform="position.x" type="number" step="0.1"></label><label>Y <input data-transform="position.y" type="number" step="0.1"></label><label>Z <input data-transform="position.z" type="number" step="0.1"></label></div>
                    <div class="vector-row"><strong>Rotation</strong><label>X <input data-transform="rotation.x" type="number" step="1"></label><label>Y <input data-transform="rotation.y" type="number" step="1"></label><label>Z <input data-transform="rotation.z" type="number" step="1"></label></div>
                    <div class="vector-row"><strong>Scale</strong><label>X <input data-transform="scale.x" type="number" step="0.1"></label><label>Y <input data-transform="scale.y" type="number" step="0.1"></label><label>Z <input data-transform="scale.z" type="number" step="0.1"></label></div>
                    <div class="vector-row"><strong>Pivot</strong><label>X <input data-transform="pivot.x" type="number" step="0.1"></label><label>Y <input data-transform="pivot.y" type="number" step="0.1"></label><label>Z <input data-transform="pivot.z" type="number" step="0.1"></label></div>
                    <div class="transform-actions"><button type="button" data-transform-action="center">Pivot 粒子中心</button><button type="button" data-transform-action="copy">複製</button><button type="button" data-transform-action="paste">貼上</button><button type="button" data-transform-action="reset">重設</button></div>
                </fieldset>
                <fieldset><legend>關鍵影格 / Timing</legend>
                    <button type="button" data-key-action="add">＋目前 Transform</button>
                    <button type="button" data-key-action="remove">刪除目前 tick</button>
                    <span data-role="key-count">0 keys</span>
                    <label>開始 <input data-timing="startTick" type="number" min="0" value="0"></label>
                    <label>長度 <input data-timing="duration" type="number" min="1" value="80"></label>
                    <label>循環 <input data-timing="loop" type="number" min="1" value="1"></label>
                    <label>模式 <select data-timing="loopMode"><option value="once">Once</option><option value="repeat">Repeat</option><option value="ping-pong">Ping-pong</option></select></label>
                </fieldset>
                <fieldset><legend>Spin 旋轉修改器</legend>
                    <label><input data-spin="enabled" type="checkbox"> 啟用</label>
                    <label>軸 <select data-spin="axis"><option>X</option><option selected>Y</option><option>Z</option></select></label>
                    <label>方向 <select data-spin="direction"><option value="left">左旋</option><option value="right" selected>右旋</option></select></label>
                    <label>起始° <input data-spin="from" type="number" value="0"></label>
                    <label>結束° <input data-spin="to" type="number" value="360"></label>
                    <label>開始 tick <input data-spin="startTick" type="number" min="0" value="0"></label>
                    <label>長度 <input data-spin="duration" type="number" min="1" value="80"></label>
                    <label>緩動 <select data-spin="easing"><option value="linear">線性</option><option value="ease-in-out">慢入慢出</option><option value="ease-in">慢入</option><option value="ease-out">慢出</option></select></label>
                    <button type="button" data-spin-action="remove" class="danger-action">刪除 Spin 修改器</button>
                </fieldset>
                <fieldset><legend>Orbit 公轉修改器</legend>
                    <label><input data-orbit="enabled" type="checkbox"> 啟用</label>
                    <label>軸 <select data-orbit="axis"><option>X</option><option selected>Y</option><option>Z</option></select></label>
                    <label>半徑 <input data-orbit="radius" type="number" min="0" step="0.1" value="1"></label>
                    <label>起始° <input data-orbit="from" type="number" value="0"></label>
                    <label>結束° <input data-orbit="to" type="number" value="360"></label>
                    <label>開始 <input data-orbit="startTick" type="number" min="0" value="0"></label>
                    <label>長度 <input data-orbit="duration" type="number" min="1" value="80"></label>
                    <label><input data-orbit="facePath" type="checkbox"> 朝向路徑</label>
                </fieldset>
                <fieldset><legend>程序動畫</legend>
                    <button type="button" data-preset="wave">加入上下波動</button>
                    <button type="button" data-preset="noise">加入抖動</button>
                    <button type="button" data-preset="counter-left">左旋 -360°</button>
                    <button type="button" data-preset="counter-right">右旋 +360°</button>
                </fieldset>
            </div>`;
        document.body.appendChild(this.root);
        this.controlsRoot = this.root.querySelector('[data-role="editor"]');
        const animationInspector = document.querySelector('[data-inspector-slot="animation"]');
        if (animationInspector) animationInspector.appendChild(this.controlsRoot);
        const collapseButton = this.root.querySelector('[data-action="collapse"]');
        const syncResponsiveState = () => {
            const mobileExpanded = window.matchMedia('(max-width: 720px)').matches && !this.root.classList.contains('is-collapsed');
            document.body.classList.toggle('timeline-expanded-mobile', mobileExpanded);
        };
        if (window.matchMedia('(max-width: 720px)').matches || document.body.dataset.workspace !== 'animate') {
            this.root.classList.add('is-collapsed');
            collapseButton.textContent = '⌃';
            collapseButton.title = '展開時間軸';
            collapseButton.setAttribute('aria-expanded', 'false');
        }
        collapseButton.addEventListener('click', event => {
            const collapsed = this.root.classList.toggle('is-collapsed');
            event.currentTarget.textContent = collapsed ? '⌃' : '⌄';
            event.currentTarget.title = collapsed ? '展開時間軸' : '收合時間軸';
            event.currentTarget.setAttribute('aria-expanded', String(!collapsed));
            syncResponsiveState();
        });
        window.addEventListener('resize', syncResponsiveState);
        this.root.querySelector('[data-action="play"]').addEventListener('click', () => this.stateManager.setTimelinePlaying(!this.stateManager.timelinePlaying));
        this.root.querySelector('[data-action="stop"]').addEventListener('click', () => { this.stateManager.setTimelinePlaying(false); this.stateManager.setTimelineTick(0); });
        this.root.querySelector('[data-role="scrubber"]').addEventListener('input', event => this.stateManager.setTimelineTick(event.target.value));
        this.root.querySelector('[data-role="tick"]').addEventListener('input', event => this.stateManager.setTimelineTick(event.target.value));
        this.root.querySelector('[data-role="duration"]').addEventListener('change', event => this.stateManager.setTimelineDuration(event.target.value));
        this.controlsRoot.querySelectorAll('[data-transform]').forEach(input => {
            input.addEventListener('input', () => this.scheduleCommit('transform'));
            input.addEventListener('change', () => this.commitTransform());
        });
        this.controlsRoot.querySelectorAll('[data-spin]').forEach(input => {
            input.addEventListener('input', () => this.scheduleCommit('spin'));
            input.addEventListener('change', () => this.commitSpin());
        });
        this.controlsRoot.querySelector('[data-spin-action="remove"]').addEventListener('click', () => this.removeSpin());
        this.controlsRoot.querySelectorAll('[data-transform-action]').forEach(button => button.addEventListener('click', () => this.handleTransformAction(button.dataset.transformAction)));
        this.controlsRoot.querySelectorAll('[data-key-action]').forEach(button => button.addEventListener('click', () => this.handleKeyAction(button.dataset.keyAction)));
        this.controlsRoot.querySelectorAll('[data-timing]').forEach(input => input.addEventListener('change', () => this.commitTiming()));
        this.controlsRoot.querySelectorAll('[data-orbit]').forEach(input => {
            input.addEventListener('input', () => this.scheduleCommit('orbit'));
            input.addEventListener('change', () => this.commitOrbit());
        });
        this.controlsRoot.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => this.addPreset(button.dataset.preset)));
    }

    scheduleCommit(kind) {
        clearTimeout(this.commitTimers.get(kind));
        this.commitTimers.set(kind, setTimeout(() => {
            this.commitTimers.delete(kind);
            if (kind === 'spin') this.commitSpin(); else if (kind === 'orbit') this.commitOrbit(); else this.commitTransform();
        }, 120));
    }

    selectedLayer() {
        return this.stateManager.drawingGroups.find(layer => layer.id === this.stateManager.selectedGroup?.id);
    }

    handleTransformAction(action) {
        const layer = this.selectedLayer();
        if (!layer) return;
        if (action === 'copy') {
            this.transformClipboard = structuredClone(normalizeTransform(layer.transform));
            return;
        }
        if (action === 'paste' && this.transformClipboard) {
            this.stateManager.updateLayerAnimation(layer.id, { transform: structuredClone(this.transformClipboard) });
            return;
        }
        if (action === 'reset') {
            this.stateManager.updateLayerAnimation(layer.id, { transform: normalizeTransform() });
            return;
        }
        if (action === 'center') {
            const transform = normalizeTransform(layer.transform);
            transform.pivot = calculateParticleCenter(layer.particles);
            this.stateManager.updateLayerAnimation(layer.id, { transform });
        }
    }

    handleKeyAction(action) {
        const layer = this.selectedLayer();
        if (!layer) return;
        const tracks = action === 'add'
            ? upsertTransformKeyframes(layer.tracks, layer.transform, this.stateManager.timelineTick)
            : removeKeyframesAtTick(layer.tracks, this.stateManager.timelineTick);
        this.stateManager.updateLayerAnimation(layer.id, { tracks });
    }

    commitTiming() {
        const layer = this.selectedLayer();
        if (!layer) return;
        const read = key => this.controlsRoot.querySelector(`[data-timing="${key}"]`).value;
        this.stateManager.updateLayerAnimation(layer.id, { timing: {
            startTick: Math.max(0, Number(read('startTick')) || 0), duration: Math.max(1, Number(read('duration')) || 1),
            loop: Math.max(1, Math.floor(Number(read('loop')) || 1)), loopMode: read('loopMode')
        } });
    }

    commitOrbit() {
        const layer = this.selectedLayer();
        if (!layer) return;
        const read = key => this.controlsRoot.querySelector(`[data-orbit="${key}"]`);
        const current = layer.modifiers?.find(item => item.type === 'orbit');
        const modifier = buildOrbitModifier(current, {
            enabled: read('enabled').checked, axis: read('axis').value, radius: read('radius').value,
            from: read('from').value, to: read('to').value, startTick: read('startTick').value,
            duration: read('duration').value, facePath: read('facePath').checked
        });
        this.stateManager.updateLayerAnimation(layer.id, { modifiers: replaceModifierByType(layer.modifiers, modifier) });
    }

    addPreset(preset) {
        const layer = this.selectedLayer(); if (!layer) return;
        let modifier;
        if (preset === 'wave') modifier = { id: crypto.randomUUID(), type: 'wave', enabled: true, axis: 'Y', amplitude: 0.5, cycles: 2, phase: 0, startTick: 0, duration: this.stateManager.timelineDuration };
        if (preset === 'noise') modifier = { id: crypto.randomUUID(), type: 'noise', enabled: true, amplitude: { x: 0.08, y: 0.08, z: 0.08 }, frequency: 0.5, seed: Date.now() % 10000 };
        if (preset === 'counter-left' || preset === 'counter-right') modifier = { id: crypto.randomUUID(), type: 'spin', enabled: true, axis: 'Y', from: 0, to: preset === 'counter-left' ? -360 : 360, startTick: 0, duration: this.stateManager.timelineDuration, easing: 'linear' };
        this.stateManager.updateLayerAnimation(layer.id, { modifiers: [...(layer.modifiers || []), modifier] });
    }

    commitTransform() {
        const layer = this.selectedLayer();
        if (!layer) return;
        const values = {};
        this.controlsRoot.querySelectorAll('[data-transform]').forEach(input => {
            values[input.dataset.transform] = input.value;
        });
        const transform = buildTransformFromValues(layer.transform, values);
        this.stateManager.updateLayerAnimation(layer.id, { transform });
    }

    commitSpin() {
        const layer = this.selectedLayer();
        if (!layer) return;
        const read = key => this.controlsRoot.querySelector(`[data-spin="${key}"]`);
        const current = layer.modifiers?.find(item => item.type === 'spin');
        const from = read('from').value;
        const to = read('direction').value === spinDirection(from, read('to').value)
            ? read('to').value
            : applySpinDirection(from, read('to').value, read('direction').value);
        const modifier = buildSpinModifier(current, {
            enabled: read('enabled').checked, axis: read('axis').value,
            from, to,
            startTick: read('startTick').value, duration: read('duration').value,
            easing: read('easing').value
        });
        const modifiers = replaceModifierByType(layer.modifiers, modifier);
        this.stateManager.updateLayerAnimation(layer.id, { modifiers });
    }

    removeSpin() {
        const layer = this.selectedLayer();
        if (!layer) return;
        clearTimeout(this.commitTimers.get('spin'));
        this.commitTimers.delete('spin');
        this.stateManager.updateLayerAnimation(layer.id, { modifiers: removeModifierByType(layer.modifiers, 'spin') });
    }

    removeTimelineRow(kind, id) {
        const layer = this.selectedLayer();
        if (!layer || !id) return;
        if (kind === 'modifier') {
            this.stateManager.updateLayerAnimation(layer.id, { modifiers: removeTimelineItem(layer.modifiers, id) });
        } else if (kind === 'track') {
            this.stateManager.updateLayerAnimation(layer.id, { tracks: removeTimelineItem(layer.tracks, id) });
        }
    }

    update(state) {
        const layer = state.drawingGroups.find(item => item.id === state.selectedGroup?.id);
        this.root.querySelector('[data-role="selection"]').textContent = layer ? `編輯：${layer.name}` : '請選取圖層';
        this.controlsRoot.style.opacity = layer ? '1' : '.45';
        this.root.querySelector('[data-role="scrubber"]').max = state.timelineDuration;
        this.root.querySelector('[data-role="scrubber"]').value = state.timelineTick;
        this.root.querySelector('[data-role="tick"]').max = state.timelineDuration;
        this.root.querySelector('[data-role="tick"]').value = Math.round(state.timelineTick * 10) / 10;
        this.root.querySelector('[data-role="duration"]').value = state.timelineDuration;
        this.root.querySelector('[data-action="play"]').textContent = state.timelinePlaying ? '❚❚' : '▶';
        this.renderTracks(layer, state);
        if (!layer) return;
        const transform = normalizeTransform(layer.transform);
        this.controlsRoot.querySelectorAll('[data-transform]').forEach(input => {
            if (document.activeElement === input || this.commitTimers.has('transform')) return;
            const [group, key] = input.dataset.transform.split('.'); input.value = transform[group][key];
        });
        const spin = layer.modifiers?.find(item => item.type === 'spin');
        const set = (key, value) => {
            const input = this.controlsRoot.querySelector(`[data-spin="${key}"]`);
            if (document.activeElement === input || this.commitTimers.has('spin')) return;
            if (input.type === 'checkbox') input.checked = !!value; else input.value = value;
        };
        set('enabled', spin?.enabled); set('axis', spin?.axis || 'Y'); set('direction', spinDirection(spin?.from ?? 0, spin?.to ?? 360)); set('from', spin?.from ?? 0); set('to', spin?.to ?? 360);
        set('startTick', spin?.startTick ?? 0); set('duration', spin?.duration ?? state.timelineDuration); set('easing', spin?.easing || 'linear');
        this.controlsRoot.querySelector('[data-spin-action="remove"]').disabled = !spin;
        const timing = layer.timing || {};
        this.controlsRoot.querySelectorAll('[data-timing]').forEach(input => {
            if (document.activeElement === input) return;
            input.value = timing[input.dataset.timing] ?? (input.dataset.timing === 'loopMode' ? 'once' : input.dataset.timing === 'loop' ? 1 : input.dataset.timing === 'duration' ? state.timelineDuration : 0);
        });
        const keyCount = (layer.tracks || []).reduce((sum, track) => sum + (track.keyframes?.length || 0), 0);
        this.controlsRoot.querySelector('[data-role="key-count"]').textContent = `${keyCount} keys`;
        const orbit = layer.modifiers?.find(item => item.type === 'orbit');
        const setOrbit = (key, value) => {
            const input = this.controlsRoot.querySelector(`[data-orbit="${key}"]`);
            if (document.activeElement === input || this.commitTimers.has('orbit')) return;
            if (input.type === 'checkbox') input.checked = !!value; else input.value = value;
        };
        setOrbit('enabled', orbit?.enabled); setOrbit('axis', orbit?.axis || 'Y'); setOrbit('radius', orbit?.radius ?? 1);
        setOrbit('from', orbit?.from ?? 0); setOrbit('to', orbit?.to ?? 360); setOrbit('startTick', orbit?.startTick ?? 0);
        setOrbit('duration', orbit?.duration ?? state.timelineDuration); setOrbit('facePath', orbit?.facePath);
    }

    renderTracks(layer, state) {
        const root = this.root.querySelector('[data-role="tracks"]');
        if (!layer) {
            root.innerHTML = '<div class="track-empty">從圖層面板選取圖層，即可查看關鍵影格與修改器作用區間</div>';
            return;
        }
        const duration = Math.max(1, Number(state.timelineDuration) || 80);
        const tracks = (layer.tracks || []).filter(track => track.keyframes?.length);
        const modifiers = layer.modifiers || [];
        const rows = tracks.map(track => ({
            id: track.id,
            kind: 'track',
            label: track.property || track.path || 'Property',
            keys: track.keyframes.map(key => Number(key.tick) || 0),
            enabled: track.enabled !== false
        }));
        modifiers.forEach(modifier => rows.push({
            id: modifier.id,
            kind: 'modifier',
            label: `${modifier.type || 'Modifier'} · 作用區間`,
            range: [Number(modifier.startTick) || 0, (Number(modifier.startTick) || 0) + (Number(modifier.duration) || duration)],
            enabled: modifier.enabled !== false
        }));
        if (!rows.length) rows.push({ label: layer.name, keys: [] });
        root.innerHTML = rows.map(row => `
            <div class="track-row${row.enabled === false ? ' is-disabled' : ''}">
                <span class="track-label">${this.escapeHtml(row.label)}</span>
                <div class="track-lane">
                    ${row.range ? `<span class="modifier-range" style="left:${Math.max(0, row.range[0] / duration * 100)}%;width:${Math.max(1, Math.min(duration, row.range[1]) - row.range[0]) / duration * 100}%"></span>` : ''}
                    ${(row.keys || []).map(tick => `<button type="button" class="key-diamond" data-tick="${tick}" style="left:${Math.max(0, Math.min(100, tick / duration * 100))}%" title="Tick ${tick}"></button>`).join('')}
                    <span class="playhead" style="left:${Math.max(0, Math.min(100, (Number(state.timelineTick) || 0) / duration * 100))}%"></span>
                </div>
                ${row.id ? `<button type="button" class="track-row-delete" data-row-kind="${row.kind}" data-row-id="${this.escapeHtml(row.id)}" title="刪除「${this.escapeHtml(row.label)}」" aria-label="刪除「${this.escapeHtml(row.label)}」">×</button>` : ''}
            </div>`).join('');
        root.querySelectorAll('[data-tick]').forEach(button => button.addEventListener('click', () => this.stateManager.setTimelineTick(button.dataset.tick)));
        root.querySelectorAll('[data-row-id]').forEach(button => button.addEventListener('click', () => this.removeTimelineRow(button.dataset.rowKind, button.dataset.rowId)));
    }

    escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
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
