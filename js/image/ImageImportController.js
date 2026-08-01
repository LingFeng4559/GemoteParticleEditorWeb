import * as THREE from 'three';
import { convertImageDataToParticles } from './ImageParticleConverter.js';
import AssetLibraryPanel from './AssetLibraryPanel.js';

class ImageImportController {
    constructor(stateManager, sceneManager, elements) {
        this.stateManager = stateManager;
        this.sceneManager = sceneManager;
        this.elements = elements;
        this.assetLibrary = new AssetLibraryPanel(elements.status, file => this.prepareFiles([file], { storeAssets: false }));
        this.workerRequests = new Map();
        this.setupEvents();
        this.stateManager.subscribe(() => this.updatePreviewTransform());
    }

    setupEvents() {
        this.elements.imageButton?.addEventListener('click', () => this.elements.imageInput?.click());
        this.elements.folderButton?.addEventListener('click', () => this.elements.folderInput?.click());
        this.elements.imageInput?.addEventListener('change', event => this.prepareFiles(event.target.files));
        this.elements.folderInput?.addEventListener('change', event => this.prepareFiles(event.target.files));
        this.elements.confirmButton?.addEventListener('click', () => this.confirmConversion());
        this.elements.cancelButton?.addEventListener('click', () => this.cancelPlacement());
        this.elements.scaleDownButton?.addEventListener('click', () => this.adjustPreviewSize(1 / 1.15));
        this.elements.scaleUpButton?.addEventListener('click', () => this.adjustPreviewSize(1.15));
        [this.elements.worldWidth, this.elements.positionX, this.elements.positionY]
            .forEach(element => element?.addEventListener('input', () => this.updatePreviewTransform()));
        const canvas = this.sceneManager.canvas;
        canvas?.addEventListener('mousedown', event => {
            if (!this.previewMesh) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            this.isPlacing = true;
            this.updatePositionFromPointer(event);
        }, { capture: true });
        canvas?.addEventListener('mousemove', event => {
            if (!this.isPlacing || !this.previewMesh) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            this.updatePositionFromPointer(event);
        }, { capture: true });
        window.addEventListener('mouseup', event => {
            if (!this.isPlacing) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            this.isPlacing = false;
        }, { capture: true });
        canvas?.addEventListener('wheel', event => {
            if (!this.previewMesh) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            this.adjustPreviewSize(event.deltaY < 0 ? 1.1 : 1 / 1.1);
        }, { capture: true, passive: false });
    }

