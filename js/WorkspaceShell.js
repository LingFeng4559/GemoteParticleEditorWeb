class WorkspaceShell {
    constructor(stateManager) {
        this.stateManager = stateManager;
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
                    <button data-command="undo" title="復原 Ctrl+Z">↶</button>
                    <button data-command="redo" title="重做 Ctrl+Shift+Z">↷</button>
                    <span class="toolbar-separator"></span>
                    <button data-command="save">儲存</button>
                    <button data-command="preview" class="preview-command">▶ 預覽</button>
                    <button data-command="export" class="export-command">匯出 YML</button>
                </div>
            </header>
            <aside id="left-dock" class="editor-dock" aria-label="工具與場景結構">
                <div class="dock-tabs" role="tablist">
                    <button role="tab" data-left-tab="tools" class="active">工具</button>
                    <button role="tab" data-left-tab="hierarchy">Hierarchy</button>
                    <button role="tab" data-left-tab="assets">素材</button>
                </div>
                <div class="dock-pane active" data-left-pane="tools"></div>
                <div class="dock-pane" data-left-pane="hierarchy"><div class="pane-heading"><strong>場景結構</strong><span>圖層與群組</span></div></div>
                <div class="dock-pane" data-left-pane="assets"><div class="pane-heading"><strong>素材庫</strong><span>圖片轉粒子</span></div></div>
            </aside>
            <aside id="inspector-dock" class="editor-dock" aria-label="屬性面板">
                <div class="inspector-header"><div><small>INSPECTOR</small><strong data-role="selection-name">未選取圖層</strong></div><button data-command="pin" title="固定 Inspector">◇</button></div>
                <div class="inspector-context" data-role="selection-context"><span class="context-icon">◇</span><div><strong>選取一個圖層</strong><p>從 Hierarchy 或 Viewport 選取內容後，在這裡編輯屬性與動畫。</p></div></div>
                <div class="inspector-scroll"></div>
            </aside>
            <div id="viewport-toolbar" aria-label="視窗工具列">
                <span data-role="mode">相機模式</span><span class="toolbar-separator"></span>
                <button data-command="frame" title="聚焦選取 F">聚焦</button>
                <button data-command="grid" class="active">網格</button>
                <button data-command="character">Steve</button>
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
        ['particle-settings', 'mirror-tools', 'reference-character', 'project-management', 'actions-output']
            .forEach(name => take(name, inspector));
        document.querySelector('#panel-header')?.remove();
        document.querySelector('#ui-panel')?.classList.add('workspace-source-empty');
    }

    bind() {
        document.querySelectorAll('[data-workspace]').forEach(button => button.addEventListener('click', () => this.setWorkspace(button.dataset.workspace)));
        document.querySelectorAll('[data-left-tab]').forEach(button => button.addEventListener('click', () => this.setLeftTab(button.dataset.leftTab)));
        document.querySelector('#workspace-topbar').addEventListener('click', event => {
            const command = event.target.closest('[data-command]')?.dataset.command;
            if (!command) return;
            const targets = { undo: '#btn-undo', redo: '#btn-redo', save: '#btn-save-project', export: '#btn-generate' };
            if (targets[command]) document.querySelector(targets[command])?.click();
            if (command === 'preview') this.stateManager.setTimelinePlaying(!this.stateManager.timelinePlaying);
        });
    }

    setWorkspace(workspace) {
        this.workspace = workspace;
        document.body.dataset.workspace = workspace;
        document.querySelectorAll('[data-workspace]').forEach(button => button.classList.toggle('active', button.dataset.workspace === workspace));
        this.setTimelineCollapsed(workspace !== 'animate');
        if (workspace === 'export') document.querySelector('[data-section="actions-output"]')?.classList.remove('collapsed');
        if (workspace === 'draw') this.setLeftTab('tools');
        if (workspace === 'animate') this.setLeftTab('hierarchy');
        if (workspace === 'export') requestAnimationFrame(() => document.querySelector('[data-section="actions-output"]')?.scrollIntoView({ block: 'start' }));
        if (workspace === 'preview') this.stateManager.setTimelinePlaying(true);
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
        const particleCount = (state.particlePoints || []).length + (state.drawingGroups || []).reduce((sum, layer) => sum + (layer.particles?.length || 0), 0);
        document.querySelector('[data-role="project-name"]').textContent = state.projectName || '未命名專案';
        document.querySelector('[data-role="selection-name"]').textContent = selected?.name || '未選取圖層';
        const context = document.querySelector('[data-role="selection-context"]');
        context.classList.toggle('has-selection', !!selected);
        context.innerHTML = selected
            ? `<span class="context-icon">${selected.type === 'group' ? '▣' : '◆'}</span><div><strong>${selected.type === 'group' ? '群組' : '粒子圖層'}</strong><p>${selected.particles?.length || 0} 個粒子 · ${selected.locked ? '已鎖定' : '可編輯'}</p></div>`
            : '<span class="context-icon">◇</span><div><strong>選取一個圖層</strong><p>從 Hierarchy 或 Viewport 選取內容後，在這裡編輯屬性與動畫。</p></div>';
        document.querySelector('[data-role="status-selection"]').textContent = selected ? `選取：${selected.name}` : '沒有選取項目';
        document.querySelector('[data-role="status-particles"]').textContent = `${particleCount.toLocaleString()} 個粒子`;
        document.querySelector('[data-role="status-time"]').textContent = `Tick ${Math.round(state.timelineTick || 0)} / ${state.timelineDuration || 80}`;
        document.querySelector('[data-role="mode"]').textContent = `${this.modeLabel(state.mode)}模式`;
        const preview = document.querySelector('[data-command="preview"]');
        preview.classList.toggle('active', !!state.timelinePlaying);
        preview.textContent = state.timelinePlaying ? '❚❚ 暫停' : '▶ 預覽';
    }

    modeLabel(mode) {
        return ({ camera: '相機', select: '選取', point: '單點', brush: '筆刷', eraser: '橡皮擦', rectangle: '方形', circle: '圓形' })[mode] || '相機';
    }
}

export default WorkspaceShell;
