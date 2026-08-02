import { migrateProject } from './ProjectSchema.js';
import { getLayerDescendantIds, normalizeLayer, normalizeLayers } from './LayerModel.js';
import { normalizeParticleDensity } from './DensityModel.js';

class StateManager {
    constructor() {
        this.particlePoints = [];
        this.drawingGroups = []; // 新增：儲存繪圖群組
        this.currentMode = 'camera'; // 'camera', 'select', 'point', 'brush', 'eraser', 'rectangle', 'circle'
        this.eraserMode = 'point'; // 新增：橡皮擦模式 'point' 或 'group'
        this.shapeFillMode = 'filled'; // 新增：圖形填充模式 'filled' 或 'outline'
        this.drawingHeight = 0;
        this.planeRotation = { x: 0, y: 0, z: 0 };
        this.planeOffset = { x: 0, z: 0 }; // 新增：平面偏移
        this.cameraSensitivity = 1.0;
        this.particleType = 'flame';
        this.particleColor = '#ff0000';
        this.isDrawing = false;
        this.lastPointPosition = null;
        this.hasUnsavedChanges = false;
        this.currentProjectName = '未命名專案';
        this.skillId = 'GemoteParticle'; // 預設匯出為 GemoteParticle.yml
        this.gridSize = 10; // 新增：網格大小
        this.selectedGroup = null; // 新增：當前選中的群組
        this.animationEnabled = false; // 動畫效果：依粒子順序加入 -delay
        this.animationTickInterval = 1; // 每個粒子間隔的 tick 數
        this.horizontalMirrorEnabled = false; // 水平鏡像 (X)
        this.horizontalMirrorZEnabled = false; // 水平鏡像 (Z)
        this.verticalMirrorEnabled = false; // 垂直鏡像 (Y)
        this.mirrorPivot = { x: 0, y: 0, z: 0 }; // 鏡像中心點
        this.pivotFollowsPlane = true; // 鏡像中心是否跟隨平台中心
        this.radialSymmetryEnabled = false; // 放射鏡像
        this.radialSymmetryAxis = 'Y'; // 放射旋轉軸 (X, Y, Z)
        this.radialSymmetryMode = 'equal'; // 模式: 'equal' (均分), 'fixed' (固定間隔)
        this.radialSymmetryCount = 4; // 鏡像數量 (2-16)
        this.radialSymmetryOffset = 0; // 起始角度偏移
        this.particleDensity = 1.0; // 粒子密度 (用於形狀工具)
        this.characterMode = 'opaque'; // 參考角色模式: 'opaque', 'ghost', 'hidden'
        this.loop = 0; // Gemote 循環次數
        this.head = false; // Gemote 是否從頭部高度播放
        this.timelineTick = 0;
        this.timelineFrameInterval = 1;
        this.timelineFrameCount = 80;
        this.timelineRetimingVersion = 2;
        this.timelineDuration = 80;
        this.timelinePlaying = false;

        // 監聽器
        this.listeners = [];
        this.undoStack = [];
        this.redoStack = [];
        this.historyLimit = 50;
        this._restoringHistory = false;
    }

    createHistorySnapshot() {
        const clean = value => JSON.parse(JSON.stringify(value, (key, item) =>
            ['sphereMesh', 'lineSegment', 'meshes', 'boundingBox', 'resizeHandles'].includes(key) ? undefined : item
        ));
        return clean({ particlePoints: this.particlePoints, drawingGroups: this.drawingGroups, selectedGroupId: this.selectedGroup?.id || null });
    }

    captureHistory() {
        if (this._restoringHistory) return;
        this.undoStack.push(this.createHistorySnapshot());
        if (this.undoStack.length > this.historyLimit) this.undoStack.shift();
        this.redoStack = [];
    }

    restoreHistorySnapshot(snapshot) {
        this._restoringHistory = true;
        this.particlePoints = snapshot.particlePoints || [];
        this.drawingGroups = normalizeLayers(snapshot.drawingGroups || []);
        this.selectedGroup = this.drawingGroups.find(layer => layer.id === snapshot.selectedGroupId) || null;
        this._restoringHistory = false;
        this.hasUnsavedChanges = true;
        this.notify();
    }

    undo() {
        const snapshot = this.undoStack.pop();
        if (!snapshot) return false;
        this.redoStack.push(this.createHistorySnapshot());
        this.restoreHistorySnapshot(snapshot);
        return true;
    }