    getOptions(imageData) {
        const state = this.stateManager.getState();
        const sampleStep = Math.max(1, Number(this.elements.sampleStep?.value) || 1);
        const sampledWidth = Math.ceil(imageData.width / sampleStep);
        const worldWidth = Math.max(0.1, Number(this.elements.worldWidth?.value) || 4);
        return {
            alphaThreshold: Math.max(0, Math.min(255, Number(this.elements.alphaThreshold?.value) || 0)),
            sampleStep,
            spacing: worldWidth / Math.max(1, sampledWidth - 1),
            plane: 'XY',
            colorMode: this.elements.colorMode?.value || 'single',
            singleColor: state.particleColor,
            particleType: (this.elements.colorMode?.value || 'single') === 'source' ? 'redstone' : state.particleType
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
            const limit = Math.max(0, Number(outputWidth) || 0);
            const scale = limit > 0 ? Math.min(1, limit / bitmap.width) : 1;
            const width = Math.max(1, Math.round(bitmap.width * scale));
            const height = Math.max(1, Math.round(bitmap.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.clearRect(0, 0, width, height);
            context.drawImage(bitmap, 0, 0, width, height);
            return context.getImageData(0, 0, width, height);
        } finally {
            bitmap.close();
        }
    }

    getWorker() {
        if (!globalThis.Worker) return null;
        if (this.worker) return this.worker;
        this.worker = new Worker(new URL('./image-converter.worker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = event => {
            const request = this.workerRequests.get(event.data.id);
            if (!request) return;
            this.workerRequests.delete(event.data.id);
            event.data.error ? request.reject(new Error(event.data.error)) : request.resolve(event.data.result);
        };
        this.worker.onerror = () => { this.worker?.terminate(); this.worker = null; };
        return this.worker;
    }

    convertAsync(imageData, options) {
        const worker = this.getWorker();
        if (!worker) return Promise.resolve(convertImageDataToParticles(imageData, options));
        const id = crypto.randomUUID();
        return new Promise((resolve, reject) => {
            this.workerRequests.set(id, { resolve, reject });
            worker.postMessage({ id, imageData, options });
        });
    }

    async prepareFiles(fileList, { storeAssets = true } = {}) {
        const files = Array.from(fileList || []).filter(file => file.type.startsWith('image/'));
        if (!files.length) {
            this.setStatus('沒有找到可讀取的圖片。', 'error');
            return false;
        }
        if (storeAssets) {
            try { await this.assetLibrary.addFiles(files); }
            catch (error) { this.setStatus(`素材庫：${error.message}`, 'warning'); }
        }
        try {
            await this.prepareFile(files[0]);
        } catch (error) {
            console.error('[ImagePlacement]', error);
            this.cancelPlacement({ preserveStatus: true });
            this.setStatus(`無法建立圖片預覽：${error.message}`, 'error');
            return false;
        }
        if (files.length > 1) this.setStatus(`已載入 ${files[0].name}；請逐張確認位置後轉換。`, 'warning');
        return true;
    }

    async prepareFile(file) {
        this.cancelPlacement();
        this.currentFile = file;
        const bitmap = await createImageBitmap(file);
        this.sourceSize = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        this.previewUrl = URL.createObjectURL(file);
        this.elements.thumbnail.src = this.previewUrl;
        this.elements.placementName.textContent = file.name;
        this.elements.placement.hidden = false;
        this.elements.positionX.value = '0';
        this.elements.positionY.value = '0';
        this.setStatus('步驟 2：在 3D 視窗選擇 XZ 位置；滾輪可縮放圖片。');
        await this.createPreviewMesh();
    }

    createPreviewMesh() {
        return new Promise((resolve, reject) => {
            new THREE.TextureLoader().load(this.previewUrl, texture => {
                texture.colorSpace = THREE.SRGBColorSpace;
                this.previewTexture = texture;
                const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
                const material = new THREE.MeshBasicMaterial({
                    map: texture, transparent: true, opacity: 0.72,
                    side: THREE.DoubleSide, depthTest: false
                });
                this.previewMesh = new THREE.Mesh(geometry, material);
                this.previewMesh.renderOrder = 30;
                this.sceneManager.scene.add(this.previewMesh);
                this.updatePreviewTransform();
                resolve();
            }, undefined, reject);
        });
    }

    updatePreviewTransform() {
        if (!this.previewMesh || !this.sourceSize) return;
        const width = Math.max(0.1, Number(this.elements.worldWidth?.value) || 4);
        const height = width * this.sourceSize.height / this.sourceSize.width;
        const horizontal = Number(this.elements.positionX?.value) || 0;
        const vertical = Number(this.elements.positionY?.value) || 0;
        const { plane, normal, planeToWorld } = this.sceneManager.getDrawingPlaneInfo();
        this.previewMesh.scale.set(width, 1, height);
        this.previewMesh.quaternion.copy(plane.quaternion);
        this.previewMesh.position.copy(
            planeToWorld(new THREE.Vector3(horizontal, 0, vertical)).add(normal.clone().multiplyScalar(0.025))
        );
    }

    adjustPreviewSize(factor) {
        const current = Math.max(0.1, Number(this.elements.worldWidth?.value) || 4);
        const next = Math.max(0.1, Math.min(100, current * factor));
        this.elements.worldWidth.value = String(Math.round(next * 100) / 100);
        this.updatePreviewTransform();
    }

    updatePositionFromPointer(event) {
        const state = this.stateManager.getState();
        const world = this.sceneManager.getIntersectPoint(
            event, state.drawingHeight, state.planeRotation, state.planeOffset, false
        );
        if (!world) return;
        const { worldToPlane } = this.sceneManager.getDrawingPlaneInfo();
        const local = worldToPlane(world);
        this.elements.positionX.value = local.x.toFixed(2);
        this.elements.positionY.value = local.z.toFixed(2);
        this.updatePreviewTransform();
    }

    async confirmConversion() {
        if (!this.currentFile) return false;
        this.elements.confirmButton.disabled = true;
        this.setStatus('正在依照目前構圖轉換粒子…');
        try {
            const imageData = await this.decodeFile(this.currentFile, this.elements.outputWidth?.value);
            const options = this.getOptions(imageData);
            const estimatedSamples = Math.ceil(imageData.width / options.sampleStep) * Math.ceil(imageData.height / options.sampleStep);
            if (estimatedSamples > 500000 && !confirm(`原圖將取樣約 ${estimatedSamples.toLocaleString()} 個像素，可能需要較長時間。確定繼續嗎？`)) {
                this.setStatus('已保留圖片構圖；可提高取樣間隔後再轉換。', 'warning');
                return false;
            }
            const result = await this.convertAsync(imageData, options);
            if (!result.particles.length) throw new Error('沒有像素通過目前的透明度門檻');
            const horizontal = Number(this.elements.positionX?.value) || 0;
            const vertical = Number(this.elements.positionY?.value) || 0;
            const { planeToWorld } = this.sceneManager.getDrawingPlaneInfo();
            const particles = result.particles.map(particle => {
                const world = planeToWorld(new THREE.Vector3(particle.x + horizontal, 0, particle.y + vertical));
                return { ...particle, id: crypto.randomUUID(), x: world.x, y: world.y, z: world.z };
            });
            const id = crypto.randomUUID();
            this.stateManager.addGroup({
                id, type: 'image', layerKind: 'content',
                name: this.currentFile.name.replace(/\.[^.]+$/, ''), particles,
                particleType: options.particleType, color: options.singleColor,
                source: {
                    kind: 'image', fileName: this.currentFile.name,
                    sourceWidth: this.sourceSize.width, sourceHeight: this.sourceSize.height
                },
                imageSettings: {
                    ...result.options,
                    worldWidth: Number(this.elements.worldWidth?.value) || 4,
                    platformOffset: { horizontal, vertical },
                    followsDrawingPlatform: true
                }
            });
            this.stateManager.setSelectedGroup({ id });
            this.stateManager.setMode('select');
            this.setStatus(`轉換完成：${particles.length.toLocaleString()} 個粒子。`, 'success');
            this.cancelPlacement({ preserveStatus: true });
            return true;
        } catch (error) {
            console.error('[ImageImport]', error);
            this.setStatus(`圖片轉換失敗：${error.message}`, 'error');
            return false;
        } finally {
            this.elements.confirmButton.disabled = false;
        }
    }

    cancelPlacement({ preserveStatus = false } = {}) {
        if (this.previewMesh) {
            this.sceneManager.scene.remove(this.previewMesh);
            this.previewMesh.geometry.dispose();
            this.previewMesh.material.dispose();
        }
        this.previewTexture?.dispose();
        if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
        this.previewMesh = null;
        this.previewTexture = null;
        this.previewUrl = null;
        this.currentFile = null;
        this.sourceSize = null;
        this.isPlacing = false;
        if (this.elements.placement) this.elements.placement.hidden = true;
        if (this.elements.imageInput) this.elements.imageInput.value = '';
        if (this.elements.folderInput) this.elements.folderInput.value = '';
        if (!preserveStatus) this.setStatus('步驟 1：載入圖片。圖片不會立即轉成粒子。');
    }

    importFiles(fileList, options) {
        return this.prepareFiles(fileList, options);
    }
}

export default ImageImportController;
