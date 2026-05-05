import * as THREE from 'three';
import DrawingGroup from './DrawingGroup.js';
import { reflectParticles } from './ReflectionUtil.js';

class ShapeTool {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.startPoint = null;
        this.previewMesh = null;
    }

    startShape(intersectPoint) {
        this.startPoint = intersectPoint.clone();
    }

    isActive() {
        return this.startPoint !== null;
    }

    updatePreview(endPoint, shapeType) {
        this.clearPreview();
        if (!this.startPoint) return;

        const { plane, normal, worldToPlane, planeToWorld } = this.sceneManager.getDrawingPlaneInfo();
        const startLocal = worldToPlane(this.startPoint);
        const endLocal = worldToPlane(endPoint);

        const w = Math.abs(endLocal.x - startLocal.x);
        const d = Math.abs(endLocal.z - startLocal.z); 

        let geometry = null;
        let localMeshPos = new THREE.Vector3((startLocal.x + endLocal.x) / 2, 0, (startLocal.z + endLocal.z) / 2);

        if (shapeType === 'rectangle') {
            if (w < 0.05 || d < 0.05) return;
            geometry = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
        } else if (shapeType === 'circle') {
            const radius = Math.sqrt(Math.pow(endLocal.x - startLocal.x, 2) + Math.pow(endLocal.z - startLocal.z, 2));
            if (radius < 0.05) return;
            geometry = new THREE.CircleGeometry(radius, 64).rotateX(-Math.PI / 2);
            localMeshPos.copy(startLocal);
        }

        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00, transparent: true, opacity: 0.4,
            side: THREE.DoubleSide, depthTest: false
        });

        this.previewMesh = new THREE.Mesh(geometry, material);
        this.previewMesh.position.copy(planeToWorld(localMeshPos).add(normal.clone().multiplyScalar(0.02)));
        this.previewMesh.quaternion.copy(plane.quaternion);
        this.sceneManager.scene.add(this.previewMesh);

        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: false })
        );
        edges.position.copy(this.previewMesh.position);
        edges.quaternion.copy(this.previewMesh.quaternion);
        this.sceneManager.scene.add(edges);
        this.previewMesh.userData.edges = edges;
    }

    createShape(endPoint, shapeType, state) {
        if (!this.startPoint) return null;
        const { worldToPlane, planeToWorld } = this.sceneManager.getDrawingPlaneInfo();
        const startLocal = worldToPlane(this.startPoint);
        const endLocal = worldToPlane(endPoint);
        const particles = [];
        // 校正：原本 0.6 仍導致密度是預覽的 3 倍。調整為 1.8 以達成 1:1 對應。
        const spacing = 1.8 / (state.particleDensity || 1.0);

        const addLocalPart = (lx, lz) => {
            const wp = planeToWorld(new THREE.Vector3(lx, 0, lz));
            particles.push({
                id: crypto.randomUUID(),
                x: wp.x, y: wp.y, z: wp.z,
                particleType: state.particleType, color: state.particleColor
            });
        };

        if (shapeType === 'rectangle') {
            const minX = Math.min(startLocal.x, endLocal.x), maxX = Math.max(startLocal.x, endLocal.x);
            const minZ = Math.min(startLocal.z, endLocal.z), maxZ = Math.max(startLocal.z, endLocal.z);
            const width = maxX - minX;
            const depth = maxZ - minZ;
            const stepsX = Math.max(1, Math.ceil(width / spacing));
            const stepsZ = Math.max(1, Math.ceil(depth / spacing));
            
            for (let i = 0; i <= stepsX; i++) {
                for (let j = 0; j <= stepsZ; j++) {
                    const x = minX + (i / stepsX) * width;
                    const z = minZ + (j / stepsZ) * depth;
                    if (state.shapeFillMode === 'filled' || i === 0 || i === stepsX || j === 0 || j === stepsZ) {
                        addLocalPart(x, z);
                    }
                }
            }
        } else if (shapeType === 'circle') {
            const radius = Math.sqrt(Math.pow(endLocal.x - startLocal.x, 2) + Math.pow(endLocal.z - startLocal.z, 2));
            if (state.shapeFillMode === 'filled') {
                const rSteps = Math.max(1, Math.ceil(radius / spacing));
                for (let r = 0; r <= rSteps; r++) {
                    const currR = (radius * r) / rSteps;
                    const circumference = 2 * Math.PI * currR;
                    const aSteps = currR === 0 ? 1 : Math.max(8, Math.ceil(circumference / spacing));
                    for (let i = 0; i < aSteps; i++) {
                        const a = (i / aSteps) * 2 * Math.PI;
                        addLocalPart(startLocal.x + Math.cos(a) * currR, startLocal.z + Math.sin(a) * currR);
                    }
                }
            } else {
                const circumference = 2 * Math.PI * radius;
                const aSteps = Math.max(12, Math.ceil(circumference / spacing));
                for (let i = 0; i < aSteps; i++) {
                    const a = (i / aSteps) * 2 * Math.PI;
                    addLocalPart(startLocal.x + Math.cos(a) * radius, startLocal.z + Math.sin(a) * radius);
                }
            }
        }

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

        this.startPoint = null;
        if (particles.length === 0) return null;
        return new DrawingGroup({
            type: shapeType, particles: reflectParticles(particles, mirrorSettings),
            particleType: state.particleType, color: state.particleColor,
            isAnimated: !!state.animationEnabled
        });
    }

    clearPreview() {
        if (!this.previewMesh) return;
        if (this.previewMesh.userData.edges) this.sceneManager.scene.remove(this.previewMesh.userData.edges);
        this.sceneManager.scene.remove(this.previewMesh);
        this.previewMesh = null;
    }
}

export default ShapeTool;