    redo() {
        const snapshot = this.redoStack.pop();
        if (!snapshot) return false;
        this.undoStack.push(this.createHistorySnapshot());
        this.restoreHistorySnapshot(snapshot);
        return true;
    }

    // --- 訂閱/發布模式，用於狀態變更通知 ---
    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.getState()));
    }

    // --- 狀態獲取 ---
    getState() {
        return {
            particlePoints: this.particlePoints,
            drawingGroups: this.drawingGroups,
            currentMode: this.currentMode,
            eraserMode: this.eraserMode,
            shapeFillMode: this.shapeFillMode,
            drawingHeight: this.drawingHeight,
            planeRotation: this.planeRotation,
            planeOffset: this.planeOffset,
            cameraSensitivity: this.cameraSensitivity,
            particleType: this.particleType,
            particleColor: this.particleColor,
            isDrawing: this.isDrawing,
            lastPointPosition: this.lastPointPosition,
            hasUnsavedChanges: this.hasUnsavedChanges,
            currentProjectName: this.currentProjectName,
            skillId: this.skillId,
            gridSize: this.gridSize,
            selectedGroup: this.selectedGroup,
            animationEnabled: this.animationEnabled,
            animationTickInterval: this.animationTickInterval,
            horizontalMirrorEnabled: this.horizontalMirrorEnabled,
            horizontalMirrorZEnabled: this.horizontalMirrorZEnabled,
            verticalMirrorEnabled: this.verticalMirrorEnabled,
            mirrorPivot: this.mirrorPivot,
            pivotFollowsPlane: this.pivotFollowsPlane,
            radialSymmetryEnabled: this.radialSymmetryEnabled,
            radialSymmetryAxis: this.radialSymmetryAxis,
            radialSymmetryMode: this.radialSymmetryMode,
            radialSymmetryCount: this.radialSymmetryCount,
            radialSymmetryOffset: this.radialSymmetryOffset,
            particleDensity: this.particleDensity,
            characterMode: this.characterMode,
            loop: this.loop,
            head: this.head,
            timelineTick: this.timelineTick,
            timelineFrameInterval: this.timelineFrameInterval,
            timelineFrameCount: this.timelineFrameCount,
            timelineRetimingVersion: this.timelineRetimingVersion,
            timelineDuration: this.timelineDuration,
            timelinePlaying: this.timelinePlaying,
            usedColors: this.getUsedColors(),
        };
    }

    // --- 取得已使用的顏色列表 ---
    getUsedColors() {
        const colors = new Set();
        // 舊系統：獨立粒子點
        this.particlePoints.forEach(point => {
            if ((point.particleType === 'reddust' || point.particleType === 'redstone') && point.color) {
                colors.add(point.color);
            }
        });
        // 新系統：繪圖群組（從群組與其粒子收集顏色）
        this.drawingGroups.forEach(group => {
            if (group.color) colors.add(group.color);
            if (Array.isArray(group.particles)) {
                group.particles.forEach(p => {
                    if (p && (p.particleType === 'reddust' || p.particleType === 'redstone') && p.color) {
                        colors.add(p.color);
                    }
                });
            }
        });
        return Array.from(colors).sort();
    }

    // --- 狀態修改 ---
    setMode(mode) {
        this.currentMode = mode;
        this.notify();
    }

    setEraserMode(mode) {
        this.eraserMode = mode;
        this.notify();
    }

    setShapeFillMode(mode) {
        this.shapeFillMode = mode;
        this.notify();
    }

    setDrawing(isDrawing) {
        this.isDrawing = isDrawing;
        this.notify();
    }

    setLastPointPosition(position) {
        this.lastPointPosition = position;
        // We don't notify here, as this is an internal state for the brush stroke
    }

    setDrawingHeight(height) {
        this.drawingHeight = height;
        if (this.pivotFollowsPlane) {
            this.mirrorPivot.y = height;
        }
        this.notify();
    }

    setPlaneRotation(rotation) {
        this.planeRotation = rotation;
        this.notify();
    }

    setPlaneOffset(offset) {
        this.planeOffset = offset;
        if (this.pivotFollowsPlane) {
            this.mirrorPivot.x = offset.x;
            this.mirrorPivot.z = offset.z;
        }
        this.notify();
    }

    setCameraSensitivity(sensitivity) {
        this.cameraSensitivity = sensitivity;
        this.notify();
    }

    setParticleSettings(type, color) {
        this.particleType = type;
        this.particleColor = color;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setProjectName(name) {
        this.currentProjectName = name;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setSkillId(skillId) {
        this.skillId = skillId;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setGridSize(size) {
        this.gridSize = size;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setSelectedGroup(group) {
        this.selectedGroup = group;
        this.notify();
    }

    setAnimationEnabled(enabled) {
        this.animationEnabled = !!enabled;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setAnimationTickInterval(ticks) {
        const v = parseInt(ticks);
        const n = Math.max(0, Math.min(30, Number.isFinite(v) ? v : 1));
        this.animationTickInterval = n;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setGroupTickInterval(groupId, ticks) {
        const group = this.drawingGroups.find(g => g.id === groupId);
        if (!group) return;
        if (ticks === null || ticks === undefined || ticks === '') {
            delete group.tickInterval;
        } else {
            const v = parseFloat(ticks);
            if (!Number.isFinite(v)) return;
            group.tickInterval = Math.round(Math.max(0.1, v) * 100) / 100;
        }
        this.setUnsavedChanges(true);
        this.notify();
    }

    setLoop(loop) {
        this.loop = parseInt(loop) || 0;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setHead(head) {
        this.head = !!head;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setTimelineTick(tick) {
        const value = Number(tick);
        const lastFrameTick = Math.max(0, this.timelineDuration - this.timelineFrameInterval);
        this.timelineTick = Math.max(0, Math.min(lastFrameTick, Number.isFinite(value) ? value : 0));
        this.notify();
    }

    setTimelineDuration(duration) {
        const value = Number(duration);
        const requestedDuration = Math.max(1, Math.round(Number.isFinite(value) ? value : 80));
        const previousDuration = this.timelineDuration;
        this.timelineFrameCount = Math.max(2, Math.round(requestedDuration / this.timelineFrameInterval));
        this.timelineDuration = this.timelineFrameInterval * this.timelineFrameCount;
        this.retimeTimeline(previousDuration, this.timelineDuration);
        this.timelineTick = Math.min(this.timelineTick, this.timelineDuration - this.timelineFrameInterval);
        this.setUnsavedChanges(true);
        this.notify();
    }

    setTimelineFrameSettings(interval, frameCount) {
        const previousDuration = this.timelineDuration;
        this.timelineFrameInterval = Math.max(1, Math.round(Number(interval) || 1));
        this.timelineFrameCount = Math.max(2, Math.round(Number(frameCount) || 2));
        this.timelineDuration = this.timelineFrameInterval * this.timelineFrameCount;
        this.retimeTimeline(previousDuration, this.timelineDuration);
        this.timelineTick = Math.min(this.timelineTick, this.timelineDuration - this.timelineFrameInterval);
        this.setUnsavedChanges(true);
        this.notify();
    }

    retimeTimeline(previousDuration, nextDuration) {
        const oldDuration = Math.max(1, Number(previousDuration) || 1);
        const newDuration = Math.max(1, Number(nextDuration) || 1);
        if (oldDuration === newDuration) return;
        const scaleTick = value => (Number(value) || 0) * newDuration / oldDuration;
        this.drawingGroups = normalizeLayers(this.drawingGroups.map(layer => ({
            ...layer,
            timing: layer.timing ? {
                ...layer.timing,
                startTick: scaleTick(layer.timing.startTick),
                duration: Math.max(1, scaleTick(layer.timing.duration ?? oldDuration))
            } : layer.timing,
            tracks: (layer.tracks || []).map(track => ({
                ...track,
                keyframes: (track.keyframes || []).map(keyframe => ({ ...keyframe, tick: scaleTick(keyframe.tick) }))
            })),
            modifiers: (layer.modifiers || []).map(modifier => ({
                ...modifier,
                startTick: scaleTick(modifier.startTick),
                ...(modifier.duration === undefined ? {} : { duration: Math.max(1, scaleTick(modifier.duration)) }),
                ...(modifier.type === 'noise' && modifier.frequency !== undefined
                    ? { frequency: Number(modifier.frequency) * oldDuration / newDuration }
                    : {})
            }))
        })));
        if (this.selectedGroup) this.selectedGroup = this.drawingGroups.find(layer => layer.id === this.selectedGroup.id) || null;
        this.timelineTick = scaleTick(this.timelineTick);
    }

    getTimelineContentDuration() {
        let extent = 0;
        for (const layer of this.drawingGroups) {
            for (const modifier of layer.modifiers || []) {
                if (modifier.duration !== undefined) extent = Math.max(extent, (Number(modifier.startTick) || 0) + (Number(modifier.duration) || 0));
            }
            for (const track of layer.tracks || []) {
                for (const keyframe of track.keyframes || []) extent = Math.max(extent, Number(keyframe.tick) || 0);
            }
        }
        return extent;
    }

    setTimelinePlaying(playing) {
        this.timelinePlaying = !!playing;
        this.notify();
    }

    updateLayerAnimation(layerId, updates, { recordHistory = true } = {}) {
        const layer = this.drawingGroups.find(group => group.id === layerId);
        if (!layer) return false;
        if (recordHistory) this.captureHistory();
        for (const key of ['transform', 'timing', 'tracks', 'modifiers']) {
            if (Object.prototype.hasOwnProperty.call(updates, key)) layer[key] = updates[key];
        }
        this.drawingGroups = normalizeLayers(this.drawingGroups);
        this.selectedGroup = this.drawingGroups.find(group => group.id === layerId) || null;
        this.setUnsavedChanges(true);
        this.notify();
        return true;
    }

    setHorizontalMirrorEnabled(enabled) {
        this.horizontalMirrorEnabled = !!enabled;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setHorizontalMirrorZEnabled(enabled) {
        this.horizontalMirrorZEnabled = !!enabled;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setVerticalMirrorEnabled(enabled) {
        this.verticalMirrorEnabled = !!enabled;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setMirrorPivot(pivot, isManual = true) {
        if (isManual) {
            this.pivotFollowsPlane = false;
        }
        this.mirrorPivot = { ...this.mirrorPivot, ...pivot };
        this.setUnsavedChanges(true);
        this.notify();
    }

    setPivotFollowsPlane(enabled) {
        this.pivotFollowsPlane = !!enabled;
        if (this.pivotFollowsPlane) {
            this.mirrorPivot = { x: this.planeOffset.x, y: this.drawingHeight, z: this.planeOffset.z };
        }
        this.setUnsavedChanges(true);
        this.notify();
    }

    setRadialSymmetryEnabled(enabled) {
        this.radialSymmetryEnabled = !!enabled;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setRadialSymmetryAxis(axis) {
        this.radialSymmetryAxis = axis;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setRadialSymmetryMode(mode) {
        this.radialSymmetryMode = mode;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setRadialSymmetryCount(count) {
        this.radialSymmetryCount = Math.max(2, Math.min(16, parseInt(count) || 2));
        this.setUnsavedChanges(true);
        this.notify();
    }

    setRadialSymmetryOffset(offset) {
        this.radialSymmetryOffset = parseFloat(offset) || 0;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setParticleDensity(density) {
        this.particleDensity = normalizeParticleDensity(density);
        this.setUnsavedChanges(true);
        this.notify();
    }

    setCharacterMode(mode) {
        this.characterMode = mode;
        this.notify();
    }

    toggleGroupAnimated(groupId) {
        const group = this.drawingGroups.find(g => g.id === groupId);
        if (!group) return;
        group.isAnimated = !group.isAnimated;
        this.setUnsavedChanges(true);
        this.notify();
    }

    setUnsavedChanges(status) {
        this.hasUnsavedChanges = status;
        this.notify();
    }

    addPoint(pointData) {
        this.captureHistory();
        this.particlePoints.push(pointData);
        this.setUnsavedChanges(true);
        this.notify();
    }

    undoLastPoint() {
        if (this.drawingGroups.length > 0) {
            const lastGroup = this.drawingGroups.pop();
            if (lastGroup) {
                this.setUnsavedChanges(true);
            }
            this.notify();
            return lastGroup;
        } else if (this.particlePoints.length > 0) {
            const lastPoint = this.particlePoints.pop();
            if (lastPoint) {
                this.setUnsavedChanges(true);
            }
            this.notify();
            return lastPoint;
        }
        this.notify();
        return null;
    }

    removePoints(pointsToRemove) {
        const idsToRemove = new Set(pointsToRemove.map(p => p.id));
        this.particlePoints = this.particlePoints.filter(p => !idsToRemove.has(p.id));
        if (pointsToRemove.length > 0) {
            this.setUnsavedChanges(true);
        }
        this.notify();
    }

    clearPoints() {
        const hadPoints = this.particlePoints.length > 0;
        const hadGroups = this.drawingGroups.length > 0;
        if (hadPoints || hadGroups) this.captureHistory();
        this.particlePoints = [];
        this.drawingGroups = [];
        this.selectedGroup = null;
        if (hadPoints || hadGroups) {
            this.setUnsavedChanges(true);
        }
        this.notify();
    }

    addGroup(groupData) {
        this.captureHistory();
        this.drawingGroups.forEach(layer => { layer.solo = false; });
        this.drawingGroups.push(normalizeLayer({ ...groupData, solo: false }, this.drawingGroups.length));
        this.setUnsavedChanges(true);
        this.notify();
    }

    addLayerGroup({ name = '新群組', parentId = null } = {}) {
        this.captureHistory();
        this.drawingGroups.forEach(layer => { layer.solo = false; });
        const group = normalizeLayer({
            id: crypto.randomUUID(),
            type: 'layer-group',
            layerKind: 'group',
            name,
            parentId,
            particles: []
        }, this.drawingGroups.length);
        this.drawingGroups.push(group);
        this.setUnsavedChanges(true);
        this.notify();
        return group;
    }

    updateLayerState(layerId, updates) {
        const layer = this.drawingGroups.find(group => group.id === layerId);
        if (!layer) return false;
        this.captureHistory();
        const allowed = ['name', 'parentId', 'visible', 'exportEnabled', 'locked', 'expanded', 'order', 'layerColor'];
        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(updates, key)) layer[key] = updates[key];
        }
        this.drawingGroups = normalizeLayers(this.drawingGroups);
        this.setUnsavedChanges(true);
        this.notify();
        return true;
    }

    toggleLayerSolo(layerId) {
        const target = this.drawingGroups.find(layer => layer.id === layerId);
        if (!target) return false;
        const enable = !target.solo;
        this.drawingGroups.forEach(layer => { layer.solo = enable && layer.id === layerId; });
        this.notify();
        return true;
    }

    moveLayer(layerId, targetId, placement = 'before') {
        const layer = this.drawingGroups.find(item => item.id === layerId);
        const target = this.drawingGroups.find(item => item.id === targetId);
        if (!layer || !target || layerId === targetId) return false;
        if (new Set(getLayerDescendantIds(layerId, this.drawingGroups)).has(targetId)) return false;
        this.captureHistory();
        const targetIsGroup = target.layerKind === 'group' || target.type === 'layer-group';
        layer.parentId = placement === 'inside' && targetIsGroup ? target.id : target.parentId;
        const siblings = this.drawingGroups
            .filter(item => item.id !== layerId && item.parentId === layer.parentId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const targetIndex = siblings.findIndex(item => item.id === targetId);
        siblings.splice(targetIndex < 0 ? siblings.length : targetIndex, 0, layer);
        siblings.forEach((item, index) => { item.order = index; });
        this.drawingGroups = normalizeLayers(this.drawingGroups);
        this.setUnsavedChanges(true);
        this.notify();
        return true;
    }

    removeGroup(groupId) {
        const index = this.drawingGroups.findIndex(g => g.id === groupId);
        if (index !== -1) {
            this.captureHistory();
            const idsToRemove = new Set([groupId, ...getLayerDescendantIds(groupId, this.drawingGroups)]);
            this.drawingGroups = this.drawingGroups.filter(group => !idsToRemove.has(group.id));
            if (this.selectedGroup && this.selectedGroup.id === groupId) {
                this.selectedGroup = null;
            }
            this.setUnsavedChanges(true);
            this.notify();
        }
    }

    updateGroup(groupId, updates) {
        const group = this.drawingGroups.find(g => g.id === groupId);
        if (group) {
            this.captureHistory();
            Object.assign(group, updates);
            this.setUnsavedChanges(true);
            this.notify();
        }
    }

    loadProject(projectData) {
        this._restoringHistory = true;
        projectData = migrateProject(projectData);
        this.clearPoints();
        this.currentProjectName = projectData.name || '未命名專案';
        this.skillId = 'GemoteParticle';
        this.lastPointPosition = null;
        this.selectedGroup = null;

        const needsLegacyFrameRetime = !!projectData.settings?.timelineFrameCount && Number(projectData.settings.timelineRetimingVersion || 0) < 2;
        if (projectData.settings) {
            this.drawingHeight = projectData.settings.drawingHeight || 0;
            this.planeRotation = projectData.settings.planeRotation || { x: 0, y: 0, z: 0 };
            this.planeOffset = projectData.settings.planeOffset || { x: 0, z: 0 };
            this.cameraSensitivity = projectData.settings.cameraSensitivity || 1.0;
            this.particleType = projectData.settings.particleType || 'redstone';
            this.particleColor = projectData.settings.particleColor || '#ff0000';
            const loadedSkillId = String(projectData.settings.skillId || '').trim();
            const legacyDefaultIds = new Set(['MyDrawingSkill', 'MyDrawingEmote', 'MyGemoteEmote']);
            this.skillId = !loadedSkillId || legacyDefaultIds.has(loadedSkillId) ? 'GemoteParticle' : loadedSkillId;
            this.gridSize = projectData.settings.gridSize || 10;
            this.animationEnabled = !!projectData.settings.animationEnabled;
            const aTick = parseFloat(projectData.settings.animationTickInterval);
            this.animationTickInterval = Number.isFinite(aTick) && aTick > 0 ? aTick : 1;
            this.loop = projectData.settings.loop || 0;
            this.head = !!projectData.settings.head;
            this.horizontalMirrorEnabled = !!projectData.settings.horizontalMirrorEnabled;
            this.horizontalMirrorZEnabled = !!projectData.settings.horizontalMirrorZEnabled;
            this.verticalMirrorEnabled = !!projectData.settings.verticalMirrorEnabled;
            this.mirrorPivot = projectData.settings.mirrorPivot || { x: 0, y: 0, z: 0 };
            this.pivotFollowsPlane = projectData.settings.pivotFollowsPlane !== undefined ? !!projectData.settings.pivotFollowsPlane : true;
            this.radialSymmetryEnabled = !!projectData.settings.radialSymmetryEnabled;
            this.radialSymmetryAxis = projectData.settings.radialSymmetryAxis || 'Y';
            this.radialSymmetryMode = projectData.settings.radialSymmetryMode || 'equal';
            this.radialSymmetryCount = projectData.settings.radialSymmetryCount || 4;
            this.radialSymmetryOffset = projectData.settings.radialSymmetryOffset || 0;
            this.particleDensity = normalizeParticleDensity(projectData.settings.particleDensity);
            this.characterMode = projectData.settings.characterMode || 'opaque';
            const legacyDuration = Math.max(1, Number(projectData.settings.timelineDuration) || 80);
            this.timelineFrameInterval = Math.max(1, Math.round(Number(projectData.settings.timelineFrameInterval) || 1));
            this.timelineFrameCount = Math.max(2, Math.round(Number(projectData.settings.timelineFrameCount) || Math.round(legacyDuration / this.timelineFrameInterval)));
            this.timelineRetimingVersion = 2;
            this.timelineDuration = this.timelineFrameInterval * this.timelineFrameCount;
        } else {
            this.animationEnabled = false;
            this.animationTickInterval = 1;
            this.loop = 0;
            this.head = false;
            this.horizontalMirrorEnabled = false;
            this.horizontalMirrorZEnabled = false;
            this.verticalMirrorEnabled = false;
            this.mirrorPivot = { x: 0, y: 0, z: 0 };
            this.pivotFollowsPlane = true;
            this.radialSymmetryEnabled = false;
            this.radialSymmetryAxis = 'Y';
            this.radialSymmetryMode = 'equal';
            this.radialSymmetryCount = 4;
            this.radialSymmetryOffset = 0;
            this.particleDensity = 1.0;
            this.characterMode = 'opaque';
            this.timelineFrameInterval = 1;
            this.timelineFrameCount = 80;
            this.timelineRetimingVersion = 2;
            this.timelineDuration = 80;
        }
        this.timelineTick = 0;
        this.timelinePlaying = false;

        if (projectData.particles) {
            this.particlePoints = projectData.particles.map(p => ({
                ...p,
                id: p.id || crypto.randomUUID(),
                sphereMesh: null,
                lineSegment: null
            }));
        }

        if (projectData.groups) {
            const legacyDefault = !!(projectData.settings && projectData.settings.animationEnabled);
            this.drawingGroups = normalizeLayers(projectData.groups.map(g => {
                const gt = parseFloat(g.tickInterval);
                const out = {
                    ...g,
                    id: g.id || crypto.randomUUID(),
                    solo: false,
                    isAnimated: g.isAnimated === undefined ? legacyDefault : !!g.isAnimated
                };
                if (Number.isFinite(gt) && gt > 0) {
                    out.tickInterval = gt;
                } else {
                    delete out.tickInterval;
                }
                return out;
            }));
        }

        if (needsLegacyFrameRetime) {
            const contentDuration = this.getTimelineContentDuration();
            if (contentDuration > 0 && contentDuration !== this.timelineDuration) this.retimeTimeline(contentDuration, this.timelineDuration);
        }

        this.setUnsavedChanges(false);
        this.undoStack = [];
        this.redoStack = [];
        this._restoringHistory = false;
        this.notify();
    }
}

export default StateManager;
