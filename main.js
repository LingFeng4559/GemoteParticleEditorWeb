import * as THREE from 'three';
import StateManager from './js/StateManager.js';
import ThreeScene from './js/ThreeScene.js';
import UIManager from './js/UIManager.js';
import ProjectManager from './js/ProjectManager.js';
import LocalStorageManager from './js/LocalStorageManager.js';
import DrawingGroup from './js/DrawingGroup.js';
import CursorManager from './js/CursorManager.js';
import ToolPreview from './js/ToolPreview.js';
import BrushTool from './js/BrushTool.js';
import ShapeTool from './js/ShapeTool.js';
import SceneSync from './js/SceneSync.js';
import EraserTool from './js/EraserTool.js';
import SelectionManager from './js/SelectionManager.js';
import AnimationPreview from './js/AnimationPreview.js';
import MirrorManager from './js/MirrorManager.js';
import { reflectParticles } from './js/ReflectionUtil.js';

class App {
    constructor() {
        console.log('[App] 正在初始化...');
        this.canvas = document.querySelector('#scene-canvas');
        if (!this.canvas) console.error('[App] 找不到畫布元素 #scene-canvas');

        this.stateManager = new StateManager();
        this.sceneManager = new ThreeScene(this.canvas);
        this.uiManager = new UIManager(this.stateManager);
        this.projectManager = new ProjectManager(this.stateManager);
        this.localStorageManager = new LocalStorageManager(this.stateManager);
        this.cursorManager = new CursorManager(this.canvas);

        this.sceneSync = new SceneSync(this.stateManager, this.sceneManager);
        this.toolPreview = new ToolPreview(this.sceneManager);
        this.brushTool = new BrushTool(this.sceneManager);
        this.shapeTool = new ShapeTool(this.sceneManager);
        this.eraserTool = new EraserTool(this.stateManager, this.sceneManager, this.sceneSync);
        this.selectionManager = new SelectionManager(this.sceneManager, this.sceneSync);
        this.animationPreview = new AnimationPreview(this.stateManager, this.sceneSync);
        this.mirrorManager = new MirrorManager(this.sceneManager);

        this.BRUSH_RADIUS = 0.3;
        this.ERASER_RADIUS = 0.5;
        this.isCtrlPressed = false;

        console.log('[App] 正在連接模組...');
        this.connectModules();
        console.log('[App] 正在設定事件監聽...');
        this.setupEventListeners();
        console.log('[App] 正在讀取本地儲存...');
        this.initLocalStorage();
        console.log('[App] 初始化完成。');
    }

    connectModules() {
        this.uiManager.bindProjectManager(this.projectManager);
        this.uiManager.bindAnimationPreview(this.animationPreview);
        this.stateManager.subscribe(this.onStateChange.bind(this));
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // 禁用右鍵選單以利右鍵旋轉視角
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // 全域鍵盤監聽
        window.addEventListener('keydown', (e) => {
            const isCtrl = e.key === 'Control' || e.key === 'Meta';
            if (isCtrl) {
                this.isCtrlPressed = true;
                this.refreshPreview();
            }

            const isZ = e.key.toLowerCase() === 'z' || e.code === 'KeyZ';
            if ((e.ctrlKey || e.metaKey) && isZ) {
                // 排除輸入框
                const active = document.activeElement;
                const isTyping = active && (
                    ['INPUT', 'TEXTAREA'].includes(active.tagName) || 
                    active.isContentEditable
                );
                
                if (!isTyping) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    console.log('[Undo] 執行全域撤銷');
                    this.stateManager.undoLastPoint();
                    this.showUndoFeedback();
                }
            }
        }, { capture: true });

