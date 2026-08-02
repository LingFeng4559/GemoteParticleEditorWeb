import { isLayerContainer } from './LayerModel.js';
import lang from './LanguageManager.js';

class LayerPanel {
    constructor(stateManager, container, addGroupButton) {
        this.stateManager = stateManager;
        this.container = container;
        this.addGroupButton = addGroupButton;
        this.setupEvents();
        window.addEventListener('languageChanged', () => {
            this.lastRenderSignature = null;
            this.update(this.stateManager.getState());
        });
    }

    setupEvents() {
        this.addGroupButton?.addEventListener('click', () => {
            const selectedId = this.stateManager.getState().selectedGroup?.id || null;
            const selected = this.stateManager.getState().drawingGroups.find(layer => layer.id === selectedId);
            this.stateManager.addLayerGroup({ parentId: isLayerContainer(selected) ? selected.id : selected?.parentId || null });
        });

    }

    handleAction(action, layerId) {
        const state = this.stateManager.getState();
        const layer = state.drawingGroups.find(item => item.id === layerId);
        if (!layer) return;
        if (action === 'select') this.stateManager.setSelectedGroup({ id: layerId });
        if (action === 'expand') this.stateManager.updateLayerState(layerId, { expanded: !layer.expanded });
        if (action === 'visible') this.stateManager.updateLayerState(layerId, { visible: !layer.visible });
        if (action === 'export') this.stateManager.updateLayerState(layerId, { exportEnabled: !layer.exportEnabled });
        if (action === 'lock') this.stateManager.updateLayerState(layerId, { locked: !layer.locked });
        if (action === 'solo') this.stateManager.toggleLayerSolo(layerId);
        if (action === 'rename') {
            const name = window.prompt(lang.get('layer_name_prompt'), layer.name);
            if (name?.trim()) this.stateManager.updateLayerState(layerId, { name: name.trim() });
        }
        if (action === 'delete' && window.confirm(lang.get('layer_delete_confirm', { name: layer.name }))) {
            this.stateManager.removeGroup(layerId);
        }
    }

    createButton(action, label, title, active = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `layer-icon-btn${active ? ' active' : ''}`;
        button.dataset.layerAction = action;
        button.textContent = label;
        button.title = title;
        button.setAttribute('aria-label', title);
        return button;
    }

    createRow(layer, depth, selectedId, hasChildren) {
        const row = document.createElement('div');
        row.className = `layer-row${selectedId === layer.id ? ' selected' : ''}`;
        row.style.setProperty('--layer-depth', depth);
        row.draggable = true;
        row.dataset.layerId = layer.id;
        row.addEventListener('dragstart', event => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', layer.id);
            row.classList.add('dragging');
        });
        row.addEventListener('dragend', () => row.classList.remove('dragging'));
        row.addEventListener('dragover', event => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            row.classList.add('drag-over');
        });
        row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
        row.addEventListener('drop', event => {
            event.preventDefault();
            row.classList.remove('drag-over');
            const sourceId = event.dataTransfer.getData('text/plain');
            this.stateManager.moveLayer(sourceId, layer.id, isLayerContainer(layer) ? 'inside' : 'before');
        });

        const expand = this.createButton('expand', hasChildren ? (layer.expanded ? '▾' : '▸') : '·', lang.get('layer_expand'));
        expand.disabled = !hasChildren;
        row.appendChild(expand);

        const name = this.createButton('select', '', lang.get('layer_select'));
        name.className = 'layer-name-btn';
        name.textContent = `${isLayerContainer(layer) ? '▣' : '◆'} ${layer.name}`;
        name.addEventListener('dblclick', event => {
            event.stopPropagation();
            const renamed = window.prompt(lang.get('layer_name_prompt'), layer.name);
            if (renamed?.trim()) this.stateManager.updateLayerState(layer.id, { name: renamed.trim() });
        });
        row.appendChild(name);

        row.appendChild(this.createButton('visible', layer.visible ? '◉' : '○', lang.get(layer.visible ? 'layer_hide' : 'layer_show'), layer.visible));
        row.appendChild(this.createButton('export', layer.exportEnabled ? '↥' : '—', lang.get(layer.exportEnabled ? 'layer_exclude_export' : 'layer_include_export'), layer.exportEnabled));
        row.appendChild(this.createButton('lock', layer.locked ? '🔒' : '🔓', lang.get(layer.locked ? 'layer_unlock' : 'layer_lock'), layer.locked));
        row.appendChild(this.createButton('solo', 'S', lang.get('layer_solo'), layer.solo));
        row.appendChild(this.createButton('delete', '×', lang.get('layer_delete')));

        row.querySelectorAll('[data-layer-action]').forEach(button => {
            button.dataset.layerId = layer.id;
            button.onclick = event => {
                event.stopPropagation();
                this.handleAction(button.dataset.layerAction, layer.id);
            };
        });
        return row;
    }

    update(state) {
        if (!this.container) return;
        const layers = [...state.drawingGroups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const signature = `${state.selectedGroup?.id || ''}|${layers.map(layer => [
            layer.id, layer.parentId, layer.order, layer.name, layer.type,
            layer.visible, layer.exportEnabled, layer.locked, layer.solo,
            layer.expanded, layer.particles?.length || 0
        ].join(':')).join('|')}`;
        if (signature === this.lastRenderSignature) return;
        this.lastRenderSignature = signature;
        const children = new Map();
        for (const layer of layers) {
            if (!children.has(layer.parentId)) children.set(layer.parentId, []);
            children.get(layer.parentId).push(layer);
        }

        const fragment = document.createDocumentFragment();
        const visited = new Set();
        const renderBranch = (parentId, depth) => {
            for (const layer of children.get(parentId) || []) {
                if (visited.has(layer.id)) continue;
                visited.add(layer.id);
                const hasChildren = (children.get(layer.id) || []).length > 0;
                fragment.appendChild(this.createRow(layer, depth, state.selectedGroup?.id, hasChildren));
                if (hasChildren && layer.expanded !== false) renderBranch(layer.id, depth + 1);
            }
        };
        renderBranch(null, 0);

        this.container.replaceChildren(fragment);
        this.container.classList.toggle('empty', layers.length === 0);
        if (layers.length === 0) this.container.textContent = lang.get('layer_empty');
    }
}

export default LayerPanel;
