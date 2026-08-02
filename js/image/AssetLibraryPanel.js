import { createThumbnailBlob, ImageAssetStore } from './ImageAssetStore.js';
import lang from '../LanguageManager.js';

class AssetLibraryPanel {
    constructor(anchor, onImport) {
        this.store = new ImageAssetStore();
        this.onImport = onImport;
        this.assets = [];
        this.loaded = false;
        this.objectUrls = [];
        this.build(anchor);
        this.refresh();
        window.addEventListener('languageChanged', () => this.applyLanguage());
    }

    build(anchor) {
        this.root = document.createElement('div');
        this.root.className = 'asset-library';
        this.root.innerHTML = `<div class="asset-toolbar"><strong></strong><input type="search"><button type="button" data-action="clear"></button></div><div class="asset-summary"></div><div class="asset-grid"></div>`;
        anchor?.insertAdjacentElement('afterend', this.root);
        this.applyLanguage();
        this.root.querySelector('input').addEventListener('input', () => this.render());
        this.root.querySelector('[data-action="clear"]').addEventListener('click', async () => {
            if (!confirm(lang.get('asset_clear_confirm'))) return;
            await this.store.clear(); await this.refresh();
        });
    }

    applyLanguage() {
        this.root.querySelector('.asset-toolbar strong').textContent = lang.get('asset_library');
        this.root.querySelector('input').placeholder = lang.get('asset_search_placeholder');
        this.root.querySelector('[data-action="clear"]').textContent = lang.get('asset_clear');
        if (this.loaded) this.render();
        else this.root.querySelector('.asset-summary').textContent = lang.get('asset_loading');
    }

    async addFiles(files) {
        let completed = 0;
        for (const file of files) {
            const id = `${file.name}:${file.size}:${file.lastModified}`;
            const image = await createThumbnailBlob(file);
            await this.store.put({ id, name: file.name, type: file.type, size: file.size, updatedAt: Date.now(), blob: file, ...image });
            completed++;
            this.root.querySelector('.asset-summary').textContent = lang.get('asset_saving', { completed, total: files.length });
        }
        await this.refresh();
    }

    async refresh() {
        try {
            this.assets = (await this.store.list()).sort((a, b) => b.updatedAt - a.updatedAt);
            this.loaded = true;
            this.render();
        } catch (error) {
            this.root.querySelector('.asset-summary').textContent = lang.get('asset_unavailable', { message: error.message });
        }
    }

    render() {
        this.objectUrls.forEach(url => URL.revokeObjectURL(url)); this.objectUrls = [];
        const query = this.root.querySelector('input').value.trim().toLowerCase();
        const assets = this.assets.filter(asset => asset.name.toLowerCase().includes(query));
        this.root.querySelector('.asset-summary').textContent = lang.get('asset_count', { shown: assets.length, total: this.assets.length });
        const grid = this.root.querySelector('.asset-grid'); grid.replaceChildren();
        for (const asset of assets) {
            const card = document.createElement('button'); card.type = 'button'; card.className = 'asset-card'; card.title = `${asset.name}｜${asset.width}×${asset.height}`;
            const url = URL.createObjectURL(asset.thumbnail || asset.blob); this.objectUrls.push(url);
            card.innerHTML = `<img alt=""><span></span><small>${asset.width}×${asset.height}</small>`;
            card.querySelector('img').src = url; card.querySelector('span').textContent = asset.name;
            card.addEventListener('click', () => this.onImport(new File([asset.blob], asset.name, { type: asset.type, lastModified: asset.updatedAt })));
            card.addEventListener('contextmenu', async event => { event.preventDefault(); if (confirm(lang.get('asset_delete_confirm', { name: asset.name }))) { await this.store.delete(asset.id); await this.refresh(); } });
            grid.appendChild(card);
        }
    }
}

export default AssetLibraryPanel;
