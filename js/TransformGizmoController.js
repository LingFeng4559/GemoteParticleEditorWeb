import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { isLayerContainer } from './LayerModel.js';
import { normalizeTransform } from './animation/AnimationModel.js';

class TransformGizmoController {
    constructor(stateManager, sceneManager) {
        this.stateManager = stateManager; this.sceneManager = sceneManager;
        this.target = new THREE.Object3D(); sceneManager.scene.add(this.target);
        this.controls = new TransformControls(sceneManager.camera, sceneManager.renderer.domElement);
        this.controls.setMode('translate'); this.controls.setSpace('world'); sceneManager.scene.add(this.controls);
        this.controls.addEventListener('dragging-changed', event => {
            this.dragging = event.value; sceneManager.controls.enabled = !event.value;
            if (event.value) stateManager.captureHistory();
        });
        this.controls.addEventListener('objectChange', () => this.commitPreview());
        this.buildToolbar();
        window.addEventListener('workspaceChanged', event => {
            this.previewMode = ['preview', 'export'].includes(event.detail?.workspace);
            this.sync(this.stateManager.getState());
        });
    }

    buildToolbar() {
        this.toolbar = document.createElement('div'); this.toolbar.className = 'gizmo-toolbar';
        this.toolbar.innerHTML = `<strong>3D Gizmo</strong><button data-mode="translate">移動</button><button data-mode="rotate">旋轉</button><button data-mode="scale">縮放</button><select><option value="world">World</option><option value="local">Local</option></select>`;
        document.body.appendChild(this.toolbar);
        this.toolbar.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => { this.controls.setMode(button.dataset.mode); this.updateToolbar(); }));
        this.toolbar.querySelector('select').addEventListener('change', event => this.controls.setSpace(event.target.value)); this.updateToolbar();
    }

    updateToolbar() { this.toolbar.querySelectorAll('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === this.controls.getMode())); }

    commitPreview() {
        const layer = this.stateManager.drawingGroups.find(item => item.id === this.layerId); if (!layer) return;
        const transform = normalizeTransform(layer.transform);
        transform.position = { x: this.target.position.x - transform.pivot.x, y: this.target.position.y - transform.pivot.y, z: this.target.position.z - transform.pivot.z };
        transform.rotation = { x: THREE.MathUtils.radToDeg(this.target.rotation.x), y: THREE.MathUtils.radToDeg(this.target.rotation.y), z: THREE.MathUtils.radToDeg(this.target.rotation.z) };
        transform.scale = { x: this.target.scale.x, y: this.target.scale.y, z: this.target.scale.z };
        this.stateManager.updateLayerAnimation(layer.id, { transform }, { recordHistory: false });
    }

    sync(state) {
        if (this.dragging) return;
        const layer = state.drawingGroups.find(item => item.id === state.selectedGroup?.id);
        if (this.previewMode || !layer || isLayerContainer(layer) || layer.locked) { this.layerId = null; this.controls.detach(); this.toolbar.classList.remove('visible'); return; }
        this.layerId = layer.id; const transform = normalizeTransform(layer.transform);
        this.target.position.set(transform.position.x + transform.pivot.x, transform.position.y + transform.pivot.y, transform.position.z + transform.pivot.z);
        this.target.rotation.set(THREE.MathUtils.degToRad(transform.rotation.x), THREE.MathUtils.degToRad(transform.rotation.y), THREE.MathUtils.degToRad(transform.rotation.z));
        this.target.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
        this.controls.attach(this.target); this.toolbar.classList.add('visible');
    }
}

export default TransformGizmoController;
