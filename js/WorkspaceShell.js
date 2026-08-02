class WorkspaceShell {
    constructor(stateManager, sceneManager) {
        this.stateManager = stateManager;
        this.sceneManager = sceneManager;
        this.workspace = 'draw';
        this.build();
        this.rehomeLegacySections();
        this.bind();
        this.stateManager.subscribe(state => this.update(state));
        this.update(this.stateManager.getState());
    }

    build() {
        document.body.classList.add('professional-workspace');
        document.body.dataset.workspace = this.workspace;
        document.body.insertAdjacentHTML('beforeend', `
            <header id="workspace-topbar" aria-label="專案工具列">
                <div class="app-identity"><span class="app-mark">G</span><div><strong>Gemote Particle Editor</strong><small data-role="project-name">未命名專案</small></div></div>
                <nav class="workspace-switcher" aria-label="工作區">
                    <button data-workspace="draw" class="active">繪製</button>
                    <button data-workspace="animate">動畫</button>
                    <button data-workspace="preview">預覽</button>
                    <button data-workspace="export">匯出</button>
                </nav>
                <div class="global-actions">
                    <button data-command="undo" title="復原 Ctrl+Z" aria-label="復原">↶</button>
                    <button data-command="redo" title="重做 Ctrl+Shift+Z" aria-label="重做">↷</button>
                    <span class="toolbar-separator"></span>
                    <button data-command="save">儲存</button>
                    <button data-command="preview" class="preview-command">▶ 播放</button>
                    <button data-command="export" class="export-command">匯出 YML</button>
                </div>
            </header>
            <aside id="left-dock" class="editor-dock" aria-label="工具與場景結構">
                <div class="dock-tabs" role="tablist">
                    <button role="tab" data-left-tab="tools" class="active">工具</button>
                    <button role="tab" data-left-tab="hierarchy">圖層</button>
                    <button role="tab" data-left-tab="assets">素材</button>
                </div>
                <div class="dock-pane active" data-left-pane="tools"></div>
                <div class="dock-pane" data-left-pane="hierarchy"><div class="pane-heading"><strong>場景結構</strong><span>圖層與群組</span></div></div>
                <div class="dock-pane" data-left-pane="assets"><div class="pane-heading"><strong>素材庫</strong><span>圖片轉粒子</span></div></div>
            </aside>
            <aside id="inspector-dock" class="editor-dock" aria-label="屬性面板">
                <div class="inspector-header"><div><small>INSPECTOR</small><strong data-role="selection-name">未選取圖層</strong></div><button data-command="pin" title="固定 Inspector">◇</button></div>
                <div class="inspector-context" data-role="selection-context"><span class="context-icon">◇</span><div><strong>選取一個圖層</strong><p>從圖層面板或 3D 視窗選取內容後，在這裡編輯屬性與動畫。</p></div></div>
                <div class="inspector-scroll"><div class="inspector-animation-slot" data-inspector-slot="animation"></div></div>
            </aside>
            <div id="viewport-toolbar" aria-label="視窗工具列">
                <span data-role="mode">相機模式</span><span class="toolbar-separator"></span>
                <button data-command="frame" title="聚焦選取 F">聚焦</button>
                <button data-command="grid" class="active" aria-pressed="true">網格</button>
                <button data-command="character" class="active" aria-pressed="true">參考人偶</button>
            </div>
            <div id="quick-start" role="dialog" aria-modal="true" aria-labelledby="quick-start-title" aria-describedby="quick-start-description">
                <button class="quick-start-close" data-start-action="dismiss" aria-label="關閉並開始創作" title="關閉並開始創作">×</button>
                <span class="quick-start-mark">✦</span>
                <h2 id="quick-start-title">開始建立粒子效果</h2>
                <p id="quick-start-description">建立空白創作，或載入既有的 YML 繼續編輯。</p>
                <div class="quick-start-actions">
                    <button data-start-action="new" class="primary">＋ 新的創作</button>
                    <button data-start-action="load">↥ 載入 YML</button>
                </div>
                <div class="quick-start-drop" data-role="yml-dropzone"><strong>也可以把 YML 拖曳到這裡</strong><small>支援 .yml 與 .yaml</small></div>
            </div>
            <div id="preview-hud" aria-label="預覽控制">
                <button data-preview-action="restart">↺ 重新播放</button>
                <span>循環預覽</span>
                <span data-role="preview-particles">0 粒子</span>
                <span data-role="preview-tick">Tick 0 / 80</span>
            </div>
            <div id="export-workflow" aria-label="匯出流程">
                <div><span>1</span><strong>驗證</strong><small>檢查圖層與指令預算</small></div>
                <div><span>2</span><strong>最佳化</strong><small>選擇品質與取樣</small></div>
                <div><span>3</span><strong>輸出</strong><small>下載或複製 YML</small></div>
            </div>
            <footer id="workspace-statusbar">
                <span data-role="status-selection">沒有選取項目</span>
                <span data-role="status-particles">0 個粒子</span>
                <span data-role="status-time">Tick 0 / 80</span>
                <span data-role="status-save">● 已自動儲存</span>
            </footer>`);
    }

    rehomeLegacySections() {
        const take = (name, target) => {
            const section = document.querySelector(`[data-section="${name}"]`);
            if (section) target.appendChild(section);
            return section;
        };
        const tools = document.querySelector('[data-left-pane="tools"]');
        const hierarchy = document.querySelector('[data-left-pane="hierarchy"]');
        const assets = document.querySelector('[data-left-pane="assets"]');
        const inspector = document.querySelector('#inspector-dock .inspector-scroll');
        take('drawing-tools', tools);
        take('layers', hierarchy);
        take('image-particles', assets);
        const workspaceSections = {
            'particle-settings': 'draw', 'mirror-tools': 'draw',
            'reference-character': 'draw', 'project-management': 'export',
            'actions-output': 'export'
        };
        Object.entries(workspaceSections).forEach(([name, workspace]) => {
            const section = take(name, inspector);
            if (section) section.dataset.inspectorWorkspace = workspace;
        });
        document.querySelector('#panel-header')?.remove();
        document.querySelector('#ui-panel')?.classList.add('workspace-source-empty');
    }

    bind() {
        document.querySelectorAll('.workspace-switcher [data-workspace]').forEach(button => button.addEventListener('click', () => this.setWorkspace(button.dataset.workspace)));
        document.querySelectorAll('[data-left-tab]').forEach(button => button.addEventListener('click', () => this.setLeftTab(button.dataset.leftTab)));
        document.querySelector('#workspace-topbar').addEventListener('click', event => {
            const command = event.target.closest('[data-command]')?.dataset.command;
            if (!command) return;
            const targets = { undo: '#btn-undo', redo: '#btn-redo', save: '#btn-save-project', export: '#btn-generate' };
            if (targets[command]) document.querySelector(targets[command])?.click();
            if (command === 'preview') this.stateManager.setTimelinePlaying(!this.stateManager.timelinePlaying);
        });
        document.querySelector('[data-preview-action="restart"]').addEventListener('click', () => {
            this.stateManager.setTimelineTick(0);
            this.stateManager.setTimelinePlaying(true);
        });
        document.querySelectorAll('[data-start-action]').forEach(button => button.addEventListener('click', () => {
            const action = button.dataset.startAction;
            if (action === 'new' && this.projectManager?.newProject() !== false) this.dismissQuickStart();
            if (action === 'dismiss') this.dismissQuickStart();
            if (action === 'load') this.projectManager?.loadYml();
        }));
        const quickStart = document.querySelector('#quick-start');
        const dropzone = document.querySelector('[data-role="yml-dropzone"]');
        ['dragenter', 'dragover'].forEach(type => quickStart.addEventListener(type, event => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            dropzone.classList.add('is-dragging');
        }));
        quickStart.addEventListener('dragleave', event => {
            event.preventDefault();
            if (event.relatedTarget && quickStart.contains(event.relatedTarget)) return;
            dropzone.classList.remove('is-dragging');
        });
        quickStart.addEventListener('drop', async event => {
            event.preventDefault();
            dropzone.classList.remove('is-dragging');
            const file = [...event.dataTransfer.files].find(item => /\.ya?ml$/i.test(item.name));
            if (!file) {
                dropzone.classList.add('has-error');
                dropzone.querySelector('strong').textContent = '請拖入 .yml 或 .yaml 檔案';
                window.setTimeout(() => {
                    dropzone.classList.remove('has-error');
                    dropzone.querySelector('strong').textContent = '也可以把 YML 拖曳到這裡';
                }, 1800);
                return;
            }
            if (await this.projectManager?.loadFile(file)) this.dismissQuickStart(false);
        });
        document.querySelector('#viewport-toolbar [data-command="frame"]').addEventListener('click', () => this.framePreview());
        document.querySelector('#viewport-toolbar [data-command="grid"]').addEventListener('click', event => {
            const visible = !this.sceneManager.gridHelper.visible;
            this.sceneManager.gridHelper.visible = visible;
            event.currentTarget.classList.toggle('active', visible);
            event.currentTarget.setAttribute('aria-pressed', String(visible));
        });
        document.querySelector('#viewport-toolbar [data-command="character"]').addEventListener('click', event => {
            const currentMode = this.stateManager.getState().characterMode;
            if (currentMode === 'hidden') {
                this.stateManager.setCharacterMode(this.lastVisibleCharacterMode || 'opaque');
            } else {
                this.lastVisibleCharacterMode = currentMode;
                this.stateManager.setCharacterMode('hidden');
            }
        });
    }

    setWorkspace(workspace) {
        const previousWorkspace = this.workspace;
        this.workspace = workspace;
        document.body.dataset.workspace = workspace;
        window.dispatchEvent(new CustomEvent('workspaceChanged', { detail: { workspace, previousWorkspace } }));
        document.querySelectorAll('.workspace-switcher [data-workspace]').forEach(button => button.classList.toggle('active', button.dataset.workspace === workspace));
        this.setTimelineCollapsed(workspace !== 'animate');
        if (workspace === 'export') document.querySelector('[data-section="actions-output"]')?.classList.remove('collapsed');
        if (workspace === 'draw') this.setLeftTab('tools');
        if (workspace === 'animate') this.setLeftTab('hierarchy');
        if (workspace === 'export') this.setLeftTab('hierarchy');
        if (workspace === 'export') requestAnimationFrame(() => {
            document.querySelector('#btn-estimate-export')?.click();
            document.querySelector('[data-section="actions-output"]')?.scrollIntoView({ block: 'start' });
        });
        else document.querySelector('#inspector-dock .inspector-scroll')?.scrollTo({ top: 0 });
        if (workspace === 'preview') {
            this.framePreview();
            this.stateManager.setTimelinePlaying(true);
        }
        if (previousWorkspace === 'preview' && workspace !== 'preview') this.stateManager.setTimelinePlaying(false);
        this.update(this.stateManager.getState());
    }

    bindProjectManager(projectManager) {
        this.projectManager = projectManager;
    }

    dismissQuickStart(useBrush = true) {
        this.quickStartDismissed = true;
        document.querySelector('#quick-start')?.classList.remove('visible');
        if (useBrush) {
            this.setLeftTab('tools');
            this.stateManager.setMode('brush');
        }
    }

    setTimelineCollapsed(collapsed) {
        const panel = document.querySelector('.timeline-panel');
        if (!panel) return;
        panel.classList.toggle('is-collapsed', collapsed);
        const button = panel.querySelector('[data-action="collapse"]');
        if (!button) return;
        button.textContent = collapsed ? '⌃' : '⌄';
        button.title = collapsed ? '展開時間軸' : '收合時間軸';
        button.setAttribute('aria-expanded', String(!collapsed));
    }

    setLeftTab(tab) {
        document.querySelectorAll('[data-left-tab]').forEach(button => button.classList.toggle('active', button.dataset.leftTab === tab));
        document.querySelectorAll('[data-left-pane]').forEach(pane => pane.classList.toggle('active', pane.dataset.leftPane === tab));
    }

    update(state) {
        const selected = (state.drawingGroups || []).find(layer => layer.id === state.selectedGroup?.id);
        document.body.classList.toggle('has-layer-selection', !!selected);
        const particleCount = (state.particlePoints || []).length + (state.drawingGroups || []).reduce((sum, layer) => sum + (layer.particles?.length || 0), 0);
        document.querySelector('[data-role="project-name"]').textContent = state.projectName || '未命名專案';
        const inspectorTitle = this.workspace === 'draw' ? '工具設定'
            : this.workspace === 'export' ? '匯出設定'
                : selected?.name || '未選取圖層';
        document.querySelector('[data-role="selection-name"]').textContent = inspectorTitle;
        const context = document.querySelector('[data-role="selection-context"]');
        context.classList.toggle('has-selection', !!selected);
        context.innerHTML = this.workspace === 'draw'
            ? '<span class="context-icon">✎</span><div><strong>新筆畫設定</strong><p>下方粒子、鏡像與參考模型設定會套用到接下來的繪製。</p></div>'
            : selected
            ? `<span class="context-icon">${selected.type === 'group' ? '▣' : '◆'}</span><div><strong>${selected.type === 'group' ? '群組' : '粒子圖層'}</strong><p>${selected.particles?.length || 0} 個粒子 · ${selected.locked ? '已鎖定' : '可編輯'}</p></div>`
            : '<span class="context-icon">◇</span><div><strong>選取一個圖層</strong><p>從圖層面板或 3D 視窗選取內容後，在這裡編輯屬性與動畫。</p></div>';
        document.querySelector('[data-role="status-selection"]').textContent = selected ? `選取：${selected.name}` : '沒有選取項目';
        document.querySelector('[data-role="status-particles"]').textContent = `${particleCount.toLocaleString()} 個粒子`;
        const frameInterval = Math.max(1, Number(state.timelineFrameInterval) || 1);
        const currentFrame = Math.min(state.timelineFrameCount || 81, Math.round((state.timelineTick || 0) / frameInterval) + 1);
        document.querySelector('[data-role="status-time"]').textContent = `影格 ${currentFrame} / ${state.timelineFrameCount || 81} · Tick ${Math.round(state.timelineTick || 0)}`;
        document.querySelector('[data-role="preview-particles"]').textContent = `${particleCount.toLocaleString()} 粒子`;
        document.querySelector('[data-role="preview-tick"]').textContent = `影格 ${currentFrame} / ${state.timelineFrameCount || 81} · Tick ${Math.round(state.timelineTick || 0)}`;
        document.querySelector('[data-role="mode"]').textContent = `${this.modeLabel(state.currentMode)}模式`;
        const preview = document.querySelector('[data-command="preview"]');
        preview.classList.toggle('active', !!state.timelinePlaying);
        preview.textContent = state.timelinePlaying ? '❚❚ 暫停' : '▶ 播放';
        const characterButton = document.querySelector('#viewport-toolbar [data-command="character"]');
        const characterVisible = state.characterMode !== 'hidden';
        characterButton?.classList.toggle('active', characterVisible);
        characterButton?.setAttribute('aria-pressed', String(characterVisible));
        document.querySelector('#quick-start').classList.toggle('visible', particleCount === 0 && this.workspace === 'draw' && !this.quickStartDismissed);
    }

    modeLabel(mode) {
        return ({ camera: '相機', select: '選取', point: '單點', brush: '筆刷', eraser: '橡皮擦', rectangle: '方形', circle: '圓形' })[mode] || '相機';
    }

    framePreview() {
        if (!this.sceneManager) return;
        const state = this.stateManager.getState();
        const selectedId = state.selectedGroup?.id;
        const selected = (state.drawingGroups || []).find(layer => layer.id === selectedId);
        const points = selected?.particles?.length
            ? selected.particles
            : [...(state.particlePoints || []), ...(state.drawingGroups || []).flatMap(layer => layer.particles || [])];
        if (!points.length) return;
        const bounds = points.reduce((result, point) => ({
            minX: Math.min(result.minX, Number(point.x) || 0), maxX: Math.max(result.maxX, Number(point.x) || 0),
            minY: Math.min(result.minY, Number(point.y) || 0), maxY: Math.max(result.maxY, Number(point.y) || 0),
            minZ: Math.min(result.minZ, Number(point.z) || 0), maxZ: Math.max(result.maxZ, Number(point.z) || 0)
        }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity });
        const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2, z: (bounds.minZ + bounds.maxZ) / 2 };
        const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, bounds.maxZ - bounds.minZ, 1);
        const distance = Math.max(2.8, span * 2.4);
        this.sceneManager.camera.position.set(center.x + distance, center.y + distance * .72, center.z + distance);
        this.sceneManager.controls.target.set(center.x, center.y, center.z);
        this.sceneManager.controls.update();
    }
}

export default WorkspaceShell;
