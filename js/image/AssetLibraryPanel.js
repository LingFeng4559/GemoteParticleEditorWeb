import { createThumbnailBlob, ImageAssetStore } from './ImageAssetStore.js';

class AssetLibraryPanel {
    constructor(anchor, onImport) {
        this.store = new ImageAssetStore();
        this.onImport = onImport;
        this.assets = [];
        this.objectUrls = [];
        this.build(anchor);
        this.refresh();
    }

    build(anchor) {
        this.root = document.createElement('div');
        this.root.className = 'asset-library';
        this.root.innerHTML = `<div class="asset-toolbar"><strong>素材庫</strong><input type="search" placeholder="搜尋素材"><button type="button" data-action="clear">清空</button></div><div class="asset-summary">載入中…</div><div class="asset-grid"></div>`;
        anchor?.insertAdjacentElement('afterend', this.root);
        this.root.querySelector('input').addEventListener('input', () => this.render());
        this.root.querySelector('[data-action="clear"]').addEventListener('click', async () => {
            if (!confirm('確定清空瀏覽器素材庫？專案內已建立的粒子圖層不受影響。')) return;
            await this.store.clear(); await this.refresh();
        });
    }

    async addFiles(files) {
        let completed = 0;
        for (const file of files) {
            const id = `${file.name}:${file.size}:${file.lastModified}`;
            const image = await createThumbnailBlob(file);
            await this.store.put({ id, name: file.name, type: file.type, size: file.size, updatedAt: Date.now(), blob: file, ...image });
            completed++;
            this.root.querySelector('.asset-summary').textContent = `正在保存 ${completed}/${files.length}`;
        }
        await this.refresh();
    }

    async refresh() {
        try {
            this.assets = (await this.store.list()).sort((a, b) => b.updatedAt - a.updatedAt);
            this.render();
        } catch (error) {
            this.root.querySelector('.asset-summary').textContent = `素材庫無法使用：${error.message}`;
        }
    }

    render() {
        this.objectUrls.forEach(url => URL.revokeObjectURL(url)); this.objectUrls = [];
        const query = this.root.querySelector('input').value.trim().toLowerCase();
        const assets = this.assets.filter(asset => asset.name.toLowerCase().includes(query));
        this.root.querySelector('.asset-summary').textContent = `${assets.length}/${this.assets.length} 個素材`;
        const grid = this.root.querySelector('.asset-grid'); grid.replaceChildren();
        for (const asset of assets) {
            const card = document.createElement('button'); card.type = 'button'; card.className = 'asset-card'; card.title = `${asset.name}｜${asset.width}×${asset.height}`;
            const url = URL.createObjectURL(asset.thumbnail || asset.blob); this.objectUrls.push(url);
            card.innerHTML = `<img alt=""><span></span><small>${asset.width}×${asset.height}</small>`;
            card.querySelector('img').src = url; card.querySelector('span').textContent = asset.name;
            card.addEventListener('click', () => this.onImport(new File([asset.blob], asset.name, { type: asset.type, lastModified: asset.updatedAt })));
            card.addEventListener('contextmenu', async event => { event.preventDefault(); if (confirm(`刪除素材 ${asset.name}？`)) { await this.store.delete(asset.id); await this.refresh(); } });
            grid.appendChild(card);
        }
    }
}

export default AssetLibraryPanel;
