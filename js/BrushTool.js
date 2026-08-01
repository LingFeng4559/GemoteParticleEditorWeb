import * as THREE from 'three';
import DrawingGroup from './DrawingGroup.js';
import { reflectSingleParticle } from './ReflectionUtil.js';
import { getSegmentSampleDistances } from './DensityModel.js';

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
        
        // 筆刷間距與形狀工具對齊，基準設為 0.5。
        const distance = intersectPoint.distanceTo(lastPos);
        const sampleDistances = getSegmentSampleDistances(distance, state.particleDensity);
        if (!sampleDistances.length) return null;

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

        let lastBasePoint = null;
        for (const sampleDistance of sampleDistances) {
            const ratio = Math.min(1, sampleDistance / distance);
            const sample = lastPos.clone().lerp(intersectPoint, ratio);
            lastBasePoint = {
                id: crypto.randomUUID(), x: sample.x, y: sample.y, z: sample.z,
                particleType: state.particleType, color: state.particleColor
            };
            const allPoints = reflectSingleParticle(lastBasePoint, mirrorSettings);
            for (const p of allPoints) {
                this.currentGroup.addParticle(p);
                const previewMesh = this.sceneManager.addPoint({
                    point: new THREE.Vector3(p.x, p.y, p.z), color: p.color, opacity: 0.5
                });
                this.previewMeshes.push(previewMesh);
            }
        }
        return lastBasePoint;
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
