import * as THREE from 'three';
import DrawingGroup from './DrawingGroup.js';
import { reflectSingleParticle } from './ReflectionUtil.js';

class BrushTool {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.currentGroup = null;
        this.previewMeshes = [];
        this.MIN_DISTANCE = 0.2;
    }

    startStroke(intersectPoint, state) {
        const basePoint = {
            id: crypto.randomUUID(),
            x: intersectPoint.x, y: intersectPoint.y, z: intersectPoint.z,
            particleType: state.particleType, color: state.particleColor
        };

        const mirrorSettings = {
            horizontalX: state.horizontalMirrorEnabled,
            horizontalZ: state.horizontalMirrorZEnabled,
            vertical: state.verticalMirrorEnabled,
            mirrorPivot: state.mirrorPivot,
            radialSymmetryEnabled: state.radialSymmetryEnabled,
            radialSymmetryAxis: state.radialSymmetryAxis,
            radialSymmetryMode: state.radialSymmetryMode,
            radialSymmetryCount: state.radialSymmetryCount,
            radialSymmetryOffset: state.radialSymmetryOffset
        };

        const allPoints = reflectSingleParticle(basePoint, mirrorSettings);

        this.currentGroup = new DrawingGroup({
            type: 'brush',
            particles: allPoints,
            particleType: state.particleType,
            color: state.particleColor,
            isAnimated: !!state.animationEnabled
        });

        for (const p of allPoints) {
            const previewMesh = this.sceneManager.addPoint({
                point: new THREE.Vector3(p.x, p.y, p.z),
                color: p.color,
                opacity: 0.5
            });
            this.previewMeshes.push(previewMesh);
        }

        return basePoint;
    }

    continueStroke(intersectPoint, state, lastPointPosition) {
        if (!this.currentGroup || !lastPointPosition) return null;

        const lastPos = new THREE.Vector3(lastPointPosition.x, lastPointPosition.y, lastPointPosition.z);
        
        // 筆刷間距也應受密度影響。基準設為 0.6 以配合 3x 修正。
        const minDistance = 0.6 / (state.particleDensity || 1.0);
        if (intersectPoint.distanceTo(lastPos) <= minDistance) return null;

        const basePoint = {
            id: crypto.randomUUID(),
            x: intersectPoint.x, y: intersectPoint.y, z: intersectPoint.z,
            particleType: state.particleType, color: state.particleColor
        };

        const mirrorSettings = {
            horizontalX: state.horizontalMirrorEnabled,
            horizontalZ: state.horizontalMirrorZEnabled,
            vertical: state.verticalMirrorEnabled,
            mirrorPivot: state.mirrorPivot,
            radialSymmetryEnabled: state.radialSymmetryEnabled,
            radialSymmetryAxis: state.radialSymmetryAxis,
            radialSymmetryMode: state.radialSymmetryMode,
            radialSymmetryCount: state.radialSymmetryCount,
            radialSymmetryOffset: state.radialSymmetryOffset
        };

        const allPoints = reflectSingleParticle(basePoint, mirrorSettings);

        for (const p of allPoints) {
            this.currentGroup.addParticle(p);
            const previewMesh = this.sceneManager.addPoint({
                point: new THREE.Vector3(p.x, p.y, p.z),
                color: p.color,
                opacity: 0.5
            });
            this.previewMeshes.push(previewMesh);
        }

        return basePoint;
    }

    finishStroke() {
        // 移除預覽 meshes
        this.previewMeshes.forEach(mesh => {
            this.sceneManager.removeObject(mesh);
        });
        this.previewMeshes = [];

        const group = this.currentGroup;
        this.currentGroup = null;
        return group && group.particles.length > 0 ? group : null;
    }

    cancelStroke() {
        this.previewMeshes.forEach(mesh => {
            this.sceneManager.removeObject(mesh);
        });
        this.previewMeshes = [];
        this.currentGroup = null;
    }

    cleanup() {
        this.cancelStroke();
    }
}

export default BrushTool;