        window.addEventListener('keyup', (e) => {
            const isCtrl = e.key === 'Control' || e.key === 'Meta';
            if (isCtrl) {
                this.isCtrlPressed = false;
                this.refreshPreview();
            }
        });
    }

    refreshPreview() {
        // 模擬一個 mousemove 事件來更新預覽點位
        if (this.lastMouseMoveEvent) {
            this.handleMouseMove(this.lastMouseMoveEvent);
        }
    }

    showUndoFeedback() {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 153, 255, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 1.5s forwards;
        `;
        feedback.textContent = 'Undo ↩';
        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), 1500);
        
        // 加入簡單動畫樣式
        if (!document.getElementById('undo-anim-style')) {
            const style = document.createElement('style');
            style.id = 'undo-anim-style';
            style.textContent = `@keyframes fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-20px); } }`;
            document.head.appendChild(style);
        }
    }

    onStateChange(state) {
        // 網格大小
        if (this.sceneSync.lastGridSize !== state.gridSize) {
            this.sceneManager.updateGridSize(state.gridSize);
            this.sceneSync.lastGridSize = state.gridSize;
        }

        // 場景設定
        this.sceneManager.updateHeight(state.drawingHeight);
        this.sceneManager.updatePlaneRotation(state.planeRotation);
        this.sceneManager.updatePlaneOffset(state.planeOffset);
        this.sceneManager.updateCameraSensitivity(state.cameraSensitivity);
        this.sceneManager.updateCharacterMode(state.characterMode);
        
        // 由於左鍵旋轉已禁用，右鍵旋轉與中鍵縮放在任何模式下都不會干擾左鍵繪圖
        this.sceneManager.controls.enabled = true;

        this.cursorManager.updateCursor(state.currentMode);

        // 場景同步
        this.sceneSync.sync(state, { isDragging: this.selectionManager.isDragging });

        // 同步鏡面視覺
        this.mirrorManager.sync(state);

        // 選取狀態同步
        this.selectionManager.selectedGroupId = this.sceneSync.syncSelection(
            state,
            this.selectionManager.selectedGroupId,
            (newId) => { this.selectionManager.selectedGroupId = newId; }
        );

        // 清空時清理所有預覽
        if (this.sceneSync.isEmpty(state)) {
            this.brushTool.cleanup();
            this.eraserTool.clearPreview();
            this.toolPreview.clear();
            this.shapeTool.clearPreview();
        }
    }

    handleMouseDown(event) {
        if (this.animationPreview.isRunning()) this.animationPreview.stop();

        const state = this.stateManager.getState();
        const intersectPoint = this.sceneManager.getIntersectPoint(
            event, state.drawingHeight, state.planeRotation, state.planeOffset, this.isCtrlPressed
        );

        // 如果點擊在平台上且不是相機模式，進行繪圖並鎖定視角
        if (state.currentMode !== 'camera' && intersectPoint !== null) {
            this.sceneManager.setControlsEnabled(false);
            this.stateManager.setDrawing(true);
            this._executeDrawingAction(event, intersectPoint, state);
        } else {
            // 在平台外或相機模式下，啟用控制器以使用右鍵旋轉/左鍵平移
            this.sceneManager.setControlsEnabled(true);
        }
    }

    _executeDrawingAction(event, intersectPoint, state) {
        if (state.currentMode === 'pivot_pick') {
            this.stateManager.setMirrorPivot({ x: intersectPoint.x, y: intersectPoint.y, z: intersectPoint.z });
            this.stateManager.setMode('point'); 
            this.stateManager.setDrawing(false);
            this.sceneManager.setControlsEnabled(true);
            return;
        }

        switch (state.currentMode) {
            case 'select': this._handleSelectDown(event, intersectPoint, state); break;
            case 'point': this._handlePointDown(intersectPoint, state); break;
            case 'brush':
                this.brushTool.startStroke(intersectPoint, state);
                this.stateManager.setLastPointPosition(intersectPoint);
                break;
            case 'eraser':
                this.eraserTool.eraseAtPosition(intersectPoint);
                this.eraserTool.clearPreview();
                break;
            case 'rectangle':
            case 'circle':
                this.shapeTool.startShape(intersectPoint);
                break;
        }
    }

    handleMouseMove(event) {
        this.lastMouseMoveEvent = event;
        const state = this.stateManager.getState();
        
        // 若正在繪圖，完全阻斷滑鼠事件傳播，避免視角移動
        if (state.isDrawing) {
            event.preventDefault();
            event.stopPropagation();
            this.sceneManager.controls.enabled = false;
        }

        const intersectPoint = this.sceneManager.getIntersectPoint(
            event, state.drawingHeight, state.planeRotation, state.planeOffset, this.isCtrlPressed
        );

        // 工具預覽（點、筆刷、方形、圓形、橡皮擦）
        const drawModes = ['point', 'brush', 'rectangle', 'circle'];
        if (state.currentMode === 'eraser') {
            if (intersectPoint) {
                this.toolPreview.show(intersectPoint, 'eraser', this.ERASER_RADIUS);
                this.eraserTool.updatePreview(intersectPoint);
            } else {
                this.toolPreview.clear();
                this.eraserTool.clearPreview();
            }
        } else if (drawModes.includes(state.currentMode)) {
            if (intersectPoint) {
                // 如果正在繪製形狀，由 ShapeTool 負責大的預覽；否則顯示吸附點預覽
                const isDrawingShape = state.isDrawing && (state.currentMode === 'rectangle' || state.currentMode === 'circle');
                if (!isDrawingShape) {
                    const radius = state.currentMode === 'brush' ? this.BRUSH_RADIUS : 0.12;
                    this.toolPreview.show(intersectPoint, state.currentMode, radius);
                } else {
                    this.toolPreview.clear();
                }
            } else {
                this.toolPreview.clear();
            }
        } else {
            this.toolPreview.clear();
            this.eraserTool.clearPreview();
        }

        // 框選更新
        if (this.selectionManager.isMarqueeActive) {
            this.selectionManager.updateMarquee({ x: event.clientX, y: event.clientY });
            return;
        }

        // 選擇模式拖動
        if (state.currentMode === 'select' && this.selectionManager.isDragging && this.selectionManager.selectedGroupId) {
            this.selectionManager.updateDrag(event);
            return;
        }

        if (!state.isDrawing || !intersectPoint) return;

        switch (state.currentMode) {
            case 'brush': {
                const result = this.brushTool.continueStroke(intersectPoint, state, state.lastPointPosition);
                if (result) this.stateManager.setLastPointPosition(intersectPoint);
                break;
            }
            case 'eraser':
                this.eraserTool.eraseAtPosition(intersectPoint);
                break;
            case 'rectangle':
            case 'circle':
                if (this.shapeTool.isActive()) {
                    this.shapeTool.updatePreview(intersectPoint, state.currentMode);
                }
                break;
        }
    }

    handleMouseUp(event) {
        const state = this.stateManager.getState();
        
        // 總是在 MouseUp 時恢復相機控制
        this.sceneManager.setControlsEnabled(true);

        // 完成框選
        if (this.selectionManager.isMarqueeActive) {
            const selectedIds = this.selectionManager.finishMarquee({ x: event.clientX, y: event.clientY });
            this.selectionManager.clearSelection();
            if (selectedIds.length > 0) {
                this.selectionManager.setMultiSelection(selectedIds);
                this.stateManager.setSelectedGroup({ id: selectedIds[0] });
            } else {
                this.stateManager.setSelectedGroup(null);
            }
            this.selectionManager.clearDrag();
        }

        // 選擇模式拖動提交
        if (state.currentMode === 'select' && this.selectionManager.isDragging && this.selectionManager.selectedGroupId) {
            this.selectionManager.commitDrag(this.stateManager);
            this.selectionManager.clearDrag();
        }

        // 筆刷完成
        if (state.currentMode === 'brush') {
            const group = this.brushTool.finishStroke();
            if (group) {
                this.stateManager.addGroup(group.toJSON());
            }
        } else {
            this.brushTool.cancelStroke();
        }

        // 形狀完成
        if ((state.currentMode === 'rectangle' || state.currentMode === 'circle') && this.shapeTool.isActive()) {
            const intersectPoint = this.sceneManager.getIntersectPoint(
                event, state.drawingHeight, state.planeRotation, state.planeOffset
            );
            if (intersectPoint) {
                const group = this.shapeTool.createShape(intersectPoint, state.currentMode, state);
                if (group) this.stateManager.addGroup(group.toJSON());
            }
            this.shapeTool.clearPreview();
        }

        this.stateManager.setDrawing(false);
        this.stateManager.setLastPointPosition(null);
    }

    // === 選取模式輔助 ===

    _handleSelectDown(event, intersectPoint, state) {
        const picked = this.selectionManager.pickGroupUnderCursor(event);

        if (picked) {
            const { group } = picked;

            // 清除舊選取視覺
            if (this.selectionManager.selectedGroupId && this.selectionManager.selectedGroupId !== group.id) {
                const prev = this.sceneSync.getGroup(this.selectionManager.selectedGroupId);
                if (prev) prev.hideSelection(this.sceneManager.scene);
            }

            this.selectionManager.selectGroup(group.id);
            this.stateManager.setSelectedGroup({ id: group.id });
            this.selectionManager.beginDrag(event, group);
        } else {
            // 檢查是否點在已選取群組邊界內
            const idsToCheck = this.selectionManager.multiSelectedGroupIds.size > 0
                ? Array.from(this.selectionManager.multiSelectedGroupIds)
                : (this.selectionManager.selectedGroupId ? [this.selectionManager.selectedGroupId] : []);
            const idsUnderRay = this.selectionManager.getSelectedIdsHitByRay(event, idsToCheck);

            if (idsUnderRay.length > 0) {
                this.selectionManager.beginDragExisting(event, idsToCheck);
            } else {
                // 點擊空白處：開始框選
                this.selectionManager.clearSelection();
                this.selectionManager.beginMarquee({ x: event.clientX, y: event.clientY });
                this.selectionManager.clearDrag();
                this.stateManager.setSelectedGroup(null);
            }
        }
    }

    _handlePointDown(intersectPoint, state) {
        const pointData = {
            id: crypto.randomUUID(),
            x: intersectPoint.x, y: intersectPoint.y, z: intersectPoint.z,
            particleType: state.particleType, color: state.particleColor
        };

        const mirrorSettings = this.getMirrorSettings(state);

        const allParticles = reflectParticles([pointData], mirrorSettings);
        const group = new DrawingGroup({
            type: 'point',
            particles: allParticles,
            particleType: state.particleType,
            color: state.particleColor,
            isAnimated: !!state.animationEnabled
        });
        this.stateManager.addGroup(group.toJSON());
        this.stateManager.setDrawing(false);
    }

    getMirrorSettings(state) {
        return {
            horizontalX: state.horizontalMirrorEnabled,
            horizontalZ: state.horizontalMirrorZEnabled,
            vertical: state.verticalMirrorEnabled,
            mirrorPivot: state.mirrorPivot,
            radialSymmetryEnabled: state.radialSymmetryEnabled,
            radialSymmetryAxis: state.radialSymmetryAxis,
            radialSymmetryMode: state.radialSymmetryMode,
            radialSymmetryCount: state.radialSymmetryCount,
            radialSymmetryOffset: state.radialSymmetryOffset,
            planeRotation: state.planeRotation
        };
    }

    initLocalStorage() {
        this.localStorageManager.init();
        const storageInfo = this.localStorageManager.getStorageInfo();
        if (storageInfo) {
            console.log(`[Storage] 使用量: ${storageInfo.totalSize}MB (約 ${storageInfo.usage}%)`);
        }
    }
}

new App();
