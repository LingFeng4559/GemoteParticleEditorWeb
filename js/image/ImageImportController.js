import { convertImageDataToParticles } from './ImageParticleConverter.js';
import AssetLibraryPanel from './AssetLibraryPanel.js';

class ImageImportController {
    constructor(stateManager, elements) {
        this.stateManager = stateManager;
        this.elements = elements;
        this.assetLibrary = new AssetLibraryPanel(elements.status, file => this.importFiles([file], { storeAssets: false }));
        this.setupEvents();
    }

    setupEvents() {
        this.elements.imageButton?.addEventListener('click', () => this.elements.imageInput?.click());
        this.elements.folderButton?.addEventListener('click', () => this.elements.folderInput?.click());
        this.elements.imageInput?.addEventListener('change', event => this.importFiles(event.target.files));
        this.elements.folderInput?.addEventListener('change', event => this.importFiles(event.target.files));
    }

    getOptions() {
        const state = this.stateManager.getState();
        return {
            outputWidth: Math.max(1, Math.min(256, Number(this.elements.outputWidth?.value) || 32)),
            alphaThreshold: Number(this.elements.alphaThreshold?.value) || 1,
            sampleStep: Math.max(1, Number(this.elements.sampleStep?.value) || 1),
            spacing: Math.max(0.01, Number(this.elements.spacing?.value) || 0.125),
            plane: this.elements.plane?.value || 'XY',
            colorMode: this.elements.colorMode?.value || 'source',
            singleColor: state.particleColor,
            particleType: (this.elements.colorMode?.value || 'source') === 'source' ? 'redstone' : state.particleType
        };
    }

    setStatus(message, status = 'info') {
        if (!this.elements.status) return;
        this.elements.status.textContent = message;
        this.elements.status.dataset.status = status;
    }

    async decodeFile(file, outputWidth) {
        const bitmap = await createImageBitmap(file);
        try {
            const scale = Math.min(1, outputWidth / bitmap.width);
            const width = Math.max(1, Math.round(bitmap.width * scale));
            const height = Math.max(1, Math.round(bitmap.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.imageSmoothingEnabled = false;
            context.clearRect(0, 0, width, height);
            context.drawImage(bitmap, 0, 0, width, height);
            return context.getImageData(0, 0, width, height);
        } finally {
            bitmap.close();
        }
    }

    async importFiles(fileList, { storeAssets = true } = {}) {
        const files = Array.from(fileList || []).filter(file => file.type.startsWith('image/'));
        if (files.length === 0) {
            this.setStatus('沒有找到可讀取的圖片。', 'error');
            return;
        }

        const options = this.getOptions();
        let imported = 0;
        let particleCount = 0;
        const errors = [];
        this.setStatus(`正在轉換 ${files.length} 張圖片…`);
        if (storeAssets) {
            try { await this.assetLibrary.addFiles(files); }
            catch (error) { errors.push(`素材庫：${error.message}`); }
        }

        for (const file of files) {
            try {
                const imageData = await this.decodeFile(file, options.outputWidth);
                const result = convertImageDataToParticles(imageData, options);
                if (result.particles.length === 0) {
                    errors.push(`${file.name}：沒有通過透明度門檻的像素`);
                    continue;
                }

                const particles = result.particles.map(particle => ({
                    ...particle,
                    id: crypto.randomUUID()
                }));
                this.stateManager.addGroup({
                    id: crypto.randomUUID(),
                    type: 'image',
                    layerKind: 'content',
                    name: file.name.replace(/\.[^.]+$/, ''),
                    particles,
                    particleType: options.particleType,
                    color: options.singleColor,
                    source: {
                        kind: 'image',
                        fileName: file.name,
                        sourceWidth: result.sourceSize.width,
                        sourceHeight: result.sourceSize.height
                    },
                    imageSettings: result.options
                });
                imported++;
                particleCount += particles.length;
            } catch (error) {
                console.error(`[ImageImport] ${file.name}`, error);
                errors.push(`${file.name}：${error.message}`);
            }
        }

        if (imported > 0) {
            const suffix = errors.length > 0 ? `，${errors.length} 張失敗` : '';
            this.setStatus(`已匯入 ${imported} 張，共 ${particleCount.toLocaleString()} 顆粒子${suffix}`, errors.length ? 'warning' : 'success');
        } else {
            this.setStatus(errors[0] || '圖片匯入失敗。', 'error');
        }
        this.elements.imageInput.value = '';
        this.elements.folderInput.value = '';
    }
}

export default ImageImportController;
